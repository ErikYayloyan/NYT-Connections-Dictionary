(() => {
  const HOST_ID = "connections-dictionary-root";
  const REJECTED_BUTTONS = new Set([
    "submit", "shuffle", "deselect all", "next", "play", "share your results",
    "continue", "back", "close", "settings", "subscribe", "log in"
  ]);

  const HOLD_KEYS = new Set(["Alt", "Control", "Shift", "Meta", "None"]);

  let requestNumber = 0;
  let currentAnchor = null;
  let isEnabled = true;
  let hoverLookup = false;
  let hoverHoldKey = "Alt";
  let hoverTimer = null;
  let hoverWord = null;
  let lastHoverCard = null;

  chrome.storage.sync.get({
    enabled: true,
    hoverLookup: false,
    hoverHoldKey: "Alt"
  }).then((settings) => {
    isEnabled = settings.enabled;
    hoverLookup = settings.hoverLookup === true;
    hoverHoldKey = HOLD_KEYS.has(settings.hoverHoldKey) ? settings.hoverHoldKey : "Alt";
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.enabled) {
      isEnabled = changes.enabled.newValue !== false;
      if (!isEnabled) {
        clearHoverTimer();
        lastHoverCard = null;
        closePopup();
      }
    }
    if (changes.hoverLookup) {
      hoverLookup = changes.hoverLookup.newValue === true;
      if (!hoverLookup) {
        clearHoverTimer();
        lastHoverCard = null;
      }
    }
    if (changes.hoverHoldKey) {
      const next = changes.hoverHoldKey.newValue;
      hoverHoldKey = HOLD_KEYS.has(next) ? next : "Alt";
      clearHoverTimer();
    }
  });

  function clearHoverTimer() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    hoverWord = null;
  }

  function isHoldKeyDown(event) {
    if (hoverHoldKey === "None") return true;
    if (hoverHoldKey === "Alt") return event.altKey;
    if (hoverHoldKey === "Control") return event.ctrlKey;
    if (hoverHoldKey === "Shift") return event.shiftKey;
    if (hoverHoldKey === "Meta") return event.metaKey;
    return false;
  }

  function isHoldKeyEvent(event) {
    if (hoverHoldKey === "None") return false;
    return event.key === hoverHoldKey
      || (hoverHoldKey === "Control" && (event.key === "Control" || event.key === "Ctrl"))
      || (hoverHoldKey === "Meta" && (event.key === "Meta" || event.key === "OS"));
  }

  function scheduleHoverLookup(card) {
    if (!card) return;
    if (hoverWord === card.word && currentAnchor === card.element) return;

    clearHoverTimer();
    hoverWord = card.word;
    hoverTimer = window.setTimeout(() => {
      hoverTimer = null;
      lookUp(card.word, card.element);
    }, 350);
  }

  function readCardText(element) {
    const text = String(element.innerText || element.textContent || "")
      .trim()
      .replace(/\s+/g, " ");

    // NYT sometimes renders the same card label twice for responsive or
    // assistive layouts (for example, "DISCMANDISCMAN").
    if (text.length % 2 === 0) {
      const midpoint = text.length / 2;
      if (text.slice(0, midpoint) === text.slice(midpoint)) {
        return text.slice(0, midpoint);
      }
    }

    const words = text.split(" ");
    if (words.length % 2 === 0) {
      const midpoint = words.length / 2;
      const firstHalf = words.slice(0, midpoint).join(" ");
      const secondHalf = words.slice(midpoint).join(" ");
      if (firstHalf === secondHalf) return firstHalf;
    }

    return text;
  }

  function findWordCard(target) {
    if (!(target instanceof Element)) return null;

    const label = target.closest('[data-testid="card-label"]');
    if (label) {
      const word = readCardText(label);
      if (isPlausibleWord(word)) {
        return { element: label.closest("button") || label, word };
      }
    }

    const button = target.closest("button");
    if (!button || !button.closest("main")) return null;

    const word = readCardText(button);
    if (!isPlausibleWord(word)) return null;
    if (REJECTED_BUTTONS.has(word.toLocaleLowerCase("en-US"))) return null;

    const looksLikeCard = Boolean(
      button.closest('[class*="Board"], [class*="board"], [data-testid*="board"]')
      || /^[A-Z0-9][A-Z0-9 '&.\-/]{0,39}$/.test(word)
    );

    return looksLikeCard ? { element: button, word } : null;
  }

  function isPlausibleWord(word) {
    return Boolean(word && word.length <= 40 && word.split(/\s+/).length <= 5);
  }

  function getUi() {
    let host = document.getElementById(HOST_ID);
    if (host) return host.shadowRoot;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "fixed";
    host.style.zIndex = "2147483647";
    document.documentElement.append(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .card {
          box-sizing: border-box; position: fixed; width: min(360px, calc(100vw - 24px));
          max-height: min(480px, calc(100vh - 24px)); overflow: auto; display: none;
          color: #181818; background: #fffdf8; border: 1px solid rgba(0,0,0,.14);
          border-radius: 16px; box-shadow: 0 18px 55px rgba(0,0,0,.24);
          padding: 18px; font: 15px/1.42 Arial, Helvetica, sans-serif;
        }
        .card.open { display: block; animation: enter 120ms ease-out; }
        @keyframes enter { from { opacity: 0; transform: translateY(4px) scale(.985); } }
        .top { display: flex; align-items: flex-start; gap: 10px; }
        .heading { flex: 1; min-width: 0; }
        h2 { margin: 0; font: 700 25px/1.12 Georgia, serif; overflow-wrap: anywhere; }
        .phonetic { margin: 4px 0 0; color: #68645d; font-size: 13px; }
        .close, .audio { appearance: none; border: 0; cursor: pointer; }
        .close { width: 30px; height: 30px; border-radius: 50%; background: #efede7; color: #333; font-size: 20px; line-height: 28px; }
        .audio { margin-top: 9px; padding: 6px 10px; border-radius: 999px; background: #efede7; color: #242424; font-weight: 700; }
        ol { margin: 15px 0 0; padding: 0 0 0 22px; }
        li { padding: 0 0 11px 4px; }
        li + li { border-top: 1px solid #ebe8e1; padding-top: 11px; }
        .part { color: #716d65; font-size: 12px; font-style: italic; }
        .example { display: block; margin-top: 4px; color: #5e5a53; font-size: 13px; }
        .status { margin: 15px 0 4px; color: #56524c; }
        .google {
          display: inline-block; margin-top: 13px; padding: 9px 14px; border-radius: 999px;
          color: #fff; background: #242424; font-size: 13px; font-weight: 700;
          text-decoration: none;
        }
        .google:hover { background: #000; }
        .google:focus-visible { outline: 3px solid #8ab4f8; outline-offset: 2px; }
        .source { display: block; margin-top: 5px; color: #5b5145; font-size: 11px; text-decoration: underline; }
        .hint { margin: 13px 0 0; color: #77716a; font-size: 12px; }
      </style>
      <section class="card" role="dialog" aria-live="polite" aria-label="Word definition">
        <div class="top">
          <div class="heading"><h2></h2><p class="phonetic"></p></div>
          <button class="close" type="button" aria-label="Close">×</button>
        </div>
        <div class="body"></div>
      </section>`;

    shadow.querySelector(".close").addEventListener("click", closePopup);
    return shadow;
  }

  function closePopup() {
    getUi().querySelector(".card").classList.remove("open");
    currentAnchor = null;
  }

  function positionPopup(anchor) {
    const card = getUi().querySelector(".card");
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
    const roomBelow = window.innerHeight - rect.bottom;
    const top = roomBelow >= 260
      ? rect.bottom + 10
      : Math.max(12, rect.top - Math.min(420, card.scrollHeight || 260) - 10);

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function showLoading(word, anchor) {
    const ui = getUi();
    ui.querySelector("h2").textContent = word;
    ui.querySelector(".phonetic").textContent = "";
    const body = ui.querySelector(".body");
    body.replaceChildren();
    const status = document.createElement("p");
    status.className = "status";
    status.textContent = "Looking it up…";
    body.append(status);
    ui.querySelector(".card").classList.add("open");
    positionPopup(anchor);
  }

  function showResult(result, requestedWord, anchor) {
    const ui = getUi();
    const body = ui.querySelector(".body");
    body.replaceChildren();

    if (!result) {
      const message = document.createElement("p");
      message.className = "status";
      message.textContent = `No direct definition found for “${requestedWord}”. It may be a name, phrase, abbreviation, or wordplay.`;
      body.append(message, makeGoogleSearchButton(requestedWord), makeExternalLinks(requestedWord));
      positionPopup(anchor);
      return;
    }

    ui.querySelector("h2").textContent = result.word || requestedWord;
    ui.querySelector(".phonetic").textContent = result.phonetic || "";

    if (result.audio) {
      const audioButton = document.createElement("button");
      audioButton.type = "button";
      audioButton.className = "audio";
      audioButton.textContent = "▶ Pronunciation";
      audioButton.addEventListener("click", () => new Audio(result.audio).play());
      body.append(audioButton);
    }

    const list = document.createElement("ol");
    for (const item of result.definitions) {
      const li = document.createElement("li");
      if (item.partOfSpeech) {
        const part = document.createElement("div");
        part.className = "part";
        part.textContent = item.partOfSpeech;
        li.append(part);
      }
      li.append(document.createTextNode(item.definition));
      if (item.example) {
        const example = document.createElement("span");
        example.className = "example";
        example.textContent = `“${item.example}”`;
        li.append(example);
      }
      list.append(li);
    }
    body.append(list);

    const source = document.createElement("a");
    source.className = "source";
    source.href = result.sourceUrl;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = `Source: ${result.sourceName}`;
    body.append(source, makeExternalLinks(requestedWord));
    positionPopup(anchor);
  }

  function makeGoogleSearchButton(word) {
    const link = document.createElement("a");
    const searchTerm = word.toLocaleLowerCase("en-US");
    link.className = "google";
    link.href = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Google search";
    link.setAttribute("aria-label", `Google search for ${searchTerm}`);
    return link;
  }

  function makeExternalLinks(word) {
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.append("Need another interpretation? ");

    const sources = [
      ["Merriam-Webster", `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`],
      ["Oxford", `https://www.oxfordlearnersdictionaries.com/search/english/?q=${encodeURIComponent(word)}`]
    ];
    sources.forEach(([name, url], index) => {
      if (index) hint.append(" · ");
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = name;
      hint.append(link);
    });
    return hint;
  }

  function showError(message, word, anchor) {
    const body = getUi().querySelector(".body");
    body.replaceChildren();
    const status = document.createElement("p");
    status.className = "status";
    status.textContent = message || "The definition could not be loaded.";
    body.append(status, makeExternalLinks(word));
    positionPopup(anchor);
  }

  async function lookUp(word, anchor) {
    const thisRequest = ++requestNumber;
    currentAnchor = anchor;
    showLoading(word, anchor);

    try {
      const response = await chrome.runtime.sendMessage({ type: "LOOK_UP_WORD", word });
      if (thisRequest !== requestNumber || currentAnchor !== anchor) return;
      if (!response?.ok) throw new Error(response?.error);
      showResult(response.result, word, anchor);
    } catch (error) {
      if (thisRequest !== requestNumber || currentAnchor !== anchor) return;
      showError(error instanceof Error ? error.message : "The definition could not be loaded.", word, anchor);
    }
  }

  document.addEventListener("click", (event) => {
    if (!currentAnchor) return;
    const ui = getUi();
    if (event.composedPath().includes(ui.host)) return;
    closePopup();
  });

  document.addEventListener("pointerover", (event) => {
    if (!isEnabled || !hoverLookup) return;
    const ui = getUi();
    if (event.composedPath().includes(ui.host)) {
      clearHoverTimer();
      return;
    }

    const card = findWordCard(event.target);
    if (!card) {
      lastHoverCard = null;
      clearHoverTimer();
      return;
    }

    lastHoverCard = card;
    if (!isHoldKeyDown(event)) {
      clearHoverTimer();
      return;
    }
    scheduleHoverLookup(card);
  });

  document.addEventListener("pointerout", (event) => {
    if (!isEnabled || !hoverLookup) return;
    const next = event.relatedTarget;
    if (next instanceof Element && findWordCard(next)) return;
    const ui = getUi();
    if (next instanceof Node && (ui.host === next || ui.host.contains(next) || ui.contains(next))) return;
    lastHoverCard = null;
    clearHoverTimer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!currentAnchor) return;
      event.preventDefault();
      clearHoverTimer();
      closePopup();
      return;
    }

    if (!isEnabled || !hoverLookup || event.repeat) return;
    if (!isHoldKeyEvent(event) || !lastHoverCard) return;
    scheduleHoverLookup(lastHoverCard);
  });

  document.addEventListener("keyup", (event) => {
    if (!isEnabled || !hoverLookup) return;
    if (!isHoldKeyEvent(event)) return;
    clearHoverTimer();
  });

  window.addEventListener("blur", () => clearHoverTimer());
  window.addEventListener("resize", () => currentAnchor && positionPopup(currentAnchor));
  window.addEventListener("scroll", () => currentAnchor && positionPopup(currentAnchor), true);
})();
