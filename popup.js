const enabled = document.getElementById("enabled");
const hoverLookup = document.getElementById("hoverLookup");
const saved = document.getElementById("saved");

function flash(message) {
  saved.textContent = message;
  window.setTimeout(() => { saved.textContent = ""; }, 1500);
}

chrome.storage.sync.get({ enabled: true, hoverLookup: false }).then((settings) => {
  enabled.checked = settings.enabled;
  hoverLookup.checked = settings.hoverLookup;
  hoverLookup.disabled = !settings.enabled;
});

enabled.addEventListener("change", async () => {
  const next = { enabled: enabled.checked };
  if (!enabled.checked) {
    next.hoverLookup = false;
    hoverLookup.checked = false;
  }
  hoverLookup.disabled = !enabled.checked;
  await chrome.storage.sync.set(next);
  flash(enabled.checked ? "Definitions are on." : "Definitions are off.");
});

hoverLookup.addEventListener("change", async () => {
  await chrome.storage.sync.set({ hoverLookup: hoverLookup.checked });
  flash(hoverLookup.checked ? "Hover lookup is on." : "Hover lookup is off.");
});
