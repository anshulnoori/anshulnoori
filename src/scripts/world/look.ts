import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Color,
  ColorManagement,
  EdgesGeometry,
  Euler,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type Object3D,
  type Texture,
} from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Palette hex values go to the shader unconverted.
ColorManagement.enabled = false;

export const palette = {
  grass: 0x97a271,
  grass2: 0x828f64,
  field: 0xc9aa68,
  sand: 0xd9c89e,
  rock: 0xa89f8c,
  water: 0x7c9ea3,
  pine: 0x56634e,
  pine2: 0x76825a,
  trunk: 0x6e5440,
  brick: 0xb35f45,
  cream: 0xefe6d2,
  snow: 0xf4f1ea,
  slate: 0x4d5257,
  charcoal: 0x3a3835,
  ochre: 0xc9a24a,
  panel: 0x4b5868,
  glass: 0xb8c8c4,
  wood: 0x8f7052,
  dirt: 0x8b6a4d,
  stone: 0x8e8a82,
  pcb: 0x41594a,
  teal: 0x7fb3b0,
  // Gateron Oil King V2: black nylon top, smoky Ink bottom, black POM stem.
  oilTop: 0x2b2a28,
  oilBottom: 0x46423d,
  oilStem: 0x1f1e1c,
  orange: 0xffa133,
} as const;

export const uniforms = {
  uLight: { value: new Vector3(-0.75, 0.55, 0.45).normalize() },
  uCell: { value: 1 },
  uPaper: { value: new Color(0xf1ede4) },
};

const bayer = /* glsl */ `
  uniform float uCell;
  uniform vec3 uPaper;
  const float B[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  float bayer() {
    ivec2 p = ivec2(mod(floor(gl_FragCoord.xy / uCell), 4.0));
    return (B[p.y * 4 + p.x] + 0.5) / 16.0;
  }`;

// Flat shading quantised to three tones with a 4x4 ordered dither.
export const ditherMaterial = new ShaderMaterial({
  vertexColors: true,
  uniforms,
  vertexShader: /* glsl */ `
    varying vec3 vColor;
    varying vec3 vWorld;
    void main() {
      vColor = color;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uLight;
    varying vec3 vColor;
    varying vec3 vWorld;
    ${bayer}
    void main() {
      vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
      float t = clamp(0.06 + 1.05 * max(dot(n, uLight), 0.0), 0.0, 1.0);
      float q = clamp(floor(t * 3.0 + bayer()) / 3.0, 0.0, 1.0);
      vec3 shade = vColor * vec3(0.5, 0.52, 0.62);
      vec3 lit = mix(vColor, uPaper, 0.22);
      gl_FragColor = vec4(q < 0.5 ? mix(shade, vColor, q * 2.0) : mix(vColor, lit, q * 2.0 - 1.0), 1.0);
    }`,
});

// The same dither over an image, posterised per channel.
export const imageMaterial = (map: Texture) =>
  new ShaderMaterial({
    uniforms: { ...uniforms, uMap: { value: map } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec2 vUv;
      ${bayer}
      void main() {
        vec4 s = texture2D(uMap, vUv);
        if (s.a < 0.5) discard;
        vec3 c = clamp(floor(s.rgb * 5.0 + bayer()) / 5.0, 0.0, 1.0);
        gl_FragColor = vec4(mix(c, uPaper, 0.08), 1.0);
      }`,
  });

export const ink = new LineBasicMaterial({ color: 0x26231f });
export const inkHot = new LineBasicMaterial({ color: palette.orange });

export function paint<T extends BufferGeometry>(geo: T, hex: number): T {
  const { r, g, b } = new Color(hex);
  const n = geo.getAttribute("position").count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([r, g, b], i * 3);
  geo.setAttribute("color", new Float32BufferAttribute(a, 3));
  return geo;
}

export function inkLines(geo: BufferGeometry, mat = ink) {
  const l = new LineSegments(geo, mat);
  l.userData["ink"] = true;
  return l;
}

const edgeCache = new WeakMap<BufferGeometry, EdgesGeometry>();

// A dithered mesh, outlined in ink unless edges is false.
export function part(geo: BufferGeometry, hex: number, edges = true) {
  if (!geo.getAttribute("color")) paint(geo, hex);
  const m = new Mesh(geo, ditherMaterial);
  if (!edges) return m;
  const e = edgeCache.get(geo) ?? new EdgesGeometry(geo, 25);
  edgeCache.set(geo, e);
  m.add(inkLines(e));
  return m;
}

const m4 = new Matrix4(),
  quat = new Quaternion(),
  euler = new Euler(),
  at = new Vector3(),
  one = new Vector3(1, 1, 1);

// Many small parts merged into one mesh: one draw call per model.
export class Batch {
  geos: BufferGeometry[] = [];

  add(g: BufferGeometry, hex: number, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute("normal");
    n.deleteAttribute("uv");
    paint(n, hex);
    n.applyMatrix4(m4.compose(at.set(x, y, z), quat.setFromEuler(euler.set(rx, ry, rz)), one));
    this.geos.push(n);
    return this;
  }

  box(w: number, h: number, d: number, hex: number, x = 0, y = 0, z = 0, ry = 0) {
    return this.add(new BoxGeometry(w, h, d).translate(0, h / 2, 0), hex, x, y, z, ry);
  }

  cyl(rt: number, rb: number, h: number, seg: number, hex: number, x = 0, y = 0, z = 0) {
    return this.add(new CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0), hex, x, y, z);
  }

  mesh(edges = true) {
    return part(mergeGeometries(this.geos), 0, edges);
  }
}

export function setInk(root: Object3D, mat: LineBasicMaterial) {
  root.traverse((o) => {
    if (o.userData["ink"]) (o as LineSegments).material = mat;
  });
}

const perlin = new ImprovedNoise();

// Perlin noise remapped to roughly 0..1.
export const noise = (x: number, y: number, z: number) => 0.5 + perlin.noise(x, y, z);

export const fbm = (p: Vector3, f: number) =>
  0.6 * noise(p.x * f, p.y * f, p.z * f) +
  0.3 * noise(p.x * f * 2.1, p.y * f * 2.1, p.z * f * 2.1) +
  0.1 * noise(p.x * f * 4.3, p.y * f * 4.3, p.z * f * 4.3);
