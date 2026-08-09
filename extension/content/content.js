const BODY_SELECTORS = [
  'div[role="textbox"][g_editable="true"]',
  'div[aria-label="Message Body"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[role="dialog"] div[contenteditable="true"]',
];

const TOOLBAR_SELECTORS = [
  'tr.btC td.gU',
  '.btC .gU',
  'td.gU.aXw',
  '.gU',
];

function findBody(container) {
  for (const sel of BODY_SELECTORS) {
    const el = container.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function findToolbar(container) {
  for (const sel of TOOLBAR_SELECTORS) {
    const el = container.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function findComposeRoot(body) {
  const toolbarSel = TOOLBAR_SELECTORS.join(",");
  let el = body.parentElement;
  while (el && el !== document.body) {
    if (el.querySelector(toolbarSel)) return el;
    el = el.parentElement;
  }
  return null;
}

const seenToolbars = new WeakSet();

function collectToolbarEvidence(tb) {
  if (seenToolbars.has(tb)) return;
  seenToolbars.add(tb);
  let el = tb;
  const chain = [];
  let hasSubject = false;
  let hasQuote = false;
  let hasBody = false;
  for (let i = 0; i < 6 && el; i++) {
    chain.push(
      el.tagName +
        (el.className ? "." + String(el.className).split(" ")[0] : "")
    );
    if (el.querySelector('[name="subjectbox"], input[aria-label*="ubject"]'))
      hasSubject = true;
    if (el.querySelector(".gmail_quote")) hasQuote = true;
    if (el.querySelector(BODY_SELECTORS.join(","))) hasBody = true;
    el = el.parentElement;
  }
  console.log(
    "[Email Assistant] toolbar chain: " +
      chain.join(" < ") +
      " | subject=" + hasSubject + " quote=" + hasQuote + " body=" + hasBody
  );
}

const notYetActionable = new WeakSet();

function noteOnce(target, msg) {
  if (notYetActionable.has(target)) return;
  notYetActionable.add(target);
  console.log("[Email Assistant] " + msg);
}

function isReplyCompose(container) {
  if (container.querySelector(".gmail_quote, .gmail_extra")) return true;
  const subject = container.querySelector('input[name="subjectbox"]');
  if (subject && /^re:|^fwd:/i.test(subject.value.trim())) return true;
  const body = findBody(container);
  const text = body ? body.innerText.trim() : "";
  return text.length >= 5;
}

function getReadingPaneEmail() {
  const main = document.querySelector('[role="main"]');
  if (!main) return "";
  const bodies = Array.from(main.querySelectorAll('.a3s.aiL, [class*="a3s"]'));
  if (!bodies.length) return "";
  const last = bodies[bodies.length - 1];
  const text = (last.innerText || last.textContent || "").trim();
  return text;
}

function getReadingPaneSubject() {
  const main = document.querySelector('[role="main"]');
  if (!main) return "";
  const h2 = main.querySelector("h2");
  return h2 ? h2.innerText.trim() : "";
}

function getQuotedEmail(container) {
  const body = findBody(container);
  if (body) {
    const quote = body.querySelector(".gmail_quote");
    if (quote) return quote.innerText.trim();
    const text = body.innerText.trim();
    if (text) return text;
  }
  const cquote = container.querySelector(".gmail_quote");
  if (cquote) return cquote.innerText.trim();
  const quotes = document.querySelectorAll(".gmail_quote");
  for (const q of quotes) {
    if (q.offsetParent) {
      const t = q.innerText.trim();
      if (t) return t;
    }
  }
  return getReadingPaneEmail();
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  } catch (e) {
    console.log("[Email Assistant] clipboard failed", e);
  }
}

function insertReply(container, text) {
  const body = findBody(container);
  if (!body) return;
  const html = text.replace(/\n/g, "<br>");
  const quote = body.querySelector(".gmail_quote");
  if (quote) {
    const div = document.createElement("div");
    div.innerHTML = html;
    body.insertBefore(div, quote);
  } else {
    body.innerHTML = html;
  }
  body.focus();
}

function showToast(msg) {
  const existing = document.querySelector(".email-assistant-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "email-assistant-toast";
  toast.textContent = msg;
  toast.style.cssText =
    "position:fixed;bottom:20px;right:20px;background:#d32f2f;color:#fff;" +
    "padding:10px 14px;border-radius:6px;z-index:9999;font-family:system-ui";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function handleAutoReply(container) {
  return async () => {
    const { apiKey, backendUrl, tone } = await chrome.storage.sync.get([
      "apiKey", "backendUrl", "tone",
    ]);
    let emailContent = getQuotedEmail(container);
    if (!emailContent) {
      showToast("Waiting for quoted email to load…");
      for (let i = 0; i < 10 && !emailContent; i++) {
        await new Promise((r) => setTimeout(r, 500));
        emailContent = getQuotedEmail(container);
      }
    }
    const subject = container.querySelector('[name="subjectbox"]');
    if (subject && !subject.value.trim()) {
      const s = getReadingPaneSubject();
      if (s) {
        subject.value = /^re:/i.test(s) ? s : "Re: " + s;
        subject.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    console.log(
      "[Email Assistant] extracted " + emailContent.length +
        " chars from " + (getReadingPaneEmail() === emailContent ? "reading pane" : "compose box")
    );
    if (!emailContent) {
      const body = findBody(container);
      const q = container.querySelector(".gmail_quote");
      const subject = container.querySelector('[name="subjectbox"]');
      const debug =
        "container=" + container.tagName + "." + (container.className || "") +
        " | subject='" + (subject ? subject.value : "") + "'" +
        " | body=" + (body
          ? body.tagName + "." + (body.className || "") +
            " aria=" + (body.getAttribute && body.getAttribute("aria-label") || "") +
            " len=" + (body.innerText || "").length
          : "none") +
        " | quoteInBody=" + !!(body && body.querySelector(".gmail_quote")) +
        " | quoteInCtr=" + !!q +
        " | pageQuotes=" + document.querySelectorAll(".gmail_quote").length +
        " | html=" + container.innerHTML.slice(0, 400).replace(/[\r\n]+/g, " ");
      console.log("[Email Assistant] NO TEXT DEBUG " + debug);
      copyToClipboard(debug);
      showToast("No email text found. Debug copied to clipboard — paste it here.");
      return;
    }
    chrome.runtime.sendMessage(
      { type: "GENERATE_REPLY", apiKey, backendUrl, tone, emailContent },
      (res) => {
        if (res && res.ok) insertReply(container, res.reply);
        else showToast(res ? res.error : "No response from extension.");
      }
    );
  };
}

function addButton(container) {
  const toolbar = findToolbar(container);
  if (!toolbar) {
    noteOnce(
      container,
      "compose found but no toolbar (.gU) found. container=" +
        container.tagName + "." + (container.className || "")
    );
    return;
  }
  if (toolbar.querySelector(".email-assistant-btn")) return;
  const btn = document.createElement("button");
  btn.className = "email-assistant-btn";
  btn.textContent = "Auto Reply";
  btn.style.cssText =
    "background:#1a73e8;color:#fff;border:none;border-radius:4px;padding:6px 10px;" +
    "margin:0 6px;cursor:pointer;font-size:13px;font-family:system-ui";
  btn.addEventListener("click", handleAutoReply(container));
  toolbar.appendChild(btn);
  console.log("[Email Assistant] Auto Reply button added to compose window");
}

let lastReport = "";
function scanForComposes() {
  const editors = document.querySelectorAll(BODY_SELECTORS.join(","));
  const toolbars = document.querySelectorAll(TOOLBAR_SELECTORS.join(","));
  const dialogs = document.querySelectorAll('[role="dialog"]');
  const report =
    "editors=" + editors.length + ", dialogs=" + dialogs.length +
    ", toolbars=" + toolbars.length;
  if (report !== lastReport) {
    lastReport = report;
    console.log("[Email Assistant] scan: " + report);
  }
  toolbars.forEach(collectToolbarEvidence);
  editors.forEach((body) => {
    const container = findComposeRoot(body);
    if (!container) {
      noteOnce(body, "compose editor found but no toolbar ancestor found");
      return;
    }
    addButton(container);
  });
}

console.log("[Email Assistant] content script loaded");
scanForComposes();
new MutationObserver(() => scanForComposes()).observe(document.body, {
  childList: true,
  subtree: true,
});
