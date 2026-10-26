import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  type Object3D,
} from "three";
import { places as placeInfo, type PlaceId } from "../../lib/places";
import { builders, prism, rand, tree, type Landmark } from "./landmarks";
import { Batch, ditherMaterial, fbm, inkLines, palette as P } from "./look";

export type Place = { id: PlaceId; n: Vector3; root: Group; anchor: Vector3 };
export const LANDMARK = 1.4;

const rad = MathUtils.DEG2RAD;
const ss = (a: number, b: number, x: number) => MathUtils.smoothstep(x, a, b);
const noRaycast = (o: Object3D) => o.traverse((c) => (c.raycast = () => {}));

export const toNormal = (lat: number, lon: number) =>
  new Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));

// How much land each place raises around itself; Silt floats above its island.
const shape: Record<PlaceId, { land: number; size: number; float?: number }> = {
  school: { land: 0.3, size: 0.38 },
  keyboards: { land: 0.34, size: 0.4 },
  oss: { land: 0.26, size: 0.24 },
  homelab: { land: 0.3, size: 0.36 },
  silt: { land: 0.24, size: 0.3, float: 0.15 },
};
const spots = (Object.keys(placeInfo) as PlaceId[]).map((id) => ({
  id,
  n: toNormal(placeInfo[id].lat * rad, placeInfo[id].lon * rad),
  ...shape[id],
}));

// Extra continents, so every side of the globe has land.
const continents = (
  [
    [-48, 20, 0.36],
    [52, -150, 0.34],
    [-6, -20, 0.26],
    [-55, -95, 0.3],
    [58, 115, 0.26],
  ] as const
).map(([lat, lon, size]) => ({ n: toNormal(lat * rad, lon * rad), size }));

const bump = (n: Vector3, centre: Vector3, size: number) => Math.exp(-((n.angleTo(centre) / size) ** 2));

// Signed fields: positive inside, zero on the edge.
function landAt(n: Vector3) {
  let f = (fbm(n, 2.2) - 0.5) * 0.6 - 0.12;
  for (const s of spots) f += s.land * bump(n, s.n, s.size);
  for (const c of continents) f += 0.24 * bump(n, c.n, c.size);
  return f;
}
const iceAt = (n: Vector3) => Math.abs(n.y) - 0.94 + (fbm(n, 5) - 0.5) * 0.09;

// Land is a thin raised layer, so the silhouette stays a clean circle.
const COAST = 1.008;
const R = COAST + 0.007;
const elev = (f: number) => COAST + 0.007 * ss(0.06, 0.22, f);
const groundAt = (n: Vector3) => elev(Math.max(0, landAt(n)));

type Layer = {
  field: (n: Vector3) => number;
  height: (f: number) => number;
  colour: (n: Vector3, f: number) => Color;
  cliff: number;
};

const tint = new Color();
const C = (hex: number) => new Color(hex);
const sand = C(P.sand),
  grass = C(P.grass),
  grass2 = C(P.grass2),
  field = C(P.field),
  snow = C(P.snow),
  iceShade = C(0xdde3e0);
const shallow = C(0x9cbdb4),
  sea = C(P.water),
  deep = C(0x5f8590);

const land: Layer = {
  field: landAt,
  height: elev,
  cliff: P.rock,
  colour: (n, f) =>
    tint
      .copy(sand)
      .lerp(grass, ss(0, 0.02, f))
      .lerp(field, ss(0.62, 0.68, fbm(n, 3.1)) * ss(0.03, 0.06, f) * 0.55)
      .lerp(grass2, ss(0.1, 0.22, f)),
};
const ice: Layer = {
  field: iceAt,
  height: () => 1.006,
  cliff: 0xc9d3d2,
  colour: (_n, f) => tint.copy(iceShade).lerp(snow, ss(0, 0.02, f)),
};

const geometry = (pos: number[], col?: number[]) => {
  const g = new BufferGeometry().setAttribute("position", new Float32BufferAttribute(pos, 3));
  return col ? g.setAttribute("color", new Float32BufferAttribute(col, 3)) : g;
};

// Clip each triangle of a fine sphere to a field so edges are smooth curves.
// Clip edges become ink outlines with a short cliff down to the sea.
function clip(shell: BufferGeometry, layer: Layer) {
  const pos = shell.getAttribute("position");
  const top: number[] = [],
    topCol: number[] = [],
    cliff: number[] = [],
    cliffCol: number[] = [],
    edge: number[] = [];
  const cc = C(layer.cliff);
  const h = layer.height(0);
  const v = [new Vector3(), new Vector3(), new Vector3()] as const;
  const f = [0, 0, 0];

  const emit = (n: Vector3, value: number) => {
    top.push(...n.clone().multiplyScalar(layer.height(value)).toArray());
    const c = layer.colour(n, value);
    topCol.push(c.r, c.g, c.b);
  };

  const wall = (a: Vector3, b: Vector3, inner: Vector3) => {
    edge.push(
      ...a
        .clone()
        .multiplyScalar(h + 0.0015)
        .toArray(),
      ...b
        .clone()
        .multiplyScalar(h + 0.0015)
        .toArray(),
    );
    const [a1, b1, a0, b0] = [
      a.clone().multiplyScalar(h),
      b.clone().multiplyScalar(h),
      a.clone().multiplyScalar(0.995),
      b.clone().multiplyScalar(0.995),
    ];
    const outward =
      b.clone().sub(a).cross(a.clone().negate()).dot(a.clone().add(b).multiplyScalar(0.5).sub(inner)) >= 0;
    const quad = outward ? [a1, b1, b0, a1, b0, a0] : [a1, b0, b1, a1, a0, b0];
    for (const p of quad) {
      cliff.push(p.x, p.y, p.z);
      cliffCol.push(cc.r, cc.g, cc.b);
    }
  };

  for (let i = 0; i < pos.count; i += 3) {
    v.forEach((p, j) => (f[j] = layer.field(p.fromBufferAttribute(pos, i + j).normalize())));
    if (f.every((x) => x < 0)) continue;

    const poly: { n: Vector3; f: number }[] = [];
    const cut: Vector3[] = [];
    for (let j = 0; j < 3; j++) {
      const k = (j + 1) % 3;
      const fa = f[j]!,
        fb = f[k]!;
      if (fa >= 0) poly.push({ n: v[j]!, f: fa });
      if (fa >= 0 === fb >= 0) continue;
      const p = v[j]!.clone()
        .lerp(v[k]!, fa / (fa - fb))
        .normalize();
      poly.push({ n: p, f: 0 });
      cut.push(p);
    }
    const [first, ...rest] = poly;
    for (let j = 0; j + 1 < rest.length; j++) for (const q of [first!, rest[j]!, rest[j + 1]!]) emit(q.n, q.f);
    if (cut.length !== 2) continue;
    const inner = poly
      .filter((q) => q.f > 0)
      .reduce((m, q) => m.add(q.n), new Vector3())
      .normalize();
    wall(cut[0]!, cut[1]!, inner);
  }
  return { top: geometry(top, topCol), cliff: geometry(cliff, cliffCol), edge: geometry(edge) };
}

function ocean() {
  const g = new IcosahedronGeometry(1, 36);
  const pos = g.getAttribute("position");
  const col = new Float32Array(pos.count * 3);
  const n = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    const f = landAt(n.fromBufferAttribute(pos, i).normalize());
    tint
      .copy(deep)
      .lerp(sea, ss(-0.2, -0.08, f))
      .lerp(shallow, ss(-0.05, -0.005, f));
    col.set([tint.r, tint.g, tint.b], i * 3);
  }
  return g.setAttribute("color", new Float32BufferAttribute(col, 3));
}

// Frame on the sphere: y = surface normal, z = due south, turned by yaw.
function frame(n: Vector3, yaw = 0) {
  const east = new Vector3(0, 1, 0).cross(n).normalize();
  const south = new Vector3().crossVectors(east, n).normalize();
  return new Matrix4().makeBasis(east, n, south).multiply(new Matrix4().makeRotationY(yaw));
}

// Walk from n along the surface by angle a, heading at yaw.
function walk(n: Vector3, yaw: number, a: number) {
  const dir = new Vector3(0, 0, 1).transformDirection(frame(n, yaw));
  return n.clone().multiplyScalar(Math.cos(a)).addScaledVector(dir, Math.sin(a)).normalize();
}

function scatter(count: number, ok: (n: Vector3, f: number) => boolean, clearance = 0.38) {
  const out: Vector3[] = [];
  for (let tries = 0; tries < count * 400 && out.length < count; tries++) {
    const n = new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    if (n.lengthSq() > 1 || n.lengthSq() < 0.01) continue;
    n.normalize();
    if (spots.some((s) => s.n.angleTo(n) < clearance) || iceAt(n) > -0.02) continue;
    if (ok(n, landAt(n))) out.push(n);
  }
  return out;
}

function placeOn(b: Batch, n: Vector3, add: (b: Batch) => void, yaw = rand() * Math.PI * 2) {
  const local = new Batch();
  add(local);
  const m = frame(n, yaw).setPosition(n.clone().multiplyScalar(groundAt(n) - 0.003));
  for (const g of local.geos) b.geos.push(g.applyMatrix4(m));
}

function mountains(b: Batch) {
  for (const start of scatter(6, (_n, f) => f > 0.14, 0.42)) {
    const heading = rand() * Math.PI * 2;
    let n = start;
    for (let k = 0; k < 7 && landAt(n) >= 0.08; k++) {
      const h = 0.035 + rand() * 0.03,
        r = 0.028 + rand() * 0.012;
      placeOn(b, n, (p) => {
        p.add(new ConeGeometry(r, h, 5).translate(0, h / 2, 0), P.rock);
        if (h > 0.048) p.add(new ConeGeometry(r * 0.42, h * 0.42, 5).translate(0, h * 0.79 + 0.0005, 0), P.snow);
      });
      n = walk(n, heading + (rand() - 0.5) * 0.8, 0.045);
    }
  }
}

function forests(b: Batch) {
  for (const centre of scatter(9, (_n, f) => f > 0.07)) {
    for (let k = 0; k < 9; k++) {
      const n = walk(centre, rand() * Math.PI * 2, rand() * 0.07);
      if (landAt(n) < 0.04) continue;
      placeOn(b, n, (p) => tree(p, 0, 0, 0, rand() > 0.3 ? "pine" : "round", 0.55 + rand() * 0.2));
    }
  }
}

function villages(b: Batch) {
  for (const centre of scatter(5, (_n, f) => f > 0.05 && f < 0.16)) {
    for (let k = 0; k < 5; k++) {
      placeOn(b, walk(centre, rand() * Math.PI * 2, rand() * 0.035), (p) =>
        p.box(0.016, 0.011, 0.012, P.cream).add(prism(0.014, 0.008, 0.018), P.brick, 0, 0.011, 0, Math.PI / 2),
      );
    }
  }
}

function turbines(planet: Group) {
  const rotors: Group[] = [];
  for (const n of scatter(7, (_n, f) => f > 0.04 && f < 0.14)) {
    const blades = new Batch();
    for (let i = 0; i < 3; i++)
      blades.add(
        new BoxGeometry(0.003, 0.025, 0.001).translate(0, 0.0125, 0),
        P.cream,
        0,
        0,
        0,
        0,
        0,
        (i * Math.PI * 2) / 3,
      );
    const rotor = new Group().add(blades.mesh(false));
    rotor.position.set(0, 0.06, 0.003);
    const t = new Group().add(new Batch().cyl(0.0012, 0.002, 0.06, 5, P.cream).mesh(false), rotor);
    t.applyMatrix4(frame(n, rand() * Math.PI * 2));
    t.position.copy(n).multiplyScalar(groundAt(n) - 0.002);
    planet.add(t);
    rotors.push(rotor);
  }
  return (t: number) => rotors.forEach((r) => (r.rotation.z = t * 2.6));
}

function boats(planet: Group) {
  const openSea = (n: Vector3, f: number) =>
    f < -0.14 && [0, 1, 2, 3, 4, 5].every((k) => landAt(walk(n, k, 0.1)) < -0.04);
  const fleet = scatter(4, openSea, 0.3).map((centre) => {
    const hull = new Batch()
      .box(0.012, 0.005, 0.03, P.cream)
      .add(prism(0.012, 0.008, 0.005).rotateX(Math.PI / 2), P.cream, 0, 0, 0.015)
      .box(0.008, 0.007, 0.008, P.brick, 0, 0.005, -0.006);
    const wake = new LineSegments(
      geometry([0, 0.001, -0.016, -0.012, 0.001, -0.05, 0, 0.001, -0.016, 0.012, 0.001, -0.05]),
      new LineBasicMaterial({ color: P.snow, transparent: true, opacity: 0.9 }),
    );
    const g = new Group().add(hull.mesh(), wake);
    planet.add(g);
    return { g, centre, speed: 0.12 + rand() * 0.1, phase: rand() * Math.PI * 2 };
  });
  const side = new Vector3();
  return (t: number) => {
    for (const { g, centre, speed, phase } of fleet) {
      const yaw = phase + t * speed;
      const n = walk(centre, yaw, 0.08);
      const ahead = walk(centre, yaw + 0.05, 0.08)
        .sub(n)
        .normalize();
      g.matrix.makeBasis(side.crossVectors(n, ahead), n, ahead).setPosition(n.multiplyScalar(1.001));
      g.matrix.decompose(g.position, g.quaternion, g.scale);
    }
  };
}

function clouds(planet: Group) {
  const b = new Batch();
  for (const n of scatter(7, () => true, 0.25)) {
    const m = frame(n, rand() * Math.PI * 2).setPosition(n.clone().multiplyScalar(1.075 + rand() * 0.02));
    for (let k = 0; k < 4; k++) {
      const puff = new IcosahedronGeometry(0.026 + rand() * 0.016, 1).scale(1.4, 0.45, 1);
      b.add(puff.translate((k - 1.5) * 0.03, rand() * 0.006, (rand() - 0.5) * 0.024).applyMatrix4(m), 0xfbf9f4);
    }
  }
  const layer = new Group().add(b.mesh(false));
  noRaycast(layer);
  planet.add(layer);
  return (t: number) => (layer.rotation.y = t * 0.012);
}

// The dock faces the nearest water and sits on the shore.
function shoreline(n: Vector3) {
  let best = { yaw: 0, a: 1 };
  for (let k = 0; k < 24; k++) {
    const yaw = (k / 24) * Math.PI * 2;
    let a = 0;
    while (a < 0.5 && landAt(walk(n, yaw, a)) > 0) a += 0.005;
    if (a < best.a) best = { yaw, a };
  }
  return { yaw: best.yaw, n: walk(n, best.yaw, Math.max(0, best.a - 0.025 * LANDMARK)) };
}

export function buildPlanet() {
  MathUtils.seededRandom(7);
  const planet = new Group();
  const shell = new IcosahedronGeometry(1, 44);
  planet.add(new Mesh(ocean(), ditherMaterial));
  for (const layer of [land, ice]) {
    const { top, cliff, edge } = clip(shell, layer);
    planet.add(new Mesh(top, ditherMaterial), new Mesh(cliff, ditherMaterial), inkLines(edge));
  }

  const outline = new MeshBasicMaterial({ color: 0x26231f, side: BackSide });
  const rim = new Mesh(new IcosahedronGeometry(1, 16), outline);
  rim.scale.setScalar(1.016);
  noRaycast(rim);
  planet.add(rim);

  const grid: number[] = [];
  const seg = (a: Vector3, b: Vector3) =>
    grid.push(...a.multiplyScalar(1.0015).toArray(), ...b.multiplyScalar(1.0015).toArray());
  for (let lat = -60; lat <= 60; lat += 30)
    for (let i = 0; i < 120; i++) seg(toNormal(lat * rad, i * 3 * rad), toNormal(lat * rad, (i + 1) * 3 * rad));
  for (let lon = 0; lon < 360; lon += 30)
    for (let i = -30; i < 30; i++) seg(toNormal(i * 3 * rad, lon * rad), toNormal((i + 1) * 3 * rad, lon * rad));
  const gridMat = new LineBasicMaterial({ color: 0x26231f, transparent: true, opacity: 0.16, depthWrite: false });
  planet.add(new LineSegments(geometry(grid), gridMat));

  const scenery = new Batch(),
    houses = new Batch();
  mountains(scenery);
  forests(scenery);
  villages(houses);
  planet.add(scenery.mesh(), houses.mesh());
  const ticks = [turbines(planet), boats(planet), clouds(planet)];

  // The places sit on a sphere of radius R, so their ground curves with it.
  const curve = (x: number, z: number) => (-LANDMARK * (x * x + z * z)) / (2 * R);
  const landmarks: Landmark[] = [];
  const places: Place[] = spots.map((s) => {
    const { n, yaw } = s.id === "oss" ? shoreline(s.n) : { n: s.n, yaw: 0 };
    const lm = builders[s.id](s.float ? () => 0 : curve);
    const lift = groundAt(n) + (s.float ?? 0);
    lm.root.applyMatrix4(frame(n, yaw));
    lm.root.scale.setScalar(LANDMARK);
    lm.root.position.copy(n).multiplyScalar(lift - 0.002);
    lm.root.traverse((o) => (o.userData["place"] = s.id));
    planet.add(lm.root);
    landmarks.push(lm);
    return { id: s.id, n, root: lm.root, anchor: n.clone().multiplyScalar(lift + 0.11) };
  });

  const silt = places.find((p) => p.id === "silt")!;
  const siltRest = silt.root.position.clone();

  function tick(t: number) {
    for (const lm of landmarks) lm.tick?.(t);
    for (const f of ticks) f(t);
    silt.root.position.copy(siltRest).addScaledVector(silt.n, Math.sin(t * 1.1) * 0.01);
  }

  function setInkColor(c: Color) {
    outline.color.copy(c);
    gridMat.color.copy(c);
  }

  return { planet, places, tick, setInkColor };
}
