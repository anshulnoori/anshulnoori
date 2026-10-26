#!/usr/bin/env node
// Turn a KiCad board into the assets the 3D keyboard uses:
//   public/pcb/<name>.webp       top-down render of the bare board (kicad-cli)
//   src/data/pcb/<name>.json     board size and real switch positions
//
// Usage: node scripts/pcb.mjs <board.kicad_pcb> <name>
// Needs kicad-cli 9+ and ImageMagick.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [file, name] = process.argv.slice(2);
if (!file || !name) {
  console.error("usage: node scripts/pcb.mjs <board.kicad_pcb> <name>");
  process.exit(1);
}
const src = readFileSync(file, "utf8");
const U = 19.05; // mm per key unit

// Board outline: every point on Edge.Cuts graphics.
const edge = [];
for (const m of src.matchAll(/\((gr_line|gr_rect|gr_arc|gr_poly)\b([\s\S]*?)\(layer "Edge\.Cuts"\)/g))
  for (const p of m[2].matchAll(/\((?:start|end|mid|xy) ([-\d.]+) ([-\d.]+)\)/g)) edge.push([+p[1], +p[2]]);

// Footprints: reference, position, rotation, library name.
const footprints = [];
const starts = [...src.matchAll(/\n\t\(footprint "([^"]+)"/g)];
starts.forEach((m, i) => {
  const block = src.slice(m.index, starts[i + 1]?.index ?? src.length);
  const at = block.match(/\(at ([-\d.]+) ([-\d.]+)(?: ([-\d.]+))?\)/);
  const ref = block.match(/\(property "Reference" "([^"]+)"/)?.[1] ?? "";
  if (at) footprints.push({ lib: m[1], ref, x: +at[1], y: +at[2], rot: +(at[3] ?? 0) });
});

const isSwitch = (f) => /MX|Hotswap|Choc|SW_Cherry|Kailh/i.test(f.lib) && !/stab/i.test(f.lib);
const switches = footprints.filter(isSwitch);
const encoder = footprints.find((f) => /encoder|EC11|EC12/i.test(f.lib));
const fingerprint = footprints.find((f) => /finger|FPC.*sensor|R30[0-9]/i.test(f.lib));
if (!switches.length) throw new Error("no switch footprints found");
if (!edge.length) console.warn("warning: no Edge.Cuts outline, so the render will not line up with the keys");

const width = (s) => +(s.lib.match(/(\d+(?:\.\d+)?)u/i)?.[1] ?? 1);
// Without an outline, fall back to the outer edges of the keys.
const pts = edge.length
  ? edge
  : switches.flatMap((s) => [
      [s.x - (width(s) * U) / 2, s.y - U / 2],
      [s.x + (width(s) * U) / 2, s.y + U / 2],
    ]);
const minX = Math.min(...pts.map((p) => p[0])),
  maxX = Math.max(...pts.map((p) => p[0]));
const minY = Math.min(...pts.map((p) => p[1])),
  maxY = Math.max(...pts.map((p) => p[1]));

const layout = {
  name,
  source: file.split("/").pop(),
  outline: edge.length > 0,
  board: { w: (maxX - minX) / U, h: (maxY - minY) / U },
  // Key centres in key units from the board's top-left corner.
  keys: switches
    .map((s) => {
      const vertical = Math.abs(s.rot % 180) === 90;
      return { x: (s.x - minX) / U, y: (s.y - minY) / U, w: width(s), vertical, ref: s.ref };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x),
  encoder: encoder && { x: (encoder.x - minX) / U, y: (encoder.y - minY) / U },
  fingerprint: fingerprint && { x: (fingerprint.x - minX) / U, y: (fingerprint.y - minY) / U },
};

// Render the bare board from above, then crop to the board itself.
const tmp = join(tmpdir(), `${name}-render.png`);
execFileSync(
  "kicad-cli",
  [
    "pcb",
    "render",
    file,
    "-o",
    tmp,
    "--side",
    "top",
    "-w",
    "3200",
    "-h",
    "1600",
    "--quality",
    "high",
    "--background",
    "transparent",
  ],
  { stdio: "inherit" },
);
mkdirSync("public/pcb", { recursive: true });
mkdirSync("src/data/pcb", { recursive: true });
execFileSync("magick", [tmp, "-trim", "+repage", "-resize", "2048x>", "-quality", "86", `public/pcb/${name}.webp`]);
writeFileSync(`src/data/pcb/${name}.json`, JSON.stringify(layout, null, 2) + "\n");
console.log(
  `${switches.length} switches, board ${layout.board.w.toFixed(2)}u x ${layout.board.h.toFixed(2)}u, outline: ${layout.outline}`,
);
