# Kalinka local content

This fork can load personal Russian/Spanish study content (word lists, quotes,
stress marks, dictation audio) built from an Anki collection by a separate,
private pipeline (`kalinka-typing`). That content is **never committed**: it is
gitignored and copied in by a sync step. The code that uses it is committed and
works without it.

## Sync

From the `kalinka-typing` checkout:

```bash
python build.py --sync ../monkeytype-blagovest
```

or, to copy an existing build without rebuilding:

```bash
python sync.py ../monkeytype-blagovest
```

`sync.py --dry-run` shows what would change. The sync refuses to write any file
that is not gitignored here. A running dev server notices added or removed files
and reloads.

Then check the assets (Turbo hashes the gitignored files, so a re-sync is not
served from cache):

```bash
pnpm check-assets-languages
pnpm check-assets-quotes
```

## What is gitignored

| Path | Contents |
| --- | --- |
| `frontend/static/languages/russian_kalinka*.json` | `russian_kalinka`, `russian_kalinka_seen`, `russian_kalinka_trilingual` |
| `frontend/static/languages/russian_blagovest_*.json` | Blagovest letter-unlock stages 1-11 |
| `frontend/static/languages/spanish_kalinka.json` | Spanish word list |
| `frontend/static/quotes/russian_kalinka*.json` | `russian_kalinka` and `russian_kalinka_trilingual` quotes |
| `frontend/static/kalinka/` | stress sidecar and dictation audio |
| `frontend/scripts/short-quotes.local.json` | short-quote allow-list for the local quote files (merged into `short-quotes.json` by check-assets) |

## When the content is missing

- The language names stay in `LanguageSchema` and `LanguageGroups` (listed in
  `LocalLanguages` in `frontend/src/ts/constants/languages.ts`).
- `vite-plugins/local-content.ts` exposes which local files exist as
  `virtual:local-content`. Language pickers, the command line and the word
  filter hide local languages whose file is missing.
- A config that still points at a missing local language switches to
  `russian` or `spanish` with a notice. Polyglot ignores missing local
  languages.
- `check-assets` skips missing local language files.
- Unit tests always run as if nothing was synced.

## Stress marks

Setting: appearance > **show stress marks** (`showStressMarks`, on by default).
When `frontend/static/kalinka/russian_kalinka.stress.json` is synced, Russian
words get an acute accent (U+0301, or a grave U+0300 for secondary stress)
over the stressed vowel. It is display only: the mark is added inside the
rendered `<letter>`, while the expected text and what you type stay unaccented.

- Quote mode uses the quote's own stressed text (the sidecar's `quotes` map),
  as long as its words line up with the quote's words.
- Everything else (word mode, polyglot, upstream Russian lists, custom text)
  looks words up in the sidecar's `words` map, ignoring capitals and
  surrounding punctuation. Unknown words are shown as they are.

Code: `frontend/src/ts/test/stress-marks.ts`, used by `buildWordHTML` and
`updateWordLetters` in `test-ui.ts`.
