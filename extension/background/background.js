chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "GENERATE_REPLY") return;

  fetch(message.backendUrl + "/api/email/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gemini-Key": message.apiKey,
    },
    body: JSON.stringify({
      emailContent: message.emailContent,
      tone: message.tone || "",
    }),
  })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Backend error " + res.status);
      return text;
    })
    .then((reply) => sendResponse({ ok: true, reply }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }));

  return true;
});