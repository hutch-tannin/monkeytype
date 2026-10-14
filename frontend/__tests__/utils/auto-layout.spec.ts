import { describe, it, expect } from "vitest";
import { isAutoLayout, resolveLayout } from "../../src/ts/utils/auto-layout";

describe("auto-layout", () => {
  describe("isAutoLayout", () => {
    it("detects auto layouts", () => {
      expect(isAutoLayout("auto_blagovest_workman")).toBe(true);
      expect(isAutoLayout("workman")).toBe(false);
      expect(isAutoLayout("default")).toBe(false);
      expect(isAutoLayout("constructor")).toBe(false);
    });
  });

  describe("resolveLayout", () => {
    it.each([
      ["привет", "blagovest"],
      ["Ёлка", "blagovest"],
      ["моро́женое", "blagovest"],
      ["«да»,", "blagovest"],
      ["hello", "workman_altgr"],
      ["mañana", "workman_altgr"],
      ["¿qué?", "workman_altgr"],
      ["123", "workman_altgr"],
      ["", "workman_altgr"],
    ])("auto_blagovest_workman: %s -> %s", (word, expected) => {
      expect(resolveLayout("auto_blagovest_workman", word)).toBe(expected);
    });

    it("maps default to qwerty", () => {
      expect(resolveLayout("default", "привет")).toBe("qwerty");
    });

    it("passes real layouts through regardless of the word", () => {
      expect(resolveLayout("workman", "привет")).toBe("workman");
      expect(resolveLayout("blagovest", "hello")).toBe("blagovest");
    });
  });
});
