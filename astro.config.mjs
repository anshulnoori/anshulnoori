// @ts-check
import { defineConfig } from "astro/config";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Open every link to another site in a new tab.
const externalLinks = {
  name: "external-links",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      const root = fileURLToPath(dir);
      for (const f of await readdir(root, { recursive: true })) {
        if (!f.endsWith(".html")) continue;
        const path = `${root}/${f}`;
        const html = await readFile(path, "utf8");
        const out = html.replace(/<a\b(?![^>]*\btarget=)([^>]*\bhref="https?:\/\/(?!anshulnoori\.com)[^"]*")/g, '<a target="_blank" rel="noopener"$1');
        if (out !== html) await writeFile(path, out);
      }
    },
  },
};

export default defineConfig({
  site: "https://anshulnoori.com",
  trailingSlash: "never",
  compressHTML: false,
  build: {
    format: "file",
    // One HTML request plus fonts: inline all CSS.
    inlineStylesheets: "always",
  },
  integrations: [externalLinks],
  devToolbar: { enabled: false },
});
