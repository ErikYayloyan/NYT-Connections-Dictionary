const enabled = document.getElementById("enabled");
const saved = document.getElementById("saved");

chrome.storage.sync.get({ enabled: true }).then((settings) => {
  enabled.checked = settings.enabled;
});

enabled.addEventListener("change", async () => {
  await chrome.storage.sync.set({ enabled: enabled.checked });
  saved.textContent = enabled.checked ? "Definitions are on." : "Definitions are off.";
  window.setTimeout(() => { saved.textContent = ""; }, 1500);
});
