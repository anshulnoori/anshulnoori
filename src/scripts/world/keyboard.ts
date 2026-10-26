// IO80 in layers (case, PCB, switches, keycaps) that slide apart when exploded.
// Key positions come from the shared layout, or from the real board once
// scripts/pcb.mjs has exported src/data/pcb/io80.json and public/pcb/io80.webp.
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  TextureLoader,
  Vector3,
  type BufferGeometry,
} from "three";
import { depth, fingerprint, keys as reference, knob, width } from "../../lib/tkl";
import { Batch, imageMaterial, ink, inkHot, paint, palette as P, part, setInk } from "./look";

type Point = { x: number; y: number };
type Board = {
  board: { w: number; h: number };
  keys: (Point & { w: number; vertical: boolean })[];
  encoder?: Point;
  fingerprint?: Point;
};
type Slot = Point & { w: number; vertical: boolean; code: string };

const exported = import.meta.glob<Board>("../../data/pcb/io80.json", { eager: true, import: "default" });
const real = Object.values(exported)[0];

const U = 0.2;
const MODIFIER =
  /^(Escape|Tab|CapsLock|Shift|Control|Meta|Alt|ContextMenu|Backspace|Enter|Arrow|Insert|Home|PageUp|PageDown|Delete|End|PrintScreen|ScrollLock|F\d)/;
const PRESS_MS = 140;

const centred = (p: Point, w: number, h: number): Point => ({ x: p.x - w / 2, y: p.y - h / 2 });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Key centres in key units around the board centre.
function layout() {
  const ref: Slot[] = reference.map((k) => ({
    ...centred({ x: k.x + k.w / 2, y: k.y + 0.5 }, width, depth),
    w: k.w,
    vertical: false,
    code: k.code,
  }));
  const refKnob = centred({ x: knob.x + 0.5, y: knob.y + 0.5 }, width, depth);
  const refFp = centred({ x: fingerprint.x + 0.5, y: fingerprint.y + 0.5 }, width, depth);
  if (!real) return { W: width, D: depth, slots: ref, knob: refKnob, fp: refFp };

  // Each real switch takes the code of the nearest unclaimed reference key.
  const { w: W, h: D } = real.board;
  const free = [...ref];
  const slots = real.keys.map((k) => {
    const c = centred(k, W, D);
    const i = free.reduce((best, r, j) => (dist(r, c) < dist(free[best]!, c) ? j : best), 0);
    const code = free.splice(i, 1)[0]?.code ?? "";
    return { ...c, w: k.w, vertical: k.vertical, code };
  });
  return {
    W,
    D,
    slots,
    knob: real.encoder && centred(real.encoder, W, D),
    fp: real.fingerprint && centred(real.fingerprint, W, D),
  };
}

const capColour = (code: string) => (code === "Escape" ? P.brick : MODIFIER.test(code) ? P.slate : P.cream);

export function buildKeyboard() {
  const L = layout();
  const W = L.W * U,
    D = L.D * U;
  const knobAt = L.knob && new Vector3(L.knob.x * U, 0, L.knob.y * U);
  const fpAt = L.fp && new Vector3(L.fp.x * U, 0, L.fp.y * U);
  const keys = L.slots.filter((s) => !knobAt || Math.hypot(s.x * U - knobAt.x, s.y * U - knobAt.z) > U * 0.4);

  const wall = 0.09;
  const shell = new Batch().box(W + 2 * wall, 0.08, D + 2 * wall, P.charcoal);
  for (const [w, d, x, z] of [
    [W + 2 * wall, wall, 0, -(D + wall) / 2],
    [W + 2 * wall, wall, 0, (D + wall) / 2],
    [wall, D, -(W + wall) / 2, 0],
    [wall, D, (W + wall) / 2, 0],
  ] as const)
    shell.box(w, 0.2, d, P.charcoal, x, 0.08, z);
  const caseLayer = new Group().add(shell.mesh());

  const pcbLayer = new Group().add(new Batch().box(W - 0.02, 0.035, D - 0.02, P.pcb).mesh());
  if (real) {
    const render = new Mesh(
      new PlaneGeometry(W - 0.02, D - 0.02).rotateX(-Math.PI / 2),
      imageMaterial(new TextureLoader().load("/pcb/io80.webp")),
    );
    render.position.y = 0.036;
    pcbLayer.add(render);
  }

  // Gateron Oil King V2: smoky bottom housing, black top housing, black cross stem.
  const bottoms = new Batch(),
    tops = new Batch(),
    stems = new Batch();
  for (const k of keys) {
    const x = k.x * U,
      z = k.y * U;
    bottoms.box(0.14, 0.035, 0.14, P.oilBottom, x, 0, z);
    tops.box(0.13, 0.05, 0.13, P.oilTop, x, 0.035, z);
    stems.box(0.044, 0.045, 0.012, P.oilStem, x, 0.0825, z).box(0.012, 0.045, 0.044, P.oilStem, x, 0.0825, z);
  }
  const switchLayer = new Group().add(bottoms.mesh(), tops.mesh(), stems.mesh(false));
  if (fpAt) {
    const reader = new Batch()
      .box(0.15, 0.03, 0.15, P.cream, fpAt.x, 0.055, fpAt.z)
      .cyl(0.045, 0.045, 0.012, 16, P.ochre, fpAt.x, 0.084, fpAt.z);
    switchLayer.add(reader.mesh());
  }

  const capLayer = new Group();
  const caps = new Map<string, Mesh>();
  const capGeo = new Map<string, BufferGeometry>();
  for (const k of keys) {
    const hex = capColour(k.code);
    const [cw, cd] = k.vertical ? [U - 0.03, k.w * U - 0.03] : [k.w * U - 0.03, U - 0.03];
    const id = `${cw}:${cd}:${hex}`;
    const geo = capGeo.get(id) ?? paint(new BoxGeometry(cw, 0.11, cd), hex);
    capGeo.set(id, geo);
    const cap = part(geo, hex);
    cap.position.set(k.x * U, 0.055, k.y * U);
    capLayer.add(cap);
    if (k.code) caps.set(k.code, cap);
  }
  const knobTop = part(new CylinderGeometry(0.06, 0.06, 0.01, 18), P.ochre, false);
  if (knobAt) {
    capLayer.add(new Batch().cyl(0.085, 0.085, 0.13, 18, P.charcoal, knobAt.x, 0, knobAt.z).mesh(), knobTop);
    knobTop.position.set(knobAt.x, 0.135, knobAt.z);
  }

  const layers = [
    { g: caseLayer, y: 0, ex: 0 },
    { g: pcbLayer, y: 0.1, ex: 0.4 },
    { g: switchLayer, y: 0.14, ex: 0.85 },
    { g: capLayer, y: 0.27, ex: 1.4 },
  ] as const;
  const [, pcb, switches, keycaps] = layers;
  const root = new Group().add(...layers.map((l) => l.g));
  root.position.y = -0.4;

  const right = W / 2 + 0.12,
    left = -W / 2 - 0.1;
  const anchors = [
    { label: "Keycaps", at: () => new Vector3(left, keycaps.g.position.y + 0.1, -D / 4) },
    { label: "Gateron Oil King V2", at: () => new Vector3(left, switches.g.position.y + 0.08, 0) },
    { label: "PCB · per-key RGB", at: () => new Vector3(right, pcb.g.position.y + 0.02, D / 4) },
    { label: "Case", at: () => new Vector3(left, 0.15, D / 2) },
    ...(knobAt
      ? [{ label: "Volume knob", at: () => new Vector3(knobAt.x, keycaps.g.position.y + 0.15, knobAt.z) }]
      : []),
    ...(fpAt
      ? [{ label: "Fingerprint reader", at: () => new Vector3(fpAt.x, switches.g.position.y + 0.1, fpAt.z) }]
      : []),
  ];

  let explode = 0,
    target = 0;
  const pressed = new Map<Mesh, number>();

  function tick(dt: number, now: number) {
    explode += (target - explode) * Math.min(1, dt * 6);
    for (const l of layers) l.g.position.y = l.y + l.ex * explode;
    knobTop.rotation.y = now * 0.0006;
    for (const [cap, t] of pressed) {
      const down = now - t < PRESS_MS;
      cap.position.y = down ? 0.005 : 0.055;
      if (down) continue;
      setInk(cap, ink);
      pressed.delete(cap);
    }
  }

  function press(code: string, now: number) {
    const cap = caps.get(code);
    if (!cap) return false;
    setInk(cap, inkHot);
    pressed.set(cap, now);
    return true;
  }

  return {
    root,
    anchors,
    tick,
    press,
    setExploded: (on: boolean) => (target = on ? 1 : 0),
    get explode() {
      return explode;
    },
  };
}
