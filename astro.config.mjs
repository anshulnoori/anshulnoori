// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://anshulnoori.com",
  trailingSlash: "never",
  build: {
    format: "file",
    // One request for the page: CSS is inlined.
    inlineStylesheets: "always",
  },
  // three.js is one lazily loaded chunk, larger than Vite's default warning size.
  vite: { build: { chunkSizeWarningLimit: 700 } },
  devToolbar: { enabled: false },
});
