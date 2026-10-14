// Dictation funbox: plays the current word (and, in quote mode, the sentence)
// while its text stays hidden until typed. Audio comes from the gitignored
// Kalinka manifest (Anki recordings, Piper TTS); anything else falls back to
// the browser's speechSynthesis, like the tts funbox.
import { Language, LanguageObject } from "@monkeytype/schemas/languages";
import { getConfig } from "../config/store";
import { getActiveWordIndex, getCurrentQuote } from "../states/test";
import { showNoticeNotification } from "../states/notifications";
import { cachedFetchJson } from "../utils/json-data";
import { hasKalinkaFile, isLanguageAvailable } from "../utils/local-content";
import * as TestWords from "./test-words";

export type DictationAudio = { file: string; source: "anki" | "piper" };
export type DictationManifest = {
  /** plain lowercase word -> audio */
  words: Record<string, DictationAudio>;
  /** quote language -> quote id -> sentence audio */
  quotes: Record<string, Record<string, DictationAudio>>;
};

export const MANIFEST_FILE = "audio/manifest.json";
const AUDIO_BASE = "/kalinka/audio/";

const cyrillic = /\p{Script=Cyrillic}/u;
const spanishLetters = /[ñáéíóúü¿¡]/iu;
// first run of letters, allowing inner hyphens and apostrophes
const letterRun = /\p{L}(?:[\p{L}'’-]*\p{L})?/u;

let manifest: DictationManifest | null = null;
let manifestRequested = false;
let player: HTMLAudioElement | null = null;
let currentWord = "";
let showedBlockedNotice = false;

export function setDictationManifest(data: DictationManifest | null): void {
  manifest = data;
  manifestRequested = data !== null;
}

async function loadManifest(): Promise<void> {
  if (manifestRequested) return;
  manifestRequested = true;
  if (!hasKalinkaFile(MANIFEST_FILE)) return;
  try {
    manifest = await cachedFetchJson<DictationManifest>(
      `/kalinka/${MANIFEST_FILE}`,
    );
  } catch (e) {
    console.warn("Could not load dictation audio", e);
  }
}

export function plainWord(word: string): string | undefined {
  return letterRun.exec(word)?.[0].toLowerCase();
}

/** URL of the recorded or Piper audio for a word, if the manifest has one. */
export function wordAudioUrl(word: string): string | undefined {
  const plain = plainWord(word);
  if (plain === undefined || manifest === null) return undefined;
  const entry = manifest.words[plain];
  return entry ? AUDIO_BASE + entry.file : undefined;
}

/** URL of the current quote's sentence audio (quote mode only). */
export function sentenceAudioUrl(): string | undefined {
  if (getConfig.mode !== "quote" || manifest === null) return undefined;
  const quote = getCurrentQuote();
  if (quote === null) return undefined;
  const entry = manifest.quotes[quote.language]?.[String(quote.id)];
  return entry ? AUDIO_BASE + entry.file : undefined;
}

/**
 * BCP 47 tag for speechSynthesis: the first test language (polyglot languages,
 * else the test language, then spanish_kalinka and english) whose word list
 * has the word. Mixed lists like russian_kalinka_trilingual have no bcp47.
 */
export async function speechLanguage(word: string): Promise<string> {
  if (cyrillic.test(word)) return "ru-RU";
  const plain = plainWord(word) ?? word;
  const candidates: Language[] = getConfig.funbox.includes("polyglot")
    ? [...getConfig.customPolyglot]
    : [getConfig.language, "spanish_kalinka", "english"];
  for (const language of candidates.filter(isLanguageAvailable)) {
    // cachedFetchJson, not getLanguage: that one swaps the test's current language
    const data = await cachedFetchJson<LanguageObject>(
      `/languages/${language}.json`,
    ).catch(() => undefined);
    // upstream english lists have no bcp47; mixed lists have none on purpose
    const bcp47 =
      data?.bcp47 ?? (language.startsWith("english") ? "en-US" : undefined);
    if (bcp47 === undefined || bcp47.startsWith("ru")) continue;
    if (data?.words.includes(plain)) return bcp47;
  }
  return spanishLetters.test(word) ? "es-ES" : "en-US";
}

function stop(): void {
  player?.pause();
  player = null;
  window.speechSynthesis?.cancel();
}

function onBlocked(e: unknown): void {
  if (!(e instanceof DOMException) || e.name !== "NotAllowedError") {
    console.warn("Dictation audio failed", e);
    return;
  }
  if (showedBlockedNotice) return;
  showedBlockedNotice = true;
  showNoticeNotification(
    "The browser blocked audio until you type. Press Ctrl+Space to hear the word.",
  );
}

async function playUrl(url: string): Promise<void> {
  stop();
  const audio = new Audio(url);
  player = audio;
  await new Promise<void>((resolve) => {
    audio.addEventListener("ended", () => resolve(), { once: true });
    audio.addEventListener("error", () => resolve(), { once: true });
    audio.play().catch((e: unknown) => {
      onBlocked(e);
      resolve();
    });
  });
}

async function speak(word: string): Promise<void> {
  if (window.speechSynthesis === undefined) return;
  stop();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = await speechLanguage(word);
  window.speechSynthesis.speak(utterance);
}

export async function playWord(word: string): Promise<void> {
  await loadManifest();
  const url = wordAudioUrl(word);
  if (url !== undefined) {
    await playUrl(url);
  } else {
    await speak(word);
  }
}

export async function playSentence(): Promise<boolean> {
  await loadManifest();
  const url = sentenceAudioUrl();
  if (url === undefined) return false;
  await playUrl(url);
  return true;
}

/** Called by the funbox for every new current word (toggleScript). */
export async function onWord(word: string): Promise<void> {
  currentWord = word;
  await loadManifest();
  // quote start: the whole sentence first, then the first word
  if (getActiveWordIndex() === 0 && sentenceAudioUrl() !== undefined) {
    await playSentence();
    if (currentWord !== word) return;
  }
  await playWord(word);
}

/** Ctrl+Space replays the word, Ctrl+Shift+Space the sentence. */
export function consumeKeydown(event: KeyboardEvent): boolean {
  if (event.code !== "Space" || !event.ctrlKey || event.altKey) return false;
  if (event.shiftKey) {
    void playSentence().then((played) => {
      if (!played) void playWord(currentWord);
    });
  } else {
    void playWord(TestWords.words.getCurrent()?.text ?? currentWord);
  }
  return true;
}

export function reset(): void {
  stop();
  currentWord = "";
}
