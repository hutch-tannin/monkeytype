// Shows stress marks (U+0301 acute, U+0300 grave for secondary stress) over
// Russian vowels while typing. Display only: the typed and expected text never
// contain the marks. Data comes from the gitignored Kalinka stress sidecar.
import { getConfig } from "../config/store";
import { getCurrentQuote } from "../states/test";
import { cachedFetchJson } from "../utils/json-data";
import { hasKalinkaFile } from "../utils/local-content";

export type StressSidecar = {
  /** plain lowercase word -> stress-marked form */
  words: Record<string, string>;
  /** quote language -> quote id -> stress-marked quote text */
  quotes: Record<string, Record<string, string>>;
};

/** letter index (in code points) -> mark to render after that letter */
export type StressMarks = Map<number, string>;

export const STRESS_FILE = "russian_kalinka.stress.json";

const stressMark = /[́̀]/u;
const cyrillic = /\p{Script=Cyrillic}/u;
// first run of letters, allowing inner hyphens (кто-нибудь)
const letterRun = /\p{L}(?:[\p{L}-]*\p{L})?/u;

let sidecar: StressSidecar | null = null;

export function setStressSidecar(data: StressSidecar | null): void {
  sidecar = data;
}

/** Loads the sidecar once if it was synced and the setting is on. */
export async function loadStressSidecar(): Promise<void> {
  if (sidecar !== null || !getConfig.showStressMarks) return;
  if (!hasKalinkaFile(STRESS_FILE)) return;
  try {
    sidecar = await cachedFetchJson<StressSidecar>(`/kalinka/${STRESS_FILE}`);
  } catch (e) {
    console.warn("Could not load stress marks", e);
  }
}

export function stripStress(text: string): string {
  return text.replace(/[́̀]/gu, "");
}

/** Positions of the marks in a stress-marked string, relative to its plain form. */
export function stressPositions(stressed: string): StressMarks {
  const marks: StressMarks = new Map();
  let index = 0;
  for (const char of stressed) {
    if (stressMark.test(char)) {
      if (index > 0) marks.set(index - 1, char);
    } else {
      index++;
    }
  }
  return marks;
}

function shift(marks: StressMarks, offset: number): StressMarks {
  return new Map([...marks].map(([i, mark]) => [i + offset, mark]));
}

function fromQuote(word: string, wordIndex: number): StressMarks | undefined {
  if (getConfig.mode !== "quote" || sidecar === null) return undefined;
  const quote = getCurrentQuote();
  if (quote === null) return undefined;
  const stressed = sidecar.quotes[quote.language]?.[String(quote.id)];
  const token = stressed?.split(" ")[wordIndex];
  if (token === undefined) return undefined;
  // only when the quote's words line up with the sidecar's tokens
  if (!word.startsWith(stripStress(token))) return undefined;
  return stressPositions(token);
}

function fromWordList(word: string): StressMarks | undefined {
  if (sidecar === null) return undefined;
  const match = letterRun.exec(word);
  if (match === null) return undefined;
  const plain = match[0].toLowerCase();
  const stressed = sidecar.words[plain];
  if (stressed === undefined || stripStress(stressed) !== plain) {
    return undefined;
  }
  const offset = [...word.slice(0, match.index)].length;
  return shift(stressPositions(stressed), offset);
}

/**
 * Stress marks for a test word (its display text), or undefined when there is
 * nothing to show.
 */
export function getStressMarks(
  word: string,
  wordIndex: number,
): StressMarks | undefined {
  if (!getConfig.showStressMarks || sidecar === null) return undefined;
  if (!cyrillic.test(word)) return undefined;
  const marks = fromQuote(word, wordIndex) ?? fromWordList(word);
  return marks !== undefined && marks.size > 0 ? marks : undefined;
}

/** The letter with its stress mark, if it has one. */
export function withStressMark(
  char: string,
  index: number,
  marks: StressMarks | undefined,
): string {
  return char + (marks?.get(index) ?? "");
}
