// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://anshulnoori.com",
  trailingSlash: "never",
  compressHTML: false,
  build: {
    format: "file",
    // One HTML request plus one font: inline all CSS.
    inlineStylesheets: "always",
  },
  devToolbar: { enabled: false },
});
