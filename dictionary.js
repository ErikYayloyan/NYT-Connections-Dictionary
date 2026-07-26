const FREE_DICTIONARY_ENDPOINT = "https://api.dictionaryapi.dev/api/v2/entries/en/";

export function cleanLookupTerm(value) {
  return String(value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

export function normalizeFreeDictionaryResponse(payload, requestedWord) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const definitions = [];
  const seen = new Set();

  for (const entry of payload) {
    for (const meaning of entry.meanings ?? []) {
      for (const item of meaning.definitions ?? []) {
        const definition = String(item.definition ?? "").trim();
        if (!definition) continue;

        const key = `${meaning.partOfSpeech ?? ""}:${definition}`;
        if (seen.has(key)) continue;
        seen.add(key);

        definitions.push({
          partOfSpeech: meaning.partOfSpeech ?? "",
          definition,
          example: String(item.example ?? "").trim()
        });
      }
    }
  }

  if (definitions.length === 0) return null;

  const firstEntry = payload[0];
  const phonetic = firstEntry.phonetic
    || firstEntry.phonetics?.find((item) => item.text)?.text
    || "";
  const audio = firstEntry.phonetics?.find((item) => item.audio)?.audio || "";
  const sourceUrl = firstEntry.sourceUrls?.[0]
    || `https://en.wiktionary.org/wiki/${encodeURIComponent(requestedWord)}`;

  return {
    word: firstEntry.word || requestedWord,
    phonetic,
    audio: audio.startsWith("//") ? `https:${audio}` : audio,
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
