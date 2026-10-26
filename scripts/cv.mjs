#!/usr/bin/env node
// Compile cv/resume.tex and publish it as public/cv.pdf (served at /cv.pdf).
// Usage: pnpm cv [--force]
// Needs latexmk and pdflatex (Debian: texlive-latex-base texlive-latex-recommended
// texlive-latex-extra texlive-fonts-recommended latexmk).
//
// While the source still uses the red \tbd "Month Year" placeholder, the PDF is
// built to cv/build/resume.pdf for review but not copied into public/, unless
// --force is given. The site shows its CV buttons only once public/cv.pdf exists.
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync } from "node:fs";

const force = process.argv.includes("--force");

execFileSync("latexmk", ["-pdf", "-interaction=nonstopmode", "-halt-on-error", "-outdir=build", "resume.tex"], {
  cwd: "cv",
  stdio: ["ignore", "ignore", "inherit"],
});

const lines = readFileSync("cv/resume.tex", "utf8").split("\n");
const todo = lines
  .map((l, i) => [i + 1, l.trim()])
  .filter(([, l]) => /\\tbd\b/.test(l) && !l.startsWith("\\newcommand") && !l.startsWith("%"));
for (const [n, l] of todo) console.error(`  placeholder date: cv/resume.tex:${n}  ${l.slice(0, 100)}`);
if (todo.length && !force) {
  console.error(`Built cv/build/resume.pdf, but did not publish it. Fill in the dates, or rerun with --force.`);
  process.exit(1);
}
copyFileSync("cv/build/resume.pdf", "public/cv.pdf");
console.log(`Published public/cv.pdf${todo.length ? ` with ${todo.length} placeholder date(s)` : ""}`);
