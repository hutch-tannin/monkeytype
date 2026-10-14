import { Plugin } from "vite";
import { existsSync, readdirSync } from "fs";
import path from "path";

const virtualModuleId = "virtual:local-content";
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

// personal content synced from kalinka-typing (gitignored, see docs/KALINKA.md)
const localLanguageFile =
  /^(russian_kalinka.*|russian_blagovest_\d+|spanish_kalinka)\.json$/;
const kalinkaDir = "./static/kalinka";

export type LocalContent = {
  languages: string[];
  quotes: string[];
  kalinkaFiles: string[];
};

const empty: LocalContent = { languages: [], quotes: [], kalinkaFiles: [] };

function listMatching(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => localLanguageFile.test(file))
    .map((file) => file.slice(0, -5))
    .sort();
}

function listKalinkaFiles(): string[] {
  if (!existsSync(kalinkaDir)) return [];
  // top level plus the audio manifest, not the audio files themselves
  const files = readdirSync(kalinkaDir).filter((file) =>
    file.endsWith(".json"),
  );
  if (existsSync(`${kalinkaDir}/audio/manifest.json`)) {
    files.push("audio/manifest.json");
  }
  return files.sort();
}

export function scanLocalContent(): LocalContent {
  return {
    languages: listMatching("./static/languages"),
    quotes: listMatching("./static/quotes"),
    kalinkaFiles: listKalinkaFiles(),
  };
}

/**
 * Exposes which gitignored local content files exist, so the app can hide
 * languages and features whose files were never synced.
 */
export function localContent(options?: { skip: boolean }): Plugin {
  return {
    name: "virtual-local-content",
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId;
      return;
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        const content = options?.skip ? empty : scanLocalContent();
        return `export const localContent = ${JSON.stringify(content)};`;
      }
      return;
    },
    configureServer(server) {
      // re-scan when a sync adds or removes files while the dev server runs
      const watched = ["languages", "quotes", "kalinka"].map((dir) =>
        path.resolve("./static", dir),
      );
      const onChange = (file: string): void => {
        const resolved = path.resolve(file);
        const relevant =
          resolved.startsWith(path.resolve(kalinkaDir)) ||
          localLanguageFile.test(path.basename(resolved));
        if (!relevant || resolved.endsWith(".mp3")) return;
        const mod = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
        if (mod === undefined) return;
        server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.add(watched);
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
    },
  };
}
