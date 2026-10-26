#!/usr/bin/env node
// Compile cv/resume.tex and publish it as public/cv.pdf (served at /cv.pdf).
// Usage: pnpm cv
// Needs latexmk and pdflatex (Debian: texlive-latex-base texlive-latex-recommended
// texlive-latex-extra texlive-fonts-recommended latexmk).
//
// While the source still uses the red \tbd "Month Year" placeholder, the PDF is
// built to cv/build/resume.pdf for review but not copied into public/, so it
// cannot ship. The site shows its CV buttons only once public/cv.pdf exists.
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync } from "node:fs";

execFileSync("latexmk", ["-pdf", "-interaction=nonstopmode", "-halt-on-error", "-outdir=build", "resume.tex"], {
  cwd: "cv",
  stdio: ["ignore", "ignore", "inherit"],
});

const lines = readFileSync("cv/resume.tex", "utf8").split("\n");
const todo = lines
  .map((l, i) => [i + 1, l.trim()])
  .filter(([, l]) => /\\tbd\b/.test(l) && !l.startsWith("\\newcommand") && !l.startsWith("%"));
if (todo.length) {
  console.error(`Built cv/build/resume.pdf, but did not publish it: ${todo.length} placeholder date(s) left.`);
  for (const [n, l] of todo) console.error(`  cv/resume.tex:${n}  ${l.slice(0, 100)}`);
  process.exit(1);
}
copyFileSync("cv/build/resume.pdf", "public/cv.pdf");
console.log("Published public/cv.pdf");
