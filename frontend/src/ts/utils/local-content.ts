import { Language } from "@monkeytype/schemas/languages";
import { localContent } from "virtual:local-content";
import {
  LanguageGroups,
  LanguageList,
  LocalLanguages,
} from "../constants/languages";

/**
 * False for a local-only language (see LocalLanguages) whose file was not
 * synced into frontend/static/languages. Always true for upstream languages.
 */
export function isLanguageAvailable(language: Language): boolean {
  if (!LocalLanguages.includes(language)) return true;
  return localContent.languages.includes(language);
}

/** True when a file under frontend/static/kalinka/ was synced. */
export function hasKalinkaFile(file: string): boolean {
  return localContent.kalinkaFiles.includes(file);
}

/**
 * The language to use instead of a local-only language that is missing:
 * russian_kalinka_seen -> russian, spanish_kalinka -> spanish.
 */
export function fallbackLanguage(language: Language): Language {
  if (isLanguageAvailable(language)) return language;
  return language.startsWith("spanish") ? "spanish" : "russian";
}

/** LanguageGroups without local-only languages that were never synced. */
export const AvailableLanguageGroups: Record<string, Language[]> =
  Object.fromEntries(
    Object.entries(LanguageGroups).map(([group, languages]) => [
      group,
      languages.filter(isLanguageAvailable),
    ]),
  );

/** LanguageList without local-only languages that were never synced. */
export const AvailableLanguageList: Language[] =
  LanguageList.filter(isLanguageAvailable);
