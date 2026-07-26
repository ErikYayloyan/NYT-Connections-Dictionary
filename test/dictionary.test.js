import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanLookupTerm,
  fetchFreeDictionary,
  normalizeFreeDictionaryResponse
} from "../dictionary.js";

test("cleans puzzle card text", () => {
  assert.equal(cleanLookupTerm("  Rock   &  Roll  "), "rock & roll");
  assert.equal(cleanLookupTerm("‘BATS’"), "'bats'");
});

test("normalizes definitions and pronunciation", () => {
  const result = normalizeFreeDictionaryResponse([{
    word: "bat",
    phonetics: [{ text: "/bat/", audio: "//audio.example/bat.mp3" }],
    meanings: [{
      partOfSpeech: "noun",
      definitions: [{ definition: "A club used to hit a ball.", example: "She swung the bat." }]
    }],
    sourceUrls: ["https://example.test/bat"]
  }], "bat");

  assert.equal(result.word, "bat");
  assert.equal(result.audio, "https://audio.example/bat.mp3");
  assert.deepEqual(result.definitions[0], {
    partOfSpeech: "noun",
    definition: "A club used to hit a ball.",
    example: "She swung the bat."
  });
});

test("returns null for a missing word", async () => {
  const result = await fetchFreeDictionary("notaword", async () => ({
    status: 404,
    ok: false
  }));
  assert.equal(result, null);
});
