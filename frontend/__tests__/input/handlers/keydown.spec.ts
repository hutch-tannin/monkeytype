import { describe, it, expect, vi, afterEach } from "vitest";

const emulator = vi.hoisted(() => ({
  // a layout that is still loading
  getCharFromEvent: vi.fn(
    async () => new Promise<string | null>(() => undefined),
  ),
}));
vi.mock("../../../src/ts/test/layout-emulator", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCharFromEvent: emulator.getCharFromEvent,
}));
vi.mock("../../../src/ts/test/test-logic", () => ({}));
vi.mock("../../../src/ts/input/handlers/insert-text", () => ({
  emulateInsertText: vi.fn(async () => undefined),
}));

import { onKeydown } from "../../../src/ts/input/handlers/keydown";
import { Config } from "../../../src/ts/config/store";

function keydown(code: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { code, key: "x", cancelable: true });
}

describe("onKeydown", () => {
  afterEach(() => {
    Config.layout = "default";
  });

  it("blocks native input for emulated keys before awaiting the layout", () => {
    Config.layout = "auto_blagovest_workman";
    for (const code of ["KeyA", "KeyS", "Semicolon", "Space"]) {
      const event = keydown(code);
      void onKeydown(event);
      // checked synchronously - preventDefault after an await can be too late
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it("blocks key repeats while emulating", () => {
    Config.layout = "blagovest";
    const event = new KeyboardEvent("keydown", {
      code: "KeyA",
      repeat: true,
      cancelable: true,
    });
    void onKeydown(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves native input alone without emulation or for other keys", () => {
    const plain = keydown("KeyA");
    void onKeydown(plain);
    expect(plain.defaultPrevented).toBe(false);

    Config.layout = "blagovest";
    const backspace = keydown("Backspace");
    void onKeydown(backspace);
    expect(backspace.defaultPrevented).toBe(false);
  });
});
