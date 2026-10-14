// Keeps a local log of Russian words typed with errors, per day, so they can be
// exported and tagged in Anki (kalinka-typing: tag_typos.py). Stored only in
// this browser's localStorage.
import { createSignal } from "solid-js";
import { z } from "zod";
import { getConfig } from "../config/store";
import { showNoticeNotification } from "../states/notifications";
import { LocalStorageWithSchema } from "../utils/local-storage-with-schema";
import { download } from "../utils/misc";
import { EventLog } from "./events/types";
import { getMissedWords } from "./events/stats";
import { plainWord } from "./dictation";

/** plain lowercase word -> local date (YYYY-MM-DD) -> mistyped letters */
const MissedLogSchema = z.record(z.string(), z.record(z.string(), z.number()));
export type MissedLog = z.infer<typeof MissedLogSchema>;

export type MissedExport = {
  format: "kalinka-missed-words";
  version: 1;
  exported: string;
  words: {
    word: string;
    errors: number;
    dates: Record<string, number>;
    lastDate: string;
  }[];
};

const missedLS = new LocalStorageWithSchema({
  key: "kalinkaMissedWords",
  schema: MissedLogSchema,
  fallback: {},
});

const cyrillic = /\p{Script=Cyrillic}/u;

const [missedWordCount, setMissedWordCount] = createSignal(
  Object.keys(missedLS.get()).length,
);
export { missedWordCount };

export function localDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Adds the Russian words of a finished test that had wrong letters. */
export function addMissedWords(
  log: MissedLog,
  missed: Record<string, number>,
  date: string,
): MissedLog {
  for (const [word, errors] of Object.entries(missed)) {
    if (!cyrillic.test(word)) continue;
    const plain = plainWord(word);
    if (plain === undefined || !cyrillic.test(plain)) continue;
    const days = (log[plain] ??= {});
    days[date] = (days[date] ?? 0) + errors;
  }
  return log;
}

export function recordMissedWords(eventLog: EventLog, now = new Date()): void {
  if (getConfig.mode === "zen") return;
  const log = addMissedWords(
    missedLS.get(),
    getMissedWords(eventLog),
    localDate(now),
  );
  missedLS.set(log);
  setMissedWordCount(Object.keys(log).length);
}

export function buildExport(log: MissedLog, now = new Date()): MissedExport {
  const words = Object.entries(log).map(([word, dates]) => {
    const days = Object.keys(dates).sort();
    return {
      word,
      errors: Object.values(dates).reduce((sum, n) => sum + n, 0),
      dates,
      lastDate: days[days.length - 1] ?? "",
    };
  });
  words.sort((a, b) => b.errors - a.errors || a.word.localeCompare(b.word));
  return {
    format: "kalinka-missed-words",
    version: 1,
    exported: now.toISOString(),
    words,
  };
}

export function downloadMissedWords(): void {
  const data = buildExport(missedLS.get());
  if (data.words.length === 0) {
    showNoticeNotification("No missed Russian words recorded yet");
    return;
  }
  download({
    filename: `kalinka-missed-words-${localDate(new Date())}.json`,
    data: new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    }),
  });
}

export function clearMissedWords(): void {
  missedLS.set({});
  setMissedWordCount(0);
  showNoticeNotification("Cleared the missed Kalinka words");
}
