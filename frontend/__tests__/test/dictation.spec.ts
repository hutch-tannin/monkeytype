import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import {
  consumeKeydown,
  plainWord,
  sentenceAudioUrl,
  setDictationManifest,
  speechLanguage,
  wordAudioUrl,
} from "../../src/ts/test/dictation";
import { setConfigStore } from "../../src/ts/config/store";
import { setCurrentQuote } from "../../src/ts/states/test";
import { QuoteWithTextSplit } from "../../src/ts/types/quotes";

const languages = vi.hoisted(() => ({
  spanish_kalinka: {
    name: "spanish_kalinka",
    bcp47: "es-ES",
    words: ["perro"],
  },
  english: { name: "english", words: ["dog", "no"] },
  russian_kalinka_trilingual: {
    name: "russian_kalinka_trilingual",
    words: ["собака", "dog", "perro"],
  },
}));
vi.mock("../../src/ts/utils/json-data", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  cachedFetchJson: async (url: string) => {
    const name = url.replace("/languages/", "").replace(".json", "");
    const data = languages[name as keyof typeof languages];
    if (data === undefined) throw new Error("404");
    return data;
  },
}));
vi.mock("../../src/ts/utils/local-content", () => ({
  hasKalinkaFile: () => true,
  isLanguageAvailable: () => true,
}));

// invented sample data, not real manifest content
const manifest = {
  words: {
    кошка: { file: "w/aaa.mp3", source: "anki" as const },
    "кто-нибудь": { file: "w/bbb.wav", source: "piper" as const },
  },
  quotes: {
    russian_kalinka: { "7": { file: "s/ccc.mp3", source: "anki" as const } },
  },
};

function quote(id: number): QuoteWithTextSplit {
  return {
    id,
    text: "Где моя кошка?",
    source: "test",
    length: 14,
    group: 0,
    language: "russian_kalinka",
    textSplit: ["Где", "моя", "кошка?"],
  };
}

describe("dictation", () => {
  beforeEach(() => {
    setDictationManifest(manifest);
    setConfigStore("mode", "words");
    setConfigStore("funbox", []);
    setConfigStore("language", "english");
    setCurrentQuote(null);
  });

  afterAll(() => {
    setDictationManifest(null);
  });

  it("normalizes words for lookup", () => {
    expect(plainWord("Кошка,")).toBe("кошка");
    expect(plainWord("«кто-нибудь»")).toBe("кто-нибудь");
    expect(plainWord("¿qué?")).toBe("qué");
    expect(plainWord("123")).toBeUndefined();
  });

  it("finds word audio in the manifest", () => {
    expect(wordAudioUrl("Кошка!")).toBe("/kalinka/audio/w/aaa.mp3");
    expect(wordAudioUrl("кто-нибудь")).toBe("/kalinka/audio/w/bbb.wav");
    expect(wordAudioUrl("собака")).toBeUndefined();
  });

  it("has no audio without a manifest", () => {
    setDictationManifest(null);
    expect(wordAudioUrl("кошка")).toBeUndefined();
  });

  it("finds sentence audio only in quote mode", () => {
    setCurrentQuote(quote(7));
    expect(sentenceAudioUrl()).toBeUndefined();
    setConfigStore("mode", "quote");
    expect(sentenceAudioUrl()).toBe("/kalinka/audio/s/ccc.mp3");
    setCurrentQuote(quote(8));
    expect(sentenceAudioUrl()).toBeUndefined();
  });

  it("picks a speech language per word", async () => {
    expect(await speechLanguage("собака")).toBe("ru-RU");
    setConfigStore("language", "russian_kalinka_trilingual");
    expect(await speechLanguage("perro")).toBe("es-ES");
    expect(await speechLanguage("dog")).toBe("en-US");
    expect(await speechLanguage("mañana")).toBe("es-ES");
  });

  it("follows the polyglot language order", async () => {
    setConfigStore("funbox", ["polyglot"]);
    setConfigStore("customPolyglot", ["english", "spanish_kalinka"]);
    expect(await speechLanguage("perro")).toBe("es-ES");
    expect(await speechLanguage("no")).toBe("en-US");
  });

  it("swallows only ctrl+space", () => {
    const key = (init: KeyboardEventInit): KeyboardEvent =>
      new KeyboardEvent("keydown", init);
    expect(consumeKeydown(key({ code: "Space", ctrlKey: true }))).toBe(true);
    expect(
      consumeKeydown(key({ code: "Space", ctrlKey: true, shiftKey: true })),
    ).toBe(true);
    expect(consumeKeydown(key({ code: "Space" }))).toBe(false);
    expect(consumeKeydown(key({ code: "KeyA", ctrlKey: true }))).toBe(false);
    expect(
      consumeKeydown(key({ code: "Space", ctrlKey: true, altKey: true })),
    ).toBe(false);
  });
});
