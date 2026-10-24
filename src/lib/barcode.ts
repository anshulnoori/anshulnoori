// Decorative barcode: deterministic bar widths derived from a string.
// Returns an SVG path for bars drawn in a 0..width by 0..1 box.
export function barcodePath(text: string, width = 120): string {
  let h = 2166136261;
  const bars: string[] = [];
  let x = 0;
  let i = 0;
  while (x < width) {
    h ^= text.charCodeAt(i++ % text.length);
    h = Math.imul(h, 16777619) >>> 0;
    const bar = 1 + (h % 3);
    const gap = 1 + ((h >>> 3) % 2);
    if (x + bar > width) break;
    bars.push(`M${x} 0h${bar}v1h-${bar}z`);
    x += bar + gap;
  }
  return bars.join("");
}
