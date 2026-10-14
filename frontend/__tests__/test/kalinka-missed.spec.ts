import { describe, it, expect } from "vitest";
import {
  addMissedWords,
  buildExport,
  localDate,
} from "../../src/ts/test/kalinka-missed";

describe("kalinka-missed", () => {
  it("formats local dates", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("keeps only Russian words, normalized", () => {
    const log = addMissedWords(
      {},
      { "Кошка,": 2, кошка: 1, dog: 3, "¿qué?": 1, "«дом»": 1 },
      "2026-10-14",
    );
    expect(log).toEqual({
      кошка: { "2026-10-14": 3 },
      дом: { "2026-10-14": 1 },
    });
  });

  it("adds up per day", () => {
    let log = addMissedWords({}, { кошка: 2 }, "2026-10-14");
    log = addMissedWords(log, { кошка: 1 }, "2026-10-14");
    log = addMissedWords(log, { кошка: 4 }, "2026-10-15");
    expect(log).toEqual({ кошка: { "2026-10-14": 3, "2026-10-15": 4 } });
  });

  it("exports words sorted by errors", () => {
    const data = buildExport(
      {
        дом: { "2026-10-14": 1 },
        кошка: { "2026-10-15": 4, "2026-10-14": 3 },
      },
      new Date("2026-10-16T10:00:00Z"),
    );
    expect(data).toEqual({
      format: "kalinka-missed-words",
      version: 1,
      exported: "2026-10-16T10:00:00.000Z",
      words: [
        {
          word: "кошка",
          errors: 7,
          dates: { "2026-10-15": 4, "2026-10-14": 3 },
          lastDate: "2026-10-15",
        },
        {
          word: "дом",
          errors: 1,
          dates: { "2026-10-14": 1 },
          lastDate: "2026-10-14",
        },
      ],
    });
  });
});
