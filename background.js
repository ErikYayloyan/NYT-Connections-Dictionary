import { cleanLookupTerm, fetchFreeDictionary } from "./dictionary.js";

const CACHE_PREFIX = "definition:";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function getCached(word) {
  const key = CACHE_PREFIX + cleanLookupTerm(word);
  const stored = await chrome.storage.local.get(key);
  const item = stored[key];

  if (!item || Date.now() - item.savedAt > CACHE_TTL_MS) return null;
  return item.result;
}

async function cacheResult(word, result) {
  const key = CACHE_PREFIX + cleanLookupTerm(word);
  await chrome.storage.local.set({
    [key]: { result, savedAt: Date.now() }
  });
}

async function lookup(word) {
  const settings = await chrome.storage.sync.get({ enabled: true });
  if (!settings.enabled) {
    throw new Error("Connections Dictionary is turned off.");
  }

  const cached = await getCached(word);
  if (cached) return cached;

  const result = await fetchFreeDictionary(word);
  if (result) await cacheResult(word, result);
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "LOOK_UP_WORD") return false;

  lookup(message.word)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "The definition could not be loaded."
    }));

  return true;
});
