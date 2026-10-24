// Progressive enhancement only: every section and link works without this.
const root = document.documentElement;
const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
const tabs = new Map(
  [...document.querySelectorAll<HTMLAnchorElement>(".tabs a")].map((a) => [a.hash.slice(1), a]),
);

function toggleTheme() {
  const dark =
    root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "light" : "dark";
  try {
    localStorage.setItem("theme", root.dataset.theme);
  } catch {}
}

function go(i: number) {
  const s = sections[Math.max(0, Math.min(sections.length - 1, i))];
  s?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  if (s) history.replaceState(null, "", `#${s.id}`);
}

function current() {
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) return sections.length - 1;
  const y = innerHeight * 0.3;
  let idx = 0;
  sections.forEach((s, i) => {
    if (s.getBoundingClientRect().top <= y) idx = i;
  });
  return idx;
}

document.querySelector("[data-theme-toggle]")?.addEventListener("click", toggleTheme);

addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target as HTMLElement;
  if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  const k = e.key.toLowerCase();
  if (k >= "1" && k <= "9") go(Number(k) - 1);
  else if (k === "j") go(current() + 1);
  else if (k === "k") go(current() - 1);
  else if (k === "m") toggleTheme();
  else if (k === "g") root.toggleAttribute("data-grid");
  else return;
  e.preventDefault();
});

// Highlight the tab of the section in view.
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

// Skill specimen card follows the pointer.
const card = {
  name: document.querySelector<HTMLElement>("[data-gc-name]"),
  group: document.querySelector<HTMLElement>("[data-gc-group]"),
  cp: document.querySelector<HTMLElement>("[data-gc-cp]"),
  index: document.querySelector<HTMLElement>("[data-gc-index]"),
};
const total = document.querySelectorAll(".glyphs li").length;
document.querySelector(".glyph-groups")?.addEventListener("pointerover", (e) => {
  const li = (e.target as HTMLElement).closest<HTMLElement>(".glyphs li");
  if (!li || !card.name) return;
  card.name.textContent = li.textContent!.trim();
  card.group!.textContent = li.dataset.group!;
  card.cp!.textContent = li.dataset.cp!;
  card.index!.textContent = `${li.dataset.i} / ${total}`;
  card.name.style.setProperty("--len", String(card.name.textContent.length));
});

// Visitor-local clock in the homelab HUD.
const clock = document.querySelector<HTMLElement>("[data-clock]");
if (clock) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 1000);
}

// Report what this page cost to load.
addEventListener("load", () => {
  const el = document.querySelector("[data-weight]");
  if (!el) return;
  const entries = [
    ...performance.getEntriesByType("navigation"),
    ...performance.getEntriesByType("resource"),
  ] as PerformanceResourceTiming[];
  const bytes = entries.reduce((n, r) => n + (r.encodedBodySize || 0), 0);
  if (bytes) el.textContent = `This page: ${(bytes / 1024).toFixed(1)} KB compressed.`;
});
