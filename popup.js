const enabled = document.getElementById("enabled");
const hoverLookup = document.getElementById("hoverLookup");
const hoverHoldKey = document.getElementById("hoverHoldKey");
const saved = document.getElementById("saved");

const HOLD_KEY_LABELS = {
  Alt: "Alt / Option",
  Control: "Control",
  Shift: "Shift",
  Meta: "Command",
  None: "no key"
};

function flash(message) {
  saved.textContent = message;
  window.setTimeout(() => { saved.textContent = ""; }, 1500);
}

function syncHoverControls() {
  const allowHover = enabled.checked;
  hoverLookup.disabled = !allowHover;
  hoverHoldKey.disabled = !allowHover || !hoverLookup.checked;
}

chrome.storage.sync.get({
  enabled: true,
  hoverLookup: false,
  hoverHoldKey: "Alt"
}).then((settings) => {
  enabled.checked = settings.enabled;
  hoverLookup.checked = settings.hoverLookup;
  hoverHoldKey.value = HOLD_KEY_LABELS[settings.hoverHoldKey]
    ? settings.hoverHoldKey
    : "Alt";
  syncHoverControls();
});

enabled.addEventListener("change", async () => {
  const next = { enabled: enabled.checked };
  if (!enabled.checked) {
    next.hoverLookup = false;
    hoverLookup.checked = false;
  }
  syncHoverControls();
  await chrome.storage.sync.set(next);
  flash(enabled.checked ? "Definitions are on." : "Definitions are off.");
});

hoverLookup.addEventListener("change", async () => {
  syncHoverControls();
  await chrome.storage.sync.set({ hoverLookup: hoverLookup.checked });
  flash(hoverLookup.checked ? "Hover lookup is on." : "Hover lookup is off.");
});

hoverHoldKey.addEventListener("change", async () => {
  await chrome.storage.sync.set({ hoverHoldKey: hoverHoldKey.value });
  const label = HOLD_KEY_LABELS[hoverHoldKey.value] || hoverHoldKey.value;
  flash(hoverHoldKey.value === "None"
    ? "Hover only — no hold key."
    : `Hold ${label} while hovering.`);
});
