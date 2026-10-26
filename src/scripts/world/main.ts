import {
  Euler,
  LinearSRGBColorSpace,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import type { PlaceId } from "../../lib/places";
import { buildKeyboard } from "./keyboard";
import { ink, inkHot, setInk, uniforms } from "./look";
import { buildPlanet, LANDMARK, type Place } from "./planet";

type Mode = "orbit" | "place" | "object";

const SVG = "http://www.w3.org/2000/svg";
const NARROW = 760;
const IO80_CARD = 448; // .io80-card right edge plus a gap; IO80 centres in the space beside it
const CLICK_SLOP = 5;
const STEP_KEYS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function start(root: HTMLElement) {
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>(".world-canvas");
  const lines = $<SVGSVGElement>(".world-lines");
  const crumb = $<HTMLElement>(".world-crumb");
  const back = $<HTMLButtonElement>(".world-back");
  const hint = $<HTMLElement>(".world-hint");
  const intro = $<HTMLElement>(".world-intro");
  const wordmark = $<HTMLElement>(".wordmark");
  const io80 = $<HTMLElement>(".io80");
  const legend = document.querySelector<HTMLElement>(".keys");
  const labels = new Map(
    [...root.querySelectorAll<HTMLAnchorElement>("[data-place]")].map((a) => [a.dataset["place"] as PlaceId, a]),
  );
  const cards = new Map(
    [...root.querySelectorAll<HTMLElement>("[data-card]")].map((c) => [c.dataset["card"] as PlaceId, c]),
  );
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const { planet, places, tick, setInkColor } = buildPlanet();
  const scene = new Scene().add(planet);
  const camera = new PerspectiveCamera(30, 1, 0.05, 50);

  const kb = buildKeyboard();
  kb.setExploded(true);
  const kbScene = new Scene().add(kb.root);
  const kbCam = new PerspectiveCamera(30, 1, 0.1, 50);

  // Each place gets a leader line and a pulsing dot where it meets the globe.
  const marks = new Map(
    [...labels.keys()].map((id) => {
      const line = document.createElementNS(SVG, "line");
      const dot = document.createElementNS(SVG, "g");
      dot.classList.add("world-dot");
      dot.innerHTML = '<circle class="pulse" r="9"/><circle r="3.5"/>';
      lines.append(line, dot);
      return [id, { line, dot }] as const;
    }),
  );
  const tags = kb.anchors.map((a) => {
    const s = document.createElement("span");
    s.textContent = a.label;
    $(".io80-tags").append(s);
    return s;
  });

  let mode: Mode = "orbit";
  let focus: Place | undefined;
  let hot: PlaceId | undefined;
  let yaw = -0.9,
    pitch = 0.1,
    yawT = yaw,
    pitchT = pitch,
    spin = 0;
  let off = 0,
    offT = 0;
  let kbYaw = -0.3,
    kbYawT = kbYaw,
    kbPitch = 0;
  let width = 1,
    height = 1,
    narrow = false;
  const camPos = new Vector3(),
    camPosT = new Vector3(),
    look = new Vector3(),
    lookT = new Vector3();

  const inView = () => root.getBoundingClientRect().bottom > innerHeight * 0.5;
  const placeById = (id: PlaceId) => places.find((p) => p.id === id)!;
  const labelText = (id: PlaceId) => labels.get(id)?.textContent?.trim() ?? "";

  // Move the planet clear of the intro: centred if it fits, else shifted
  // right, else pushed further away. Returns camera distance and x offset.
  function clearOfIntro(d: number): [number, number] {
    const top = height - 44 - intro.offsetHeight;
    const right = 44 + Math.max(intro.offsetWidth, wordmark.scrollWidth);
    const cy = height / 2;
    let x = 0;
    for (let i = 0; i < 12; i++, d *= 1.08) {
      const r = (height * 1.22) / (2 * d * 0.268);
      const cx = Math.min(Math.max(width / 2, right + r + 24), width - r - 24);
      x = cx - width / 2;
      if (Math.hypot(cx - Math.min(cx, right), cy - Math.max(cy, top)) >= r + 16) return [d, x];
    }
    return [d, x];
  }

  function orbitView() {
    const d0 = Math.max(6, (narrow ? 1.28 : 1.5) / (0.268 * (width / height)));
    const [d, x] = narrow ? [d0, 0] : clearOfIntro(d0);
    offT = x;
    lookT.set(0, narrow ? -0.75 : 0, 0);
    camPosT.set(0, d * 0.2, d);
  }

  // Stand south of the place looking north, so the horizon sits behind it.
  function placeView(p: Place) {
    yawT = yaw + wrapAngle(-Math.atan2(p.n.x, p.n.z) - yaw);
    pitchT = Math.asin(p.n.y) - 0.55;
    const centre = p.root.position.clone().applyEuler(new Euler(pitchT, yawT, 0, "XYZ"));
    const n = centre.clone().normalize();
    const up = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
    const dir = n.clone().multiplyScalar(Math.cos(0.95)).addScaledVector(up, -Math.sin(0.95));
    const z = LANDMARK / 1.8;
    camPosT.copy(centre).addScaledVector(dir, (narrow ? 1.9 : 1.25) * z);
    lookT
      .copy(centre)
      .addScaledVector(up, (narrow ? -0.12 : 0.12) * z)
      .addScaledVector(n, 0.06 * z);
    offT = narrow ? 0 : -Math.min(240, width * 0.17);
  }

  function view() {
    if (mode === "orbit") return orbitView();
    if (mode === "place" && focus) placeView(focus);
  }

  function setMode(m: Mode, p = focus) {
    mode = m;
    focus = p;
    root.dataset["mode"] = m;
    cards.forEach((c, id) => (c.hidden = m !== "place" || id !== focus?.id));
    io80.hidden = m !== "object";
    back.hidden = m === "orbit";
    crumb.textContent =
      m === "orbit"
        ? ""
        : m === "place"
          ? `Planet / ${labelText(focus!.id)}`
          : `Planet / ${labelText("keyboards")} / IO80`;
    if (legend) legend.dataset["mode"] = m !== "orbit" ? m : inView() ? "orbit" : "page";
    view();
    highlight(undefined);
  }

  function highlight(id: PlaceId | undefined) {
    if (id === hot) return;
    if (hot) setInk(placeById(hot).root, ink);
    if (id) setInk(placeById(id).root, inkHot);
    hot = id;
    labels.forEach((a, k) => a.classList.toggle("is-hot", k === hot));
    canvas.style.cursor = hot ? "pointer" : "";
  }

  // Swap between the planet and IO80 behind a short fade.
  function swapTo(m: Mode) {
    canvas.classList.add("is-swapping");
    setTimeout(
      () => {
        setMode(m);
        canvas.classList.remove("is-swapping");
      },
      reduce ? 0 : 220,
    );
  }

  const go = (id: PlaceId) => setMode("place", placeById(id));
  const step = (d: number) => setMode("place", places[(places.indexOf(focus!) + d + places.length) % places.length]);

  for (const [id, a] of labels) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      go(id);
    });
    a.addEventListener("pointerenter", () => mode === "orbit" && highlight(id));
    a.addEventListener("pointerleave", () => mode === "orbit" && highlight(undefined));
  }
  root.addEventListener("world:go", (e) => go((e as CustomEvent<PlaceId>).detail));
  back.addEventListener("click", () => (mode === "object" ? swapTo("place") : setMode("orbit")));
  $("[data-closer]").addEventListener("click", () => swapTo("object"));
  const explodeButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-explode]")];
  for (const b of explodeButtons) {
    b.addEventListener("click", () => {
      kb.setExploded(b.dataset["explode"] === "1");
      explodeButtons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    });
  }

  const ray = new Raycaster();
  const ndc = new Vector2();
  function pick(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(planet).find((h) => h.object instanceof Mesh);
    return hit?.object.userData["place"] as PlaceId | undefined;
  }

  let drag: { x: number; y: number; moved: number } | undefined;
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault(); // no text selection while dragging across the intro
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) {
      if (mode === "orbit" && e.pointerType === "mouse") highlight(pick(e));
      return;
    }
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY, moved: drag.moved + Math.abs(dx) + Math.abs(dy) };
    if (mode === "orbit") {
      yawT += dx * 0.006;
      pitchT = MathUtils.clamp(pitchT + dy * 0.004, -0.7, 0.7);
      spin = dx * 0.006;
      return;
    }
    if (mode !== "object") return;
    kbYawT += dx * 0.008;
    kbPitch = MathUtils.clamp(kbPitch + dy * 0.005, -0.35, 0.6);
  });
  canvas.addEventListener("pointerup", (e) => {
    const clicked = drag && drag.moved < CLICK_SLOP;
    drag = undefined;
    if (!clicked) return;
    const id = pick(e);
    if (mode === "orbit" && id) return go(id);
    if (mode === "place" && focus?.id === "keyboards" && id === "keyboards") swapTo("object");
  });

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape" && mode !== "orbit") {
      back.click();
      return true;
    }
    if (mode === "object") return kb.press(e.code, performance.now());
    const d = STEP_KEYS[e.key];
    if (mode === "place" && d) {
      step(d);
      return true;
    }
    const n = Number(e.key);
    if (mode !== "orbit" || !inView() || !Number.isInteger(n) || n < 1 || n > places.length) return false;
    go(places[n - 1]!.id);
    return true;
  }
  addEventListener(
    "keydown",
    (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as Element).matches("input, textarea, select")) return;
      if (handleKey(e)) e.preventDefault();
    },
    { capture: true },
  );
  addEventListener(
    "scroll",
    () => {
      if (legend && mode === "orbit") legend.dataset["mode"] = inView() ? "orbit" : "page";
    },
    { passive: true },
  );

  // --ink-strong and --paper are registered <color> properties, so they compute to rgb().
  function theme() {
    const cs = getComputedStyle(document.documentElement);
    ink.color.setStyle(cs.getPropertyValue("--ink-strong"));
    setInkColor(ink.color);
    uniforms.uPaper.value.setStyle(cs.getPropertyValue("--paper"));
  }
  theme();
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);

  function resize() {
    width = root.clientWidth;
    height = root.clientHeight;
    narrow = width < NARROW;
    renderer.setSize(width, height, false);
    for (const c of [camera, kbCam]) {
      c.aspect = width / height;
      c.updateProjectionMatrix();
    }
    uniforms.uCell.value = renderer.getPixelRatio();
    const free = narrow ? width : width - IO80_CARD;
    const kd = Math.max(9.6, 5.4 / (0.536 * (free / height)));
    kbCam.position.set(0, kd * 0.48, kd * 0.88);
    kbCam.lookAt(0, narrow ? -kd * 0.035 : 0.35, 0);
    lines.setAttribute("viewBox", `0 0 ${width} ${height}`);
    view();
  }
  new ResizeObserver(resize).observe(root);
  resize();
  camPos.copy(camPosT).multiplyScalar(1.25);
  look.copy(lookT);
  off = offT;
  if (!reduce) yaw -= 2.4; // spin in on load, so it reads as a globe

  const v = new Vector3(),
    origin = new Vector3(),
    toCam = new Vector3(),
    edge = new Vector3();
  const project = (p: Vector3, cam: PerspectiveCamera) => {
    v.copy(p).project(cam);
    return [(v.x * 0.5 + 0.5) * width, (-v.y * 0.5 + 0.5) * height] as const;
  };
  const show = (el: HTMLElement | SVGElement, on: boolean) => (el.style.opacity = on ? "1" : "0");

  // Labels sit beside the globe, not above or below it, clear of the hint.
  function placeLabel(p: Place, ox: number, oy: number) {
    const a = labels.get(p.id)!;
    const { line, dot } = marks.get(p.id)!;
    const w = p.anchor.clone().applyMatrix4(planet.matrixWorld);
    const facing = w.clone().normalize().dot(toCam.copy(camera.position).sub(w).normalize());
    const visible = mode === "orbit" && facing > 0.12;
    const [x, y] = project(w, camera);
    const len = Math.hypot(x - ox, y - oy) || 1;
    const dx = (x - ox) / len,
      dy = (y - oy) / len;
    const lx = MathUtils.clamp(x + Math.sign(dx) * 40, 8, width - 8),
      ly = y + dy * 18;
    const toLeft = dx < 0 ? lx - a.offsetWidth >= 8 : lx + a.offsetWidth > width - 8;
    a.style.transform = `translate(${lx}px, ${ly}px) translate(${toLeft ? "-100%" : "0"}, -50%)`;
    a.style.pointerEvents = visible ? "" : "none";
    a.tabIndex = visible ? 0 : -1;
    line.setAttribute("x1", String(x));
    line.setAttribute("y1", String(y));
    line.setAttribute("x2", String(lx));
    line.setAttribute("y2", String(ly));
    dot.setAttribute("transform", `translate(${x} ${y})`);
    line.classList.toggle("is-hot", p.id === hot);
    dot.classList.toggle("is-hot", p.id === hot);
    for (const el of [a, line, dot]) show(el, visible);
  }

  function placeLabels() {
    const [ox, oy] = project(origin, camera);
    for (const p of places) placeLabel(p, ox, oy);
    const [ex] = project(edge.setFromMatrixColumn(camera.matrixWorld, 0), camera);
    hint.style.transform = `translate(${ox}px, ${oy + Math.abs(ex - ox) * 1.02 + 22}px) translate(-50%, 0)`;
  }

  function placeTags() {
    kb.anchors.forEach((a, i) => {
      const [x, y] = project(a.at().applyMatrix4(kb.root.matrixWorld), kbCam);
      const tag = tags[i]!;
      tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      show(tag, kb.explode > 0.6);
    });
  }

  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = reduce ? 1 : 1 - Math.exp(-dt * 3.2);
    if (mode === "orbit" && !drag) {
      spin *= 0.94;
      yawT += spin + (reduce || hot ? 0 : dt * 0.05);
    }
    yaw = MathUtils.lerp(yaw, yawT, k);
    pitch = MathUtils.lerp(pitch, pitchT, k);
    off = MathUtils.lerp(off, offT, k);
    planet.rotation.set(pitch, yaw, 0, "XYZ");
    camera.position.copy(camPos.lerp(camPosT, k));
    camera.lookAt(look.lerp(lookT, k));
    camera.setViewOffset(width, height, -off, 0, width, height);
    tick(now / 1000);
    placeLabels();
    if (mode !== "object") return renderer.render(scene, camera);

    kbYaw = MathUtils.lerp(kbYaw, kbYawT, k);
    kb.root.rotation.set(kbPitch, kbYaw, 0, "XYZ");
    kbCam.setViewOffset(width, height, narrow ? 0 : -IO80_CARD / 2, 0, width, height);
    kb.tick(dt, now);
    renderer.render(kbScene, kbCam);
    placeTags();
  }

  // Render only while the hero is on screen.
  let visible = true;
  const run = () => renderer.setAnimationLoop(visible && !document.hidden ? frame : null);
  new IntersectionObserver(([e]) => {
    visible = e?.isIntersecting ?? false;
    last = performance.now();
    run();
  }).observe(root);
  document.addEventListener("visibilitychange", run);

  setMode("orbit");
  root.classList.add("is-live");
  run();
}
