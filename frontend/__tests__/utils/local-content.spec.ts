import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  LanguageGroups,
  LocalLanguages,
} from "../../src/ts/constants/languages";

const content = vi.hoisted(() => ({
  languages: [] as string[],
  quotes: [] as string[],
  kalinkaFiles: [] as string[],
}));
vi.mock("virtual:local-content", () => ({ localContent: content }));

const localContent = await import("../../src/ts/utils/local-content");

describe("local-content", () => {
  beforeEach(() => {
    content.languages = [];
    content.kalinkaFiles = [];
  });

  it("puts every local language in exactly one group", () => {
    for (const language of LocalLanguages) {
      const groups = Object.entries(LanguageGroups).filter(([, languages]) =>
        languages.includes(language),
      );
      expect(groups.map(([group]) => group)).toHaveLength(1);
    }
  });

  it("treats upstream languages as always available", () => {
    expect(localContent.isLanguageAvailable("english")).toBe(true);
    expect(localContent.isLanguageAvailable("russian_10k")).toBe(true);
  });

  it("hides local languages that were not synced", () => {
    expect(localContent.isLanguageAvailable("russian_kalinka")).toBe(false);
    content.languages = ["russian_kalinka"];
    expect(localContent.isLanguageAvailable("russian_kalinka")).toBe(true);
    expect(localContent.isLanguageAvailable("russian_blagovest_3")).toBe(false);
  });

  it("falls back to the base language of the group", () => {
    expect(localContent.fallbackLanguage("russian_kalinka_seen")).toBe(
      "russian",
    );
    expect(localContent.fallbackLanguage("russian_blagovest_11")).toBe(
      "russian",
    );
    expect(localContent.fallbackLanguage("spanish_kalinka")).toBe("spanish");
    expect(localContent.fallbackLanguage("english")).toBe("english");
    content.languages = ["spanish_kalinka"];
    expect(localContent.fallbackLanguage("spanish_kalinka")).toBe(
      "spanish_kalinka",
    );
  });

  it("filters the picker lists when nothing is synced", () => {
    // built at import time, when no local content was present
    expect(localContent.AvailableLanguageList).not.toContain("russian_kalinka");
    expect(localContent.AvailableLanguageList).toContain("russian");
    expect(localContent.AvailableLanguageGroups["russian"]).not.toContain(
      "russian_blagovest_1",
    );
    expect(localContent.AvailableLanguageGroups["spanish"]).toEqual([
      "spanish",
      "spanish_1k",
      "spanish_10k",
      "spanish_650k",
    ]);
  });

  it("reports synced kalinka files", () => {
    expect(localContent.hasKalinkaFile("russian_kalinka.stress.json")).toBe(
      false,
    );
    content.kalinkaFiles = ["russian_kalinka.stress.json"];
    expect(localContent.hasKalinkaFile("russian_kalinka.stress.json")).toBe(
      true,
    );
  });
});
