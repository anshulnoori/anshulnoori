# anshulnoori.com

Static Astro site served as Cloudflare Workers static assets (no Worker script).

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # writes dist/
pnpm preview    # serves dist/ with wrangler, as Cloudflare will
pnpm deploy     # build + wrangler deploy (needs Cloudflare login)
```

Content lives in `src/data/site.ts` (taken from `resume.tex`). Each page section is a
component in `src/components/`. Styles are one file, `src/styles/global.css`, inlined
into the HTML at build time.

The font is Departure Mono v1.500 by Helena Zhang (SIL OFL 1.1), subset to Latin,
punctuation, arrows, and box-drawing glyphs (9 KB woff2). To re-subset:

```sh
pyftsubset DepartureMono-Regular.otf --flavor=woff2 --layout-features='*' \
  --no-hinting --desubroutinize --output-file=public/fonts/DepartureMono-Regular.woff2 \
  --unicodes="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+2010-2027,U+2030-203A,U+2070-209F,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215,U+221E,U+2248,U+2260,U+2264,U+2265,U+2318,U+2500-259F,U+25A0-25FF,U+2605,U+2606,U+2726,U+2727,U+2770-2771,U+276E-276F,U+276C-276D"
```

Keyboard: `1`-`9` jump to sections, `J`/`K` next/previous, `M` light/dark, `G` grid overlay.
