// One model per place, shared by the globe and the section dioramas. Builders
// take the ground height under a point: curved on the globe, flat in a diorama.
import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  MathUtils,
  Shape,
  TorusGeometry,
} from "three";
import type { PlaceId } from "../../lib/places";
import { Batch, inkLines, noise, palette as P } from "./look";

export type Ground = (x: number, z: number) => number;
export type Landmark = { root: Group; tick?: (t: number) => void };

export const rand = () => MathUtils.seededRandom();

export function prism(w: number, h: number, d: number) {
  const s = new Shape()
    .moveTo(-w / 2, 0)
    .lineTo(w / 2, 0)
    .lineTo(0, h)
    .closePath();
  return new ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
}

export function tree(b: Batch, x: number, y: number, z: number, kind: "pine" | "round", s = 1) {
  b.add(new CylinderGeometry(0.004 * s, 0.005 * s, 0.032 * s, 5).translate(0, 0.012 * s, 0), P.trunk, x, y, z);
  if (kind === "round") {
    b.add(
      new IcosahedronGeometry(0.024 * s, 0).translate(0, 0.046 * s, 0),
      rand() > 0.5 ? P.pine2 : P.grass2,
      x,
      y,
      z,
      rand() * 3,
    );
    return;
  }
  b.add(new ConeGeometry(0.021 * s, 0.05 * s, 6).translate(0, 0.045 * s, 0), P.pine, x, y, z);
  b.add(new ConeGeometry(0.015 * s, 0.04 * s, 6).translate(0, 0.07 * s, 0), P.pine, x, y, z, 0.5);
}

const lines = (pts: number[], mat?: LineBasicMaterial) =>
  inkLines(new BufferGeometry().setAttribute("position", new Float32BufferAttribute(pts, 3)), mat);

function windows(d: Batch, xs: readonly number[], y: number, z: number, w = 0.011, h = 0.018) {
  const f = Math.sign(z);
  for (const x of xs) {
    d.box(w, h, 0.002, P.cream, x, y, z);
    d.box(w - 0.004, h - 0.005, 0.002, P.slate, x, y + 0.0025, z + f * 0.0012);
  }
}

function trees(b: Batch, g: Ground, list: readonly (readonly [number, number, "pine" | "round", number])[]) {
  for (const [x, z, kind, s] of list) tree(b, x, g(x, z) - 0.004, z, kind, s);
}

// Exeter's Academy Building, more or less.
function school(g: Ground): Landmark {
  const b = new Batch(),
    d = new Batch();
  const W = 0.22,
    D = 0.085,
    H = 0.072,
    front = D / 2 + 0.001;
  b.box(W + 0.012, 0.03, D + 0.012, P.stone, 0, -0.024, 0);
  b.box(W, H, D, P.brick, 0, 0.006, 0);
  b.box(W + 0.008, 0.006, D + 0.008, P.cream, 0, 0.006 + H, 0);
  b.add(prism(D + 0.008, 0.045, W + 0.008), P.slate, 0, 0.012 + H, 0, Math.PI / 2);
  for (const x of [-0.085, 0.085]) b.box(0.012, 0.03, 0.016, P.brick, x, 0.03 + H, 0);

  for (let i = 0; i < 3; i++)
    b.box(0.09 - i * 0.008, 0.005, 0.03 - i * 0.006, P.stone, 0, 0.001 + i * 0.005, D / 2 + 0.016 - i * 0.003);
  for (const x of [-0.033, -0.011, 0.011, 0.033]) d.cyl(0.004, 0.004, 0.05, 8, P.cream, x, 0.016, D / 2 + 0.018);
  b.box(0.082, 0.009, 0.026, P.cream, 0, 0.066, D / 2 + 0.012);
  b.add(prism(0.082, 0.022, 0.026), P.cream, 0, 0.075, D / 2 + 0.012);
  d.box(0.018, 0.034, 0.002, P.slate, 0, 0.016, front);

  b.box(0.034, 0.02, 0.034, P.cream, 0, 0.05 + H, 0);
  b.cyl(0.014, 0.014, 0.024, 8, P.cream, 0, 0.07 + H, 0);
  b.add(new ConeGeometry(0.017, 0.022, 8).translate(0, 0.011, 0), P.slate, 0, 0.094 + H, 0);
  d.cyl(0.0015, 0.0015, 0.02, 4, P.ochre, 0, 0.114 + H, 0);
  const face = new CylinderGeometry(0.007, 0.007, 0.002, 12).rotateX(Math.PI / 2);
  for (const [x, z, ry] of [
    [0, 0.018, 0],
    [0, -0.018, 0],
    [0.018, 0, Math.PI / 2],
    [-0.018, 0, Math.PI / 2],
  ] as const)
    d.add(face.clone(), P.cream, x, 0.06 + H, z, ry);

  const cols = [-0.095, -0.074, -0.053, 0.053, 0.074, 0.095];
  const back = [...cols, -0.032, -0.011, 0.011, 0.032];
  windows(d, cols, 0.016, front);
  windows(d, [...cols, -0.022, 0, 0.022], 0.046, front);
  windows(d, back, 0.016, -front);
  windows(d, back, 0.046, -front);

  for (const s of [-1, 1]) {
    b.box(0.06, 0.012, 0.01, P.pine2, s * 0.08, g(s * 0.08, 0.06) - 0.004, D / 2 + 0.012);
    d.cyl(0.0018, 0.0018, 0.04, 4, P.charcoal, s * 0.03, g(s * 0.03, 0.13), 0.13);
    d.box(0.008, 0.008, 0.008, P.cream, s * 0.03, g(s * 0.03, 0.13) + 0.04, 0.13);
    b.box(0.03, 0.006, 0.01, P.wood, s * 0.07, g(s * 0.07, 0.16) + 0.006, 0.16);
    b.box(0.03, 0.012, 0.002, P.wood, s * 0.07, g(s * 0.07, 0.165) + 0.006, 0.165);
  }
  for (let z = D / 2 + 0.035; z < 0.18; z += 0.016) d.box(0.028, 0.004, 0.012, P.sand, 0, g(0, z) - 0.002, z);
  for (let x = -0.13; x <= 0.13; x += 0.016) {
    if (Math.abs(x) < 0.02) continue;
    d.box(0.012, 0.004, 0.02, P.sand, x, g(x, 0.15) - 0.002, 0.15);
  }
  trees(b, g, [
    [-0.15, 0.1, "round", 1.1],
    [0.15, 0.1, "round", 1.1],
    [-0.165, -0.04, "round", 1.2],
    [0.17, -0.03, "round", 1.15],
    [-0.1, -0.11, "round", 1],
    [0.08, -0.12, "round", 1.05],
    [-0.12, 0.2, "round", 0.9],
    [0.12, 0.21, "round", 0.95],
  ]);

  const root = new Group().add(b.mesh(), d.mesh(false));
  return { root };
}

// Where the keyboards get built: shelves of parts inside, a keyboard mid-build
// on the bench out front.
function workshop(g: Ground): Landmark {
  const b = new Batch(),
    d = new Batch();
  const W = 0.17,
    D = 0.11,
    H = 0.07,
    t = 0.006;
  b.box(W + 0.02, 0.03, D + 0.03, P.stone, 0, -0.024, 0.005);
  b.box(W, H, t, P.cream, 0, 0.006, -D / 2 + t / 2);
  for (const s of [-1, 1]) {
    b.box(t, H, D, P.cream, s * (W / 2 - t / 2), 0.006, 0);
    b.box(0.035, H, t, P.cream, s * (W / 2 - 0.0175), 0.006, D / 2 - t / 2);
  }
  b.box(W - 0.07, 0.016, t, P.cream, 0, 0.006 + H - 0.016, D / 2 - t / 2);
  b.box(W - 0.07, 0.012, 0.012, P.slate, 0, 0.006 + H - 0.03, D / 2 - 0.004);
  d.box(0.002, 0.024, 0.04, P.glass, W / 2 + 0.001, 0.03, -0.01);

  b.box(W + 0.012, 0.008, D + 0.012, P.slate, 0, 0.006 + H, 0);
  b.box(0.03, 0.008, 0.05, P.glass, -0.06, 0.014 + H, 0);
  for (const x of [-0.015, 0.03, 0.065]) {
    for (const z of [-0.03, 0.022]) {
      b.add(new BoxGeometry(0.04, 0.003, 0.04), P.panel, x, 0.022 + H, z, 0, -0.3);
      d.box(0.003, 0.012, 0.003, P.charcoal, x, 0.014 + H, z + 0.012);
    }
  }

  b.box(0.12, 0.004, 0.016, P.wood, 0, 0.04, -D / 2 + 0.014);
  for (const [x, hex] of [
    [-0.045, P.brick],
    [-0.025, P.water],
    [-0.005, P.ochre],
    [0.02, P.grass2],
    [0.042, P.water],
  ] as const)
    d.box(0.014, 0.01, 0.012, hex, x, 0.044, -D / 2 + 0.014);

  const bz = D / 2 + 0.04,
    by = g(0, bz);
  b.box(0.12, 0.004, 0.036, P.wood, 0.005, by + 0.026, bz);
  for (const x of [-0.05, 0.06]) for (const z of [-0.014, 0.014]) d.box(0.004, 0.026, 0.004, P.wood, x, by, bz + z);
  b.box(0.082, 0.006, 0.028, P.charcoal, -0.008, by + 0.03, bz);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 15; c++) {
      if (r === 4 && c > 3 && c < 10) continue;
      const hex = r === 0 && c === 0 ? P.brick : r === 4 || c === 14 ? P.slate : P.cream;
      d.box(0.0042, 0.003, 0.0042, hex, -0.0455 + c * 0.0053, by + 0.036, bz - 0.0106 + r * 0.0053);
    }
  }
  d.box(0.03, 0.003, 0.0042, P.cream, -0.008, by + 0.036, bz + 0.0106);
  d.box(0.002, 0.03, 0.002, P.ochre, 0.05, by + 0.03, bz - 0.01).box(
    0.016,
    0.006,
    0.008,
    P.ochre,
    0.045,
    by + 0.058,
    bz - 0.006,
  );
  d.box(0.012, 0.004, 0.01, P.slate, 0.05, by + 0.03, bz + 0.008).box(
    0.022,
    0.0015,
    0.0015,
    P.cream,
    0.042,
    by + 0.036,
    bz + 0.008,
  );
  b.box(0.014, 0.016, 0.014, P.wood, -0.008, g(0, bz + 0.03), bz + 0.032);

  const sx = -0.11,
    sz = 0.085,
    sy = g(sx, sz);
  d.cyl(0.002, 0.002, 0.05, 4, P.charcoal, sx, sy, sz);
  b.add(
    new CylinderGeometry(0.015, 0.022, 0.016, 4, 1).rotateY(Math.PI / 4).translate(0, 0.008, 0),
    P.ochre,
    sx,
    sy + 0.05,
    sz,
  );
  b.box(0.013, 0.002, 0.013, P.cream, sx, sy + 0.066, sz);
  for (const s of [-1, 1]) {
    b.box(0.012, 0.012, 0.03, P.wood, s * 0.1, g(s * 0.1, 0) - 0.002, 0);
    for (const o of [-0.008, 0.008])
      b.add(new IcosahedronGeometry(0.008, 0), P.pine2, s * 0.1, g(s * 0.1, 0) + 0.016, o);
  }
  for (const [y, z] of [
    [0, -0.03],
    [0, -0.005],
    [0.022, -0.018],
  ] as const)
    b.box(0.022, 0.022, 0.022, P.wood, 0.125, g(0.125, z) + y - 0.002, z);
  for (const x of [0.098, 0.132]) d.add(new TorusGeometry(0.011, 0.0015, 4, 14), P.charcoal, x, g(x, 0.1) + 0.011, 0.1);
  d.box(0.036, 0.002, 0.002, P.brick, 0.115, g(0.115, 0.1) + 0.02, 0.1);
  for (let z = D / 2 + 0.085; z < 0.17; z += 0.016) d.box(0.03, 0.004, 0.012, P.sand, 0.07, g(0.07, z) - 0.002, z);
  trees(b, g, [
    [-0.15, -0.04, "pine", 1.1],
    [-0.13, -0.1, "pine", 0.9],
    [0.16, -0.06, "round", 1.1],
    [0.15, 0.16, "round", 0.9],
    [-0.16, 0.18, "pine", 1],
  ]);

  return { root: new Group().add(b.mesh(), d.mesh(false)) };
}

// Patches shipped upstream: warehouse, containers, pier, crane, lighthouse, boat.
function dock(g: Ground): Landmark {
  const b = new Batch(),
    d = new Batch();
  b.box(0.09, 0.05, 0.06, P.cream, -0.02, g(-0.02, -0.08) - 0.01, -0.08);
  b.add(prism(0.068, 0.025, 0.094), P.slate, -0.02, g(-0.02, -0.08) + 0.04, -0.08, Math.PI / 2);
  d.box(0.03, 0.03, 0.002, P.slate, -0.02, g(-0.02, -0.05) - 0.004, -0.0495);
  const containers = [
    [0, 0, P.brick, 0],
    [1, 0, P.water, 0],
    [0, 1, P.panel, 0],
    [1, 1, P.grass2, 0],
    [0, 2, P.ochre, 0],
    [0, 0, P.water, 1],
  ] as const;
  for (const [i, j, hex, up] of containers) {
    const x = 0.06 + i * 0.036,
      z = -0.1 + j * 0.022;
    b.box(0.034, 0.016, 0.019, hex, x, g(x, z) - 0.002 + up * 0.016, z);
  }

  for (let z = -0.02; z < 0.25; z += 0.012) d.box(0.05, 0.004, 0.01, P.wood, 0, g(0, z) + 0.002, z);
  for (let z = 0; z < 0.25; z += 0.06)
    for (const s of [-1, 1]) b.cyl(0.003, 0.003, 0.05, 5, P.dirt, s * 0.024, g(0, z) - 0.045, z);
  for (const z of [0.08, 0.16, 0.235]) d.cyl(0.003, 0.004, 0.008, 6, P.charcoal, 0.02, g(0.02, z) + 0.006, z);

  for (const s of [-1, 1]) for (const z of [0.06, 0.1]) b.box(0.006, 0.12, 0.006, P.ochre, s * 0.032, g(0, z), z);
  b.box(0.074, 0.008, 0.05, P.ochre, 0, g(0, 0.08) + 0.12, 0.08);
  const hook = new Group().add(
    lines([0, 0, 0, 0, -0.045, 0]),
    new Batch().box(0.03, 0.014, 0.017, P.brick, 0, -0.06, 0).mesh(),
  );
  const hookY = g(0, 0.08) + 0.12;
  hook.position.set(0, hookY, 0.08);

  const lx = 0.045,
    lz = 0.24,
    ly = g(lx, lz) - 0.01;
  b.cyl(0.014, 0.017, 0.03, 10, P.cream, lx, ly, lz)
    .cyl(0.012, 0.014, 0.025, 10, P.brick, lx, ly + 0.03, lz)
    .cyl(0.011, 0.012, 0.02, 10, P.cream, lx, ly + 0.055, lz);
  b.cyl(0.01, 0.01, 0.014, 8, P.ochre, lx, ly + 0.075, lz);
  b.add(new ConeGeometry(0.014, 0.016, 8).translate(0, 0.008, 0), P.slate, lx, ly + 0.089, lz);

  const hull = new Batch()
    .box(0.03, 0.012, 0.09, P.brick)
    .add(prism(0.03, 0.03, 0.012).rotateX(Math.PI / 2), P.brick, 0, 0, 0.045)
    .box(0.03, 0.003, 0.09, P.cream, 0, 0.012)
    .box(0.022, 0.022, 0.018, P.cream, 0, 0.015, -0.03)
    .box(0.024, 0.004, 0.02, P.slate, 0, 0.037, -0.03)
    .box(0.022, 0.012, 0.015, P.water, 0, 0.015, 0)
    .box(0.022, 0.012, 0.015, P.ochre, 0, 0.015, 0.02);
  const boat = new Group().add(hull.mesh());
  const boatY = g(-0.05, 0.16) - 0.012;
  boat.position.set(-0.05, boatY, 0.16);

  return {
    root: new Group().add(b.mesh(), d.mesh(false), hook, boat),
    tick: (t) => {
      hook.position.y = hookY + Math.sin(t * 0.8) * 0.012;
      boat.position.y = boatY + Math.sin(t * 1.6) * 0.002;
      boat.rotation.z = Math.sin(t * 1.3) * 0.04;
    },
  };
}

// A laptop running Kubernetes, off the grid.
function homelab(g: Ground): Landmark {
  const b = new Batch(),
    d = new Batch();
  const cx = -0.04,
    cz = -0.04,
    cy = g(cx, cz);
  b.box(0.095, 0.075, 0.07, P.stone, cx, cy - 0.025, cz);
  b.box(0.09, 0.05, 0.065, P.wood, cx, cy + 0.006, cz);
  b.add(prism(0.08, 0.035, 0.1), P.grass2, cx, cy + 0.056, cz, Math.PI / 2);
  d.box(0.016, 0.03, 0.002, P.slate, cx - 0.02, cy + 0.006, cz + 0.0335);
  windows(d, [cx + 0.018], cy + 0.024, cz + 0.0335, 0.02, 0.016);
  d.cyl(0.0015, 0.0015, 0.012, 4, P.cream, cx - 0.03, cy + 0.07, cz + 0.02);
  d.add(new CylinderGeometry(0.012, 0.003, 0.006, 10).rotateX(-0.9), P.cream, cx - 0.03, cy + 0.084, cz + 0.022);

  const ly = g(cx, 0.02);
  b.box(0.11, 0.006, 0.04, P.wood, cx, g(cx, 0.015), 0.015);
  b.box(0.034, 0.016, 0.022, P.wood, cx + 0.025, ly, 0.02);
  d.box(0.02, 0.002, 0.013, P.slate, cx + 0.025, ly + 0.016, 0.022);
  d.add(
    new BoxGeometry(0.02, 0.013, 0.0015).translate(0, 0.0065, 0),
    P.slate,
    cx + 0.025,
    ly + 0.017,
    0.0155,
    0,
    -0.25,
  );
  d.add(
    new BoxGeometry(0.017, 0.01, 0.0015).translate(0, 0.0065, 0.0012),
    P.teal,
    cx + 0.025,
    ly + 0.017,
    0.0155,
    0,
    -0.25,
  );
  b.box(0.012, 0.012, 0.012, P.wood, cx + 0.025, g(cx, 0.042), 0.042);

  const rx = 0.04,
    rz = -0.05,
    ry = g(rx, rz);
  b.box(0.03, 0.06, 0.03, P.charcoal, rx, ry - 0.004, rz);
  b.add(new BoxGeometry(0.05, 0.003, 0.05), P.panel, rx, ry + 0.07, rz, 0, -0.2);
  for (let i = 0; i < 15; i++) {
    const row = Math.floor(i / 3),
      col = i % 3;
    d.box(
      0.003,
      0.002,
      0.002,
      i === 5 ? P.orange : P.teal,
      rx - 0.006 + col * 0.006,
      ry + 0.01 + row * 0.009,
      rz + 0.016,
    );
  }
  const cable = lines([cx + 0.045, cy + 0.01, cz, rx - 0.015, ry + 0.01, rz]);

  const px = 0.05,
    pz = 0.06,
    py = g(px, pz);
  for (const [x, z] of [
    [-0.035, -0.025],
    [0.035, -0.025],
    [-0.035, 0.025],
    [0.035, 0.025],
  ] as const)
    d.box(0.004, z > 0 ? 0.048 : 0.068, 0.004, P.cream, px + x, py - 0.004, pz + z);
  for (const x of [-0.019, 0.019])
    for (const z of [-0.014, 0.014])
      b.add(new BoxGeometry(0.036, 0.003, 0.026), P.panel, px + x, py + 0.06, pz + z, 0, -0.32);
  for (const x of [-0.02, 0, 0.02])
    b.box(0.014, 0.018, 0.012, P.grass2, px + x, py, pz).box(0.006, 0.003, 0.004, P.cream, px + x, py + 0.018, pz);

  const tx = 0.13,
    tz = -0.07,
    ty = g(tx, tz);
  b.cyl(0.0025, 0.004, 0.15, 6, P.cream, tx, ty - 0.004, tz).box(
    0.008,
    0.008,
    0.02,
    P.cream,
    tx,
    ty + 0.142,
    tz - 0.004,
  );
  const blades = new Batch();
  for (let i = 0; i < 3; i++)
    blades.add(
      new BoxGeometry(0.006, 0.06, 0.0015).translate(0, 0.03, 0),
      P.cream,
      0,
      0,
      0,
      0,
      0,
      (i * Math.PI * 2) / 3,
    );
  const rotor = new Group().add(blades.mesh());
  rotor.position.set(tx, ty + 0.146, tz + 0.008);

  for (const z of [0.11, 0.135]) d.box(0.06, 0.006, 0.012, P.dirt, -0.06, g(-0.06, z) - 0.002, z);
  for (let i = 0; i < 6; i++)
    d.add(
      new IcosahedronGeometry(0.005, 0),
      i % 2 ? P.grass2 : P.pine2,
      -0.085 + i * 0.01,
      g(-0.06, 0.11) + 0.007,
      0.11 + (i % 2) * 0.025,
    );
  trees(b, g, [
    [-0.14, -0.08, "pine", 1.15],
    [-0.15, 0.03, "pine", 1],
    [-0.11, -0.13, "pine", 0.9],
    [0.13, 0.08, "round", 1],
    [0.03, -0.13, "pine", 1.05],
  ]);

  return { root: new Group().add(b.mesh(), d.mesh(false), cable, rotor), tick: (t) => (rotor.rotation.z = t * 2.2) };
}

// A floating chunk from the game engine, with its chunk boundary drawn in.
function silt(): Landmark {
  const s = 0.016;
  const b = new Batch(),
    d = new Batch();
  const height = (x: number, z: number) => 1 + Math.round(noise(x * 0.7 + 3, 0, z * 0.7) * 2);
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      const r = Math.hypot(x, z);
      if (r > 3.3) continue;
      const top = height(x, z);
      for (let y = -Math.max(1, Math.round(4.2 - r * 1.1)); y <= top; y++) {
        const ore = y < -1 && noise(x * 2, y * 2, z * 2) > 0.72;
        const hex = y === top ? P.grass : y >= top - 1 ? P.dirt : ore ? P.ochre : P.stone;
        (y === top ? b : d).box(s, s, s, hex, x * s, y * s, z * s);
      }
    }
  }
  for (const [x, z] of [
    [-1, -1],
    [2, 1],
  ] as const) {
    const top = height(x, z) + 1;
    for (let y = top; y < top + 3; y++) d.box(s, s, s, P.trunk, x * s, y * s, z * s);
    for (const [ox, oy, oz] of [
      [0, 3, 0],
      [1, 2, 0],
      [-1, 2, 0],
      [0, 2, 1],
      [0, 2, -1],
      [0, 4, 0],
      [1, 3, 0],
      [0, 3, 1],
    ] as const)
      b.box(s, s, s, P.pine2, (x + ox) * s, (top + oy) * s, (z + oz) * s);
  }
  for (let y = 1; y > -9; y--) d.box(s * 0.9, s, s * 0.6, P.water, 3 * s, y * s, 0);
  for (const [y, o] of [
    [-10, 0.3],
    [-11.5, -0.2],
    [-13, 0.1],
  ] as const)
    d.box(s * 0.5, s * 0.5, s * 0.5, P.water, (3 + o) * s, y * s, 0);
  for (const [x, y, z] of [
    [4.6, 1, 1.5],
    [-4.3, -1.5, 1],
    [0.5, -6.5, -1.5],
    [2, 4, -3.8],
    [-3, 3, 3],
  ] as const)
    b.box(s, s, s, P.dirt, x * s, y * s, z * s);

  const h = 4 * s,
    lo = -7 * s,
    hi = 5 * s;
  const pts: number[] = [];
  for (const [x, z] of [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ] as const)
    pts.push(x, lo, z, x, hi, z);
  for (const y of [lo, hi]) pts.push(-h, y, -h, h, y, -h, h, y, -h, h, y, h, h, y, h, -h, y, h, -h, y, h, -h, y, -h);
  const bounds = lines(pts, new LineBasicMaterial({ color: 0x26231f, transparent: true, opacity: 0.35 }));
  bounds.userData["ink"] = false;

  return { root: new Group().add(b.mesh(), d.mesh(), bounds) };
}

export const builders: Record<PlaceId, (g: Ground) => Landmark> = {
  school,
  keyboards: workshop,
  oss: dock,
  homelab,
  silt,
};
