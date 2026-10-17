const FREE_DICTIONARY_ENDPOINT = "https://freedictionaryapi.com/api/v1/entries/en/";

export function cleanLookupTerm(value) {
  return String(value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

export function normalizeFreeDictionaryResponse(payload, requestedWord) {
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  if (entries.length === 0) {
    return null;
  }

  const definitions = [];
  const seen = new Set();

  for (const entry of entries) {
    const partOfSpeech = entry.partOfSpeech ?? "";
    for (const sense of entry.senses ?? []) {
      const definition = String(sense.definition ?? "").trim();
      if (!definition) continue;

      const key = `${partOfSpeech}:${definition}`;
      if (seen.has(key)) continue;
      seen.add(key);

      definitions.push({
        partOfSpeech,
        definition,
        example: String(sense.examples?.[0] ?? "").trim()
      });
    }
  }

  if (definitions.length === 0) return null;

  const phonetic = entries
    .flatMap((entry) => entry.pronunciations ?? [])
    .find((item) => item.text)?.text
    || "";
  const sourceUrl = payload.source?.url
    || `https://en.wiktionary.org/wiki/${encodeURIComponent(requestedWord)}`;

  return {
    word: payload.word || requestedWord,
    phonetic,
    audio: "",
    definitions: definitions.slice(0, 6),
    sourceName: "Free Dictionary API",
    sourceUrl
  };
}

export async function fetchFreeDictionary(word, fetchImpl = fetch) {
  const cleanWord = cleanLookupTerm(word);
  if (!cleanWord) throw new Error("Choose a word first.");

  const response = await fetchImpl(`${FREE_DICTIONARY_ENDPOINT}${encodeURIComponent(cleanWord)}`);

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`The dictionary returned ${response.status}.`);
  }

  return normalizeFreeDictionaryResponse(await response.json(), cleanWord);
}
