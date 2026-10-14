import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  getStressMarks,
  setStressSidecar,
  stressPositions,
  stripStress,
  withStressMark,
} from "../../src/ts/test/stress-marks";
import { setConfigStore } from "../../src/ts/config/store";
import { setCurrentQuote } from "../../src/ts/states/test";
import { QuoteWithTextSplit } from "../../src/ts/types/quotes";

const acute = "́";
const grave = "̀";

// invented sample data, not real sidecar content
const sidecar = {
  words: {
    молоко: `молоко${acute}`,
    кошка: `ко${acute}шка`,
    "кто-нибудь": `кто${acute}-нибудь`,
    самолёт: `самолё${acute}т`,
    железнодорожный: `же${grave}лезнодоро${acute}жный`,
    // mismatching entry: must be ignored
    дом: `до${acute}мик`,
  },
  quotes: {
    russian_kalinka: {
      "7": `Где́ моя́ ко́шка? cat gato`,
    },
  },
};

function quote(id: number, text: string): QuoteWithTextSplit {
  return {
    id,
    text,
    source: "test",
    length: text.length,
    group: 0,
    language: "russian_kalinka",
    textSplit: text.split(" "),
  };
}

function render(word: string, wordIndex = 0): string {
  const marks = getStressMarks(word, wordIndex);
  return [...word].map((c, i) => withStressMark(c, i, marks)).join("");
}

describe("stress-marks", () => {
  beforeEach(() => {
    setStressSidecar(sidecar);
    setConfigStore("showStressMarks", true);
    setConfigStore("mode", "words");
    setCurrentQuote(null);
  });

  afterAll(() => {
    setStressSidecar(null);
  });

  it("finds mark positions relative to the plain text", () => {
    expect([...stressPositions(`ко${acute}шка`)]).toEqual([[1, acute]]);
    expect([...stressPositions(`же${grave}лезнодоро${acute}жный`)]).toEqual([
      [1, grave],
      [10, acute],
    ]);
    expect(stressPositions("кошка").size).toBe(0);
  });

  it("strips both marks", () => {
    expect(stripStress(`же${grave}лезнодоро${acute}жный`)).toBe(
      "железнодорожный",
    );
  });

  it("marks words from the word list", () => {
    expect(render("кошка")).toBe(`ко${acute}шка`);
    expect(render("молоко")).toBe(`молоко${acute}`);
    expect(render("самолёт")).toBe(`самолё${acute}т`);
    expect(render("кто-нибудь")).toBe(`кто${acute}-нибудь`);
  });

  it("keeps capitals and punctuation around the word", () => {
    expect(render("Кошка,")).toBe(`Ко${acute}шка,`);
    expect(render("«кошка»")).toBe(`«ко${acute}шка»`);
  });

  it("ignores unknown, latin and mismatching words", () => {
    expect(getStressMarks("собака", 0)).toBeUndefined();
    expect(getStressMarks("cat", 0)).toBeUndefined();
    expect(getStressMarks("дом", 0)).toBeUndefined();
  });

  it("uses the quote's own stress in quote mode", () => {
    setConfigStore("mode", "quote");
    setCurrentQuote(quote(7, "Где моя кошка? cat gato"));
    const words = "Где моя кошка? cat gato".split(" ");
    expect(words.map((w, i) => render(w, i)).join(" ")).toBe(
      `Где${acute} моя${acute} ко${acute}шка? cat gato`,
    );
  });

  it("falls back to the word list when the quote text does not line up", () => {
    setConfigStore("mode", "quote");
    setCurrentQuote(quote(7, "кошка тоже"));
    expect(render("кошка", 0)).toBe(`ко${acute}шка`);
    expect(getStressMarks("тоже", 1)).toBeUndefined();
  });

  it("shows nothing when the setting is off or nothing was synced", () => {
    setConfigStore("showStressMarks", false);
    expect(getStressMarks("кошка", 0)).toBeUndefined();
    setConfigStore("showStressMarks", true);
    setStressSidecar(null);
    expect(getStressMarks("кошка", 0)).toBeUndefined();
  });
});
