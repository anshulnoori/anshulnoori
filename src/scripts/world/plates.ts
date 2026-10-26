// One offscreen renderer draws every visible diorama and copies the pixels into
// that figure's 2D canvas.
import {
  CylinderGeometry,
  Group,
  LinearSRGBColorSpace,
  MathUtils,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import type { PlaceId } from "../../lib/places";
import { builders, type Landmark } from "./landmarks";
import { Batch, palette as P, uniforms } from "./look";

const R = 0.27;
const DISTANCE = 1.12;

function ground(id: PlaceId) {
  const b = new Batch();
  const slab = (r0: number, r1: number, h: number, y: number, hex: number, start = 0, arc = Math.PI * 2, z = 0) =>
    b.add(new CylinderGeometry(r0, r1, h, 48, 1, false, start, arc).translate(0, y, z), hex);

  if (id === "silt") return slab(0.16, 0.12, 0.02, -0.01, P.grass).mesh();
  if (id === "oss") {
    // Half land, half sea, so the pier runs out over the water.
    const half = Math.PI;
    slab(R, R, 0.035, -0.0175, P.grass, half / 2, half, 0.02);
    slab(R, R * 0.92, 0.04, -0.055, P.dirt, half / 2, half, 0.02);
    slab(R, R, 0.045, -0.0325, P.water, -half / 2, half, 0.02);
    return slab(R, R * 0.92, 0.04, -0.075, P.stone, -half / 2, half, 0.02).mesh();
  }
  slab(R, R, 0.035, -0.0175, P.grass);
  slab(R, R * 0.94, 0.04, -0.055, P.dirt);
  return slab(R * 0.94, R * 0.8, 0.05, -0.1, P.stone).mesh();
}

class Plate {
  readonly id: PlaceId;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly scene = new Scene();
  readonly turntable = new Group();
  readonly camera = new PerspectiveCamera(24, 1, 0.05, 20);
  readonly landmark: Landmark;
  yaw = -0.5;
  yawT = -0.5;
  pitch = 0.42;
  visible = false;
  w = 0;
  h = 0;

  constructor(
    readonly fig: HTMLElement,
    readonly dpr: number,
  ) {
    this.id = fig.dataset["plate"] as PlaceId;
    this.canvas = fig.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
    this.landmark = builders[this.id](() => 0);
    if (this.id === "silt") {
      this.landmark.root.position.y = 0.12;
      this.landmark.root.scale.setScalar(1.5);
    }
    this.scene.add(this.turntable.add(ground(this.id), this.landmark.root));
    this.listen();
  }

  private listen() {
    let drag: { x: number; y: number } | undefined;
    const release = () => (drag = undefined);
    this.canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      this.yawT += (e.clientX - drag.x) * 0.01;
      this.pitch = MathUtils.clamp(this.pitch + (e.clientY - drag.y) * 0.005, 0.12, 0.9);
      drag = { x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener("pointerup", release);
    this.canvas.addEventListener("pointercancel", release);
  }

  resize() {
    const w = Math.round(this.canvas.clientWidth * this.dpr),
      h = Math.round(this.canvas.clientHeight * this.dpr);
    if (w === this.w && h === this.h) return;
    this.w = this.canvas.width = w;
    this.h = this.canvas.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

export function startPlates(figs: HTMLElement[]) {
  const dpr = Math.min(devicePixelRatio, 2);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000, 0);
  const plates = figs.map((f) => new Plate(f, dpr));

  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const shown = plates.filter((p) => p.visible);
    shown.forEach((p) => p.resize());
    const W = Math.max(...shown.map((p) => p.w)),
      H = Math.max(...shown.map((p) => p.h));
    if (renderer.domElement.width !== W || renderer.domElement.height !== H) renderer.setSize(W, H, false);
    uniforms.uCell.value = dpr;
    for (const p of shown) {
      if (!reduce) p.yawT += dt * 0.12;
      p.yaw = MathUtils.damp(p.yaw, p.yawT, 6, dt);
      p.turntable.rotation.y = p.yaw;
      p.landmark.tick?.(now / 1000);
      p.camera.position.set(0, Math.sin(p.pitch) * DISTANCE + 0.05, Math.cos(p.pitch) * DISTANCE);
      p.camera.lookAt(0, p.id === "silt" ? 0.1 : 0.04, 0);
      renderer.setViewport(0, 0, p.w, p.h);
      renderer.setScissor(0, 0, p.w, p.h);
      renderer.clear();
      renderer.render(p.scene, p.camera);
      p.ctx.clearRect(0, 0, p.w, p.h);
      p.ctx.drawImage(renderer.domElement, 0, H - p.h, p.w, p.h, 0, 0, p.w, p.h);
    }
  }

  const run = () => renderer.setAnimationLoop(plates.some((p) => p.visible) && !document.hidden ? frame : null);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const p = plates.find((q) => q.fig === e.target);
      if (p) p.visible = e.isIntersecting;
    }
    run();
  });
  plates.forEach((p) => io.observe(p.fig));
  document.addEventListener("visibilitychange", run);
  document.documentElement.classList.add("plates-live");
}
