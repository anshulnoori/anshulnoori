// Progressive enhancement only: every section and link works without this.
// Scrolling follows the CSS scroll-behavior, which respects reduced motion.
const root = document.documentElement;
const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
const tabs = new Map([...document.querySelectorAll<HTMLAnchorElement>(".tabs a")].map((a) => [a.hash.slice(1), a]));

function toggleTheme() {
  const dark =
    root.dataset["theme"] === "dark" || (!root.dataset["theme"] && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset["theme"] = dark ? "light" : "dark";
  localStorage.setItem("theme", root.dataset["theme"]);
}

function current() {
  if (innerHeight + scrollY >= root.scrollHeight - 2) return sections.length - 1;
  return Math.max(
    0,
    sections.findLastIndex((s) => s.getBoundingClientRect().top <= innerHeight * 0.3),
  );
}

function go(i: number) {
  const s = sections[Math.max(0, Math.min(sections.length - 1, i))];
  if (!s) return;
  s.scrollIntoView();
  history.replaceState(null, "", `#${s.id}`);
}

const keys: Record<string, () => void> = {
  j: () => go(current() + 1),
  k: () => go(current() - 1),
  m: toggleTheme,
  g: () => root.toggleAttribute("data-grid"),
};

addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target as HTMLElement;
  if (t.isContentEditable || t.matches("input, textarea, select")) return;
  const k = e.key.toLowerCase();
  const action = /^[1-9]$/.test(k) ? () => go(Number(k) - 1) : keys[k];
  if (!action) return;
  action();
  e.preventDefault();
});

document.querySelector("[data-theme-toggle]")?.addEventListener("click", toggleTheme);

// On phones the tabs are a popover menu; close it once a section is picked.
const menu = document.querySelector<HTMLElement>(".tabs");
menu?.addEventListener("click", (e) => {
  if (!(e.target as Element).closest("a") || !menu.matches(":popover-open")) return;
  menu.hidePopover();
});

let active: HTMLAnchorElement | undefined;
function mark() {
  const tab = tabs.get(sections[current()]?.id ?? "");
  if (tab === active) return;
  active?.removeAttribute("aria-current");
  tab?.setAttribute("aria-current", "true");
  active = tab;
}
addEventListener("scroll", mark, { passive: true });
mark();

// The skills specimen card shows whichever skill is under the pointer.
const card = document.querySelector<HTMLElement>(".glyph-card");
const total = document.querySelectorAll(".glyphs li").length;
document.querySelector(".glyph-groups")?.addEventListener("pointerover", (e) => {
  const li = (e.target as HTMLElement).closest<HTMLElement>(".glyphs li");
  if (!li || !card) return;
  const name = li.textContent.trim();
  const set = (sel: string, text: string) => (card.querySelector(sel)!.textContent = text);
  set("[data-gc-name]", name);
  set("[data-gc-group]", li.dataset["group"]!);
  set("[data-gc-cp]", li.dataset["cp"]!);
  set("[data-gc-index]", `${li.dataset["i"]} / ${total}`);
  card.style.setProperty("--len", String(name.length));
});

addEventListener("load", () => {
  const el = document.querySelector("[data-weight]");
  if (!el) return;
  const entries = performance
    .getEntriesByType("navigation")
    .concat(performance.getEntriesByType("resource")) as PerformanceResourceTiming[];
  const bytes = entries.reduce((n, r) => n + r.encodedBodySize, 0);
  if (bytes) el.textContent = `This page: ${(bytes / 1024).toFixed(1)} KB compressed.`;
});

// Upgrade the hero and the section dioramas once the page is idle.
const world = document.querySelector<HTMLElement>("[data-world]");
const plates = [...document.querySelectorAll<HTMLElement>("[data-plate]")];

function webgl2() {
  const gl = document.createElement("canvas").getContext("webgl2");
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return !!gl;
}

function upgrade() {
  if (world) import("./world/main").then((m) => m.start(world));
  if (plates.length) import("./world/plates").then((m) => m.startPlates(plates));
}

if (webgl2()) {
  if ("requestIdleCallback" in window) requestIdleCallback(upgrade, { timeout: 1200 });
  else setTimeout(upgrade, 300);
}

// "Show on globe" scrolls up and flies the planet to that place.
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-globe]");
  if (!b || !world) return;
  world.scrollIntoView();
  world.dispatchEvent(new CustomEvent("world:go", { detail: b.dataset["globe"] }));
});
