import { describe, it, expect } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { useResourceWithPromise } from "../../src/ts/hooks/useResourceWithPromise";

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("useResourceWithPromise", () => {
  it("resolves callers that await while the source is reloading", async () => {
    const [source, setSource] = createSignal("a");
    const [data, { promise }] = createRoot(() =>
      useResourceWithPromise(source, async (value) => {
        await settle();
        return value.toUpperCase();
      }),
    );

    await promise;
    expect(data()).toBe("A");

    setSource("b");
    // awaited right after the source changed, before the reload finished
    const waited = promise.then(() => data());
    expect(
      await Promise.race([
        waited,
        new Promise((resolve) => setTimeout(() => resolve("timeout"), 200)),
      ]),
    ).toBe("B");
  });
});
