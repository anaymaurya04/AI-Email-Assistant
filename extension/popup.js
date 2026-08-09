const DEFAULT_URL = "http://localhost:8080";

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(["apiKey", "backendUrl", "tone"], (data) => {
    document.getElementById("apiKey").value = data.apiKey || "";
    document.getElementById("backendUrl").value = data.backendUrl || DEFAULT_URL;
    document.getElementById("tone").value = data.tone || "";
  });
});

document.getElementById("save").addEventListener("click", () => {
  chrome.storage.sync.set({
    apiKey: document.getElementById("apiKey").value.trim(),
    backendUrl: document.getElementById("backendUrl").value.trim() || DEFAULT_URL,
    tone: document.getElementById("tone").value,
  }, () => {
    document.getElementById("status").textContent = "Saved ✓";
    setTimeout(() => (document.getElementById("status").textContent = ""), 1500);
  });
});