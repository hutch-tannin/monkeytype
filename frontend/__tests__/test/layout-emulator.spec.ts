import {
  describe,
  it,
  expect,
  afterEach,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import {
  updateAltGrState,
  getIsAltGrPressed,
  getCharFromEvent,
} from "../../src/ts/test/layout-emulator";
import { setConfigStore } from "../../src/ts/config/store";
import { setTargetWord } from "../../src/ts/states/test";

vi.mock("@leonabcd123/modern-caps-lock", () => ({
  isCapsLockOn: () => false,
}));

describe("LayoutEmulator", () => {
  describe("updateAltGrState", () => {
    afterEach(() => {
      // Reset isAltGrPressed state after each test
      // Simulate keyup event to reset state
      const event = createEvent("AltRight", "keyup");
      updateAltGrState(event);
    });

    const createEvent = (code: string, type: string): KeyboardEvent =>
      ({
        code,
        type,
      }) as KeyboardEvent;

    it("should set isAltGrPressed to true on AltRight keydown", () => {
      const event = createEvent("AltRight", "keydown");
      updateAltGrState(event);
      expect(getIsAltGrPressed()).toBe(true);
    });

    it("should set isAltGrPressed to false on AltRight keyup", () => {
      const event = createEvent("AltRight", "keyup");
      updateAltGrState(event);
      expect(getIsAltGrPressed()).toBe(false);
    });

    it("should set isAltGrPressed to true on AltLeft keydown on Mac", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mac",
        configurable: true,
      });
      const event = createEvent("AltLeft", "keydown");
      updateAltGrState(event);
      expect(getIsAltGrPressed()).toBe(true);
    });

    it("should set isAltGrPressed to false on AltLeft keyup on Mac", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mac",
        configurable: true,
      });
      const event = createEvent("AltLeft", "keyup");
      updateAltGrState(event);
      expect(getIsAltGrPressed()).toBe(false);
    });

    it("should not change isAltGrPressed on AltLeft keydown on non-Mac", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Windows",
        configurable: true,
      });
      const event = createEvent("AltLeft", "keydown");
      updateAltGrState(event);
      expect(getIsAltGrPressed()).toBe(false);
    });

    it("should not change isAltGrPressed on AltLeft keyup on non-Mac", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Windows",
        configurable: true,
      });
      const event = createEvent("AltLeft", "keyup");
      updateAltGrState(event);
      expect(getIsAltGrPressed()).toBe(false);
    });

    it("should not change isAltGrPressed on keydown of other keys", () => {
      const event = createEvent("KeyA", "keydown");
      updateAltGrState(event);
      expect(getIsAltGrPressed()).toBe(false);
    });

    it("should not change isAltGrPressed on keyup of other keys", () => {
      const event = createEvent("KeyA", "keyup");
      updateAltGrState(event);
      expect(getIsAltGrPressed()).toBe(false);
    });
  });

  describe("getCharFromEvent with auto_blagovest_workman", () => {
    async function press(
      code: string,
      { shift = false, altGr = false } = {},
    ): Promise<string | null> {
      if (altGr) {
        updateAltGrState({
          code: "AltRight",
          type: "keydown",
        } as KeyboardEvent);
      }
      try {
        return await getCharFromEvent({
          code,
          shiftKey: shift,
        } as KeyboardEvent);
      } finally {
        updateAltGrState({ code: "AltRight", type: "keyup" } as KeyboardEvent);
      }
    }

    beforeEach(() => {
      setConfigStore("layout", "auto_blagovest_workman");
    });

    afterAll(() => {
      setConfigStore("layout", "default");
      setTargetWord("");
    });

    describe("cyrillic target word uses blagovest", () => {
      beforeEach(() => setTargetWord("ёлка"));

      it.each([
        ["KeyQ", false, false, "ю"],
        ["KeyA", false, false, "и"],
        ["KeyA", true, false, "И"],
        ["KeyS", false, false, "е"],
        ["KeyS", false, true, "ё"],
        ["KeyS", true, true, "Ё"],
        ["Backquote", false, false, "ё"],
        ["KeyP", false, false, "ь"],
        ["KeyP", false, true, "ъ"],
        ["KeyP", true, true, "Ъ"],
        ["KeyT", false, false, "."],
        ["KeyT", true, false, "!"],
        ["KeyT", false, true, "»"],
        ["KeyT", true, true, "“"],
        ["KeyM", false, false, ","],
        ["KeyM", true, false, "?"],
        ["KeyM", false, true, "«"],
        ["KeyM", true, true, "„"],
        ["KeyX", false, false, "—"],
        ["KeyX", true, false, ":"],
        ["KeyX", false, true, "́"],
        ["Digit2", false, true, '"'],
        ["Digit3", false, true, "№"],
        ["Digit4", false, true, "₽"],
        ["Digit8", false, true, "…"],
        ["Minus", false, true, "–"],
        ["Equal", false, true, "±"],
        ["Slash", false, false, "ц"],
        ["Space", false, false, " "],
      ])("%s shift=%s altGr=%s -> %s", async (code, shift, altGr, expected) => {
        expect(await press(code, { shift, altGr })).toBe(expected);
      });
    });

    describe("other target words use workman_altgr", () => {
      beforeEach(() => setTargetWord("mañana"));

      it.each([
        ["KeyA", false, false, "a"],
        ["KeyE", false, false, "r"],
        ["KeyK", false, false, "e"],
        ["KeyD", true, false, "H"],
        ["KeyA", false, true, "á"],
        ["KeyA", true, true, "Á"],
        ["KeyK", false, true, "é"],
        ["Semicolon", false, true, "í"],
        ["KeyL", false, true, "ó"],
        ["KeyI", false, true, "ú"],
        ["KeyJ", false, true, "ñ"],
        ["KeyJ", true, true, "Ñ"],
        ["KeyH", false, true, "ü"],
        ["Digit1", false, true, "¡"],
        ["Slash", false, true, "¿"],
        ["Slash", true, true, "¿"],
        ["BracketLeft", false, true, "«"],
        ["BracketRight", false, true, "»"],
        ["Minus", false, true, "–"],
        ["Minus", true, true, "—"],
        ["Digit5", false, true, "€"],
        // no altgr variant falls back to the base key
        ["KeyS", false, true, "s"],
      ])("%s shift=%s altGr=%s -> %s", async (code, shift, altGr, expected) => {
        expect(await press(code, { shift, altGr })).toBe(expected);
      });
    });

    it("switches layout when the target word changes script", async () => {
      setTargetWord("hola");
      expect(await press("KeyA")).toBe("a");
      setTargetWord("да");
      expect(await press("KeyA")).toBe("и");
      setTargetWord("and");
      expect(await press("KeyA")).toBe("a");
    });
  });
});
