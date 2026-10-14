import { Layout } from "@monkeytype/schemas/configs";
import {
  AutoLayoutName,
  AutoLayoutNameSchema,
  LayoutName,
} from "@monkeytype/schemas/layouts";

const cyrillicPattern = /\p{Script=Cyrillic}/u;

// which layout each auto layout uses for cyrillic and for everything else
const autoLayouts: Record<
  AutoLayoutName,
  { cyrillic: LayoutName; other: LayoutName }
> = {
  auto_blagovest_workman: { cyrillic: "blagovest", other: "workman_altgr" },
};

export function isAutoLayout(layout: string): layout is AutoLayoutName {
  return (AutoLayoutNameSchema.options as string[]).includes(layout);
}

/**
 * Resolves a layout config value to a real layout file name.
 * Auto layouts pick a layout based on the script of the target word.
 */
export function resolveLayout(layout: Layout, targetWord: string): LayoutName {
  if (layout === "default") return "qwerty";
  if (!isAutoLayout(layout)) return layout;
  const { cyrillic, other } = autoLayouts[layout];
  return cyrillicPattern.test(targetWord) ? cyrillic : other;
}
