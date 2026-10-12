'use client';

// ── Volumetric fog — layered procedural FBM on a single 2D canvas ─────────────
//
// Three density layers are generated once (mount / debounced resize) at low
// resolution, then composited every frame with drawImage only — no per-frame
// noise evaluation.
//
//   far   — very low-frequency diffuse haze, faint, covers most of the frame
//           (dimmed under the text column).
//   midA  — domain-warped cloud masses + thin wisps, deep blue → cobalt.
//   midB  — second seed of the same field drifting along a different path;
//           the overlap of A and B continuously changes → clouds appear to
//           morph instead of sliding as one wallpaper.
//   glow  — noisy light sprite at the plasma core. Drawn `source-atop` onto
//           the masked mid layer, it lights only the clouds near the sphere
//           (volumetric "illumination"), plus a faint additive air-scatter pass.
//   node  — small additive glow at the active orbit node (eased in / out).
//
// Masks are built from the measured sphere position ([data-orbit-core]) and
// the text column rect: a noise-warped, rotated distance field → no visible
// ellipses, no straight edges, large dark voids preserved, text kept clear.
//
// Motion: each layer follows its own slow Lissajous path (periods 95–140 s,
// ≤ 3 px/s) → bounded drift, never reaches the texture overscan edge.
// Breathing periods are non-commensurate (17 / 23 / 41 / 53 s) → no
// synchronous pulsing. Cursor adds layer-dependent parallax (far < mid < glow).
//
// Cost: ~8 drawImage per frame on a half-resolution canvas at 30 fps.
// Paused when the hero is off-screen; one static frame for reduced motion.
//
// z-index: −2 (behind grid canvas at −1 and all content at ≥ 0).

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './hooks/useReducedMotion';
import { LENS_CX, LENS_CY } from './lens';

// ── Noise primitives ────────────────────────────────────────────────────────

function hash(ix: number, iy: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(t: number): number {
  return t * t * (3.0 - 2.0 * t);
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in [0, 1] */
function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  return lerp(
    lerp(hash(ix, iy),     hash(ix + 1, iy),     smooth(x - ix)),
    lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), smooth(x - ix)),
    smooth(y - iy),
  );
}

/** Fractal Brownian Motion — `oct` octaves, slight inharmonicity (2.07) */
function fbm(x: number, y: number, oct: number): number {
  let v = 0, a = 0.5, f = 1.0, s = 0.0;
  for (let i = 0; i < oct; i++) {
    v += a * noise(x * f, y * f);
    s += a;
    a *= 0.5;
    f *= 2.07;
  }
  return v / s;
}

// ── Layout / motion constants ───────────────────────────────────────────────

const RES       = 0.5;  // onscreen canvas px per CSS px (fog is soft; CSS blur hides it)
const OVERSCAN  = 110;  // CSS px of texture beyond each edge — covers drift + parallax
const FAR_STEP  = 10;   // CSS px per texel
const MID_STEP  = 6;
const MASK_STEP = 8;
const FRAME_MS  = 1000 / 30;

type Drift = {
  ax: number; ay: number;   // amplitude, CSS px
  tx: number; ty: number;   // period, s
  ph: number;               // phase
  par: number;              // cursor parallax, CSS px at viewport edge
};

const DRIFT_FAR:  Drift = { ax: 34, ay: 20, tx: 140, ty: 110, ph: 0.0, par: 5  };
const DRIFT_MIDA: Drift = { ax: 46, ay: 28, tx:  95, ty: 120, ph: 1.7, par: 11 };
const DRIFT_MIDB: Drift = { ax: 52, ay: 24, tx: 130, ty:  85, ph: 4.1, par: 16 };
const GLOW_PAR = 20;

const TAU = Math.PI * 2;

function driftOffset(d: Drift, t: number, mx: number, my: number): [number, number] {
  return [
    d.ax * Math.sin(TAU * t / d.tx + d.ph)       - mx * d.par,
    d.ay * Math.sin(TAU * t / d.ty + d.ph * 1.3) - my * d.par,
  ];
}

// ── Texture generation ──────────────────────────────────────────────────────

type Shade = (x: number, y: number, out: number[]) => boolean;

/**
 * Low-res RGBA layer covering CSS rect [x0, x0+w] × [y0, y0+h].
 * `shade` writes [r, g, b, a(0..1)] for a CSS-px sample; false → transparent.
 */
function makeLayer(
  x0: number, y0: number, w: number, h: number,
  step: number, shade: Shade,
): HTMLCanvasElement {
  const rw = Math.max(2, Math.ceil(w / step));
  const rh = Math.max(2, Math.ceil(h / step));
  const cv = document.createElement('canvas');
  cv.width  = rw;
  cv.height = rh;
  const c = cv.getContext('2d');
  if (!c) return cv;
  const img  = c.createImageData(rw, rh);
  const data = img.data;
  const out  = [0, 0, 0, 0];
  for (let py = 0; py < rh; py++) {
    const y = y0 + (py / (rh - 1)) * h;
    for (let px = 0; px < rw; px++) {
      const x = x0 + (px / (rw - 1)) * w;
      if (!shade(x, y, out)) continue;
      const i = (py * rw + px) * 4;
      data[i]     = out[0];
      data[i + 1] = out[1];
      data[i + 2] = out[2];
      data[i + 3] = Math.round(Math.min(1, Math.max(0, out[3])) * 255);
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

// Diffuse far haze: two very low-frequency fields → broad, uneven veils.
function farShade(S: number): Shade {
  return (x, y, out) => {
    const nx = x / S, ny = y / S;
    const n  = fbm(nx * 1.5 + 11.0, ny * 1.5 + 3.0, 4);
    const n2 = fbm(nx * 0.6 + 2.4,  ny * 0.6 + 8.1, 3);
    const d  = smoothstep(0.34, 0.80, n) * (0.45 + 0.55 * n2);
    if (d < 0.01) return false;
    out[0] = lerp(5,  14, d);
    out[1] = lerp(10, 30, d);
    out[2] = lerp(32, 92, d);
    out[3] = d * 0.42;
    return true;
  };
}

// Mid cloud masses: double domain warp + thin wisps along isolines.
function midShade(S: number, ox: number, oy: number): Shade {
  return (x, y, out) => {
    const px = (x / S) * 2.8 + ox;
    const py = (y / S) * 2.8 + oy;
    const qx = fbm(px,       py,       4);
    const qy = fbm(px + 5.2, py + 1.3, 4);
    const rx = fbm(px + 2.1 * qx + 1.7, py + 2.1 * qy + 9.2, 3);
    const v  = fbm(px + 1.6 * rx, py + 1.6 * qy, 5);

    // Soft-edged cloud body; lower range stays transparent → dark voids.
    const body = smoothstep(0.48, 0.82, v);
    // Wisps: narrow band around an isoline of the warp field.
    const wisp = Math.pow(Math.max(0, 1 - Math.abs(rx - 0.52) * 9), 3)
               * smoothstep(0.36, 0.56, v);
    const d = Math.min(1, body + wisp * 0.32);
    if (d < 0.01) return false;

    // Hue drift by warp field: violet-blue ↔ cobalt, never uniform.
    const hue = smoothstep(0.35, 0.65, qx);
    const hi  = smoothstep(0.55, 1.0, d);
    out[0] = lerp(lerp(9,  20, hue), 46,  hi);
    out[1] = lerp(lerp(18, 44, hue), 96,  hi);
    out[2] = lerp(lerp(78, 150, hue), 228, hi);
    out[3] = Math.pow(d, 1.25) * 0.82;
    return true;
  };
}

// Noisy radial light sprite — irregular edge, no clean circle.
function glowSprite(R: number, step: number, seed: number, rgb: [number, number, number]): HTMLCanvasElement {
  return makeLayer(-R, -R, 2 * R, 2 * R, step, (x, y, out) => {
    const r = Math.sqrt(x * x + y * y) / R;
    if (r >= 1) return false;
    const n  = fbm(x / R * 1.8 + seed, y / R * 1.8 + seed * 0.7, 4);
    const rr = r * (0.78 + 0.5 * n);
    const a  = Math.pow(1 - smoothstep(0.0, 1.0, rr), 2.2) * (0.55 + 0.45 * n);
    if (a < 0.004) return false;
    out[0] = rgb[0]; out[1] = rgb[1]; out[2] = rgb[2];
    out[3] = a;
    return true;
  });
}

type Rect = { x: number; y: number; w: number; h: number };

type Scene = {
  w: number; h: number;
  cx: number; cy: number; sr: number;   // sphere centre + radius, CSS px
  far: HTMLCanvasElement;
  midA: HTMLCanvasElement;
  midB: HTMLCanvasElement;
  farMask: HTMLCanvasElement;
  midMask: HTMLCanvasElement;
  glow: HTMLCanvasElement;   glowR: number;
  node: HTMLCanvasElement;   nodeR: number;
  scratch: HTMLCanvasElement;
};

function buildScene(w: number, h: number, cx: number, cy: number, sr: number, text: Rect | null): Scene {
  const S  = Math.max(w, h);
  const tw = w + 2 * OVERSCAN;
  const th = h + 2 * OVERSCAN;

  const far  = makeLayer(-OVERSCAN, -OVERSCAN, tw, th, FAR_STEP, farShade(S));
  const midA = makeLayer(-OVERSCAN, -OVERSCAN, tw, th, MID_STEP, midShade(S, 3.0, 7.0));
  const midB = makeLayer(-OVERSCAN, -OVERSCAN, tw, th, MID_STEP, midShade(S, 13.4, 2.6));

  // Text protection: noise-warped ellipse around the text column — a box
  // falloff leaves a straight vertical seam at the column edge.
  const protect = (x: number, y: number): number => {
    if (!text) return 0;
    const ex = (x - (text.x + text.w * 0.45)) / (text.w * 0.62);
    const ey = (y - (text.y + text.h * 0.5))  / (text.h * 0.70);
    const warp = (fbm(x / S * 3.1 + 17, y / S * 3.1 + 2, 3) - 0.5) * 0.5;
    return 1 - smoothstep(0.55, 1.35, Math.sqrt(ex * ex + ey * ey) + warp);
  };

  // Fade toward the section edges along a noise-warped superellipse —
  // axis-aligned fades keep the rectangle of the section readable.
  const edges = (x: number, y: number): number => {
    const ux = Math.abs(x / w - 0.5) * 2;
    const uy = Math.abs(y / h - 0.5) * 2;
    const r  = Math.pow(ux ** 4 + uy ** 4, 0.25)
             + (fbm(x / S * 2.6 + 31, y / S * 2.6 + 12, 3) - 0.5) * 0.45;
    // Extra top fade: the section starts right under the header rule.
    return (1 - smoothstep(0.62, 1.0, r)) * smoothstep(0.0, 0.24 * h, y);
  };

  // Mid mask: rotated anisotropic band through the sphere (upper-right ↔
  // lower-left) + offset lobe, edge warped by low-frequency noise.
  const ang = -0.42, ca = Math.cos(ang), sa = Math.sin(ang);
  const midMask = makeLayer(0, 0, w, h, MASK_STEP, (x, y, out) => {
    const dx = x - cx, dy = y - cy;
    const rx = dx * ca - dy * sa;
    const ry = dx * sa + dy * ca;
    const warp = (fbm(x / S * 2.2 + 40, y / S * 2.2 + 9, 3) - 0.5) * 0.7;
    const d  = Math.sqrt((rx / (0.60 * S)) ** 2 + (ry / (0.34 * S)) ** 2) + warp;
    let m = 1 - smoothstep(0.18, 1.05, d);
    const lx = x - (cx + 0.12 * S), ly = y - (cy - 0.16 * S);
    const lobe = 1 - smoothstep(0.0, 0.26 * S, Math.sqrt(lx * lx + ly * ly) * (1 + warp));
    m = Math.max(m, lobe * 0.45);
    m *= (1 - 0.9 * protect(x, y)) * edges(x, y);
    if (m < 0.004) return false;
    out[0] = out[1] = out[2] = 255;
    out[3] = m;
    return true;
  });

  // Far mask: broad, never fully off — the far haze is the deep backdrop.
  const farMask = makeLayer(0, 0, w, h, MASK_STEP, (x, y, out) => {
    const warp = (fbm(x / S * 1.4 + 21, y / S * 1.4 + 5, 3) - 0.5) * 0.6;
    const d = Math.hypot(x - cx, (y - cy) * 1.25) / (0.75 * S) + warp;
    let m = 0.10 + 0.90 * (1 - smoothstep(0.10, 1.1, d));
    m *= (1 - 0.7 * protect(x, y)) * edges(x, y);
    out[0] = out[1] = out[2] = 255;
    out[3] = m;
    return true;
  });

  const glowR = Math.max(sr * 3.2, 120);
  const glow  = glowSprite(glowR, 6, 4.7, [64, 138, 255]);
  const nodeR = 90;
  const node  = glowSprite(nodeR, 5, 9.3, [70, 140, 255]);

  const scratch = document.createElement('canvas');
  scratch.width  = Math.max(1, Math.round(w * RES));
  scratch.height = Math.max(1, Math.round(h * RES));

  return { w, h, cx, cy, sr, far, midA, midB, farMask, midMask, glow, glowR, node, nodeR, scratch };
}

// ── Per-frame composite ─────────────────────────────────────────────────────

type Live = {
  t: number;
  mx: number; my: number;          // smoothed cursor, −0.5..0.5
  hover: number;                   // smoothed cursor proximity to sphere, 0..1
  nodeA: number;                   // smoothed active-node glow, 0..1
  nodeX: number; nodeY: number;    // last active node centre, CSS px
};

function drawLayer(
  c: CanvasRenderingContext2D, tex: HTMLCanvasElement,
  w: number, h: number, ox: number, oy: number,
): void {
  c.drawImage(
    tex,
    (ox - OVERSCAN) * RES, (oy - OVERSCAN) * RES,
    (w + 2 * OVERSCAN) * RES, (h + 2 * OVERSCAN) * RES,
  );
}

function composite(ctx: CanvasRenderingContext2D, s: Scene, L: Live): void {
  const { w, h } = s;
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const t  = L.t;

  // Independent slow breathing — non-commensurate periods.
  const farB  = 1 + 0.07 * Math.sin(TAU * t / 23 + 0.4);
  const aW    = 0.62 + 0.18 * Math.sin(TAU * t / 41);
  const bW    = 0.55 + 0.18 * Math.sin(TAU * t / 53 + 1.3);
  const nearB = 1 + 0.10 * Math.sin(TAU * t / 17 + 0.7);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, cw, ch);

  // ── Far haze ──
  const [fx, fy] = driftOffset(DRIFT_FAR, t, L.mx, L.my);
  ctx.globalAlpha = Math.min(1, 0.9 * farB);
  drawLayer(ctx, s.far, w, h, fx, fy);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(s.farMask, 0, 0, cw, ch);

  // ── Mid clouds (scratch) ──
  const sc = s.scratch.getContext('2d');
  if (sc) {
    sc.globalCompositeOperation = 'source-over';
    sc.globalAlpha = 1;
    sc.clearRect(0, 0, s.scratch.width, s.scratch.height);
    const [ax, ay] = driftOffset(DRIFT_MIDA, t, L.mx, L.my);
    const [bx, by] = driftOffset(DRIFT_MIDB, t, L.mx, L.my);
    sc.globalAlpha = aW;
    drawLayer(sc, s.midA, w, h, ax, ay);
    sc.globalAlpha = bW;
    drawLayer(sc, s.midB, w, h, bx, by);

    sc.globalAlpha = 1;
    sc.globalCompositeOperation = 'destination-in';
    sc.drawImage(s.midMask, 0, 0, s.scratch.width, s.scratch.height);

    // Sphere lights the clouds around it — only where cloud density exists.
    const gx = s.cx - L.mx * GLOW_PAR, gy = s.cy - L.my * GLOW_PAR;
    sc.globalCompositeOperation = 'source-atop';
    sc.globalAlpha = Math.min(1, 0.50 * nearB * (1 + 0.35 * L.hover));
    sc.drawImage(s.glow, (gx - s.glowR) * RES, (gy - s.glowR) * RES, 2 * s.glowR * RES, 2 * s.glowR * RES);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(s.scratch, 0, 0);

    // Faint additive air scatter around the sphere.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.13 * nearB * (1 + 0.5 * L.hover);
    ctx.drawImage(s.glow, (gx - s.glowR) * RES, (gy - s.glowR) * RES, 2 * s.glowR * RES, 2 * s.glowR * RES);
  }

  // ── Active orbit node glow ──
  if (L.nodeA > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.24 * L.nodeA;
    ctx.drawImage(s.node, (L.nodeX - s.nodeR) * RES, (L.nodeY - s.nodeR) * RES, 2 * s.nodeR * RES, 2 * s.nodeR * RES);
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// ── DOM measurement ─────────────────────────────────────────────────────────

function measure(section: HTMLElement): { cx: number; cy: number; sr: number; text: Rect | null } {
  const sr0 = section.getBoundingClientRect();
  const core = section.querySelector<HTMLElement>('[data-orbit-core]');
  let cx = LENS_CX * section.clientWidth;
  let cy = LENS_CY * section.clientHeight;
  let sr = 85;
  if (core) {
    const r = core.getBoundingClientRect();
    if (r.width > 0) {
      cx = r.left - sr0.left + r.width / 2;
      cy = r.top  - sr0.top  + r.height / 2;
      sr = r.width * 0.35; // sphere ≈ 70 % of the core canvas diameter
    }
  }
  const col = section.querySelector('h1')?.parentElement;
  let text: Rect | null = null;
  if (col) {
    const r = col.getBoundingClientRect();
    text = { x: r.left - sr0.left, y: r.top - sr0.top, w: r.width, h: r.height };
  }
  return { cx, cy, sr, text };
}

// ── Component ───────────────────────────────────────────────────────────────

export function NebulaBackground() {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const section = canvas.parentElement;
    if (!section) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Narrowed aliases for nested closures.
    const cv: HTMLCanvasElement = canvas;
    const sec: HTMLElement = section;
    const c2d: CanvasRenderingContext2D = ctx;

    let scene: Scene | null = null;
    const live: Live = { t: 0, mx: 0, my: 0, hover: 0, nodeA: 0, nodeX: 0, nodeY: 0 };
    const target = { mx: 0, my: 0, hover: 0 };

    function rebuild(): void {
      const w = sec.clientWidth, h = sec.clientHeight;
      if (w < 2 || h < 2) return;
      cv.width  = Math.max(1, Math.round(w * RES));
      cv.height = Math.max(1, Math.round(h * RES));
      const m = measure(sec);
      scene = buildScene(w, h, m.cx, m.cy, m.sr, m.text);
      composite(c2d, scene, live);
    }

    rebuild();

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rebuild, 160);
    });
    ro.observe(sec);

    if (reducedMotion) {
      return () => {
        window.clearTimeout(resizeTimer);
        ro.disconnect();
      };
    }

    // ── Cursor ──
    function onMouseMove(e: MouseEvent): void {
      const r = sec.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      target.mx = x / r.width  - 0.5;
      target.my = y / r.height - 0.5;
      if (scene) {
        const d = Math.hypot(x - scene.cx, y - scene.cy) / (scene.sr * 3.5);
        target.hover = 1 - smoothstep(0.3, 1.0, d);
      }
    }
    function onMouseLeave(): void {
      target.mx = 0; target.my = 0; target.hover = 0;
    }
    sec.addEventListener('mousemove', onMouseMove, { passive: true });
    sec.addEventListener('mouseleave', onMouseLeave);

    let rafId      = 0;
    let prev       = performance.now();
    let acc        = 0;
    let frame      = 0;
    let nodeTarget = 0;

    // ── Visibility ──
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !rafId) { prev = performance.now(); rafId = requestAnimationFrame(tick); }
    });
    io.observe(sec);

    function tick(now: number): void {
      if (!visible) { rafId = 0; return; }
      rafId = requestAnimationFrame(tick);
      const dt = Math.min((now - prev) / 1000, 0.1);
      prev = now;
      acc += dt * 1000;
      if (acc < FRAME_MS) return;
      const step = Math.min(acc / 1000, 0.1);
      acc = 0;
      frame++;

      live.t += step;
      const k = 1 - Math.pow(0.25, step);      // ~1 s time constant
      live.mx    += (target.mx    - live.mx)    * k;
      live.my    += (target.my    - live.my)    * k;
      live.hover += (target.hover - live.hover) * k;

      // Active node: aria-expanded is set by the existing orbit logic.
      if (frame % 4 === 0) {
        const btn = sec.querySelector<HTMLElement>('[data-orbit-node] button[aria-expanded="true"]');
        if (btn) {
          const sr = sec.getBoundingClientRect();
          const r  = btn.getBoundingClientRect();
          live.nodeX = r.left - sr.left + r.width / 2;
          live.nodeY = r.top  - sr.top  + r.height / 2;
          nodeTarget = 1;
        } else {
          nodeTarget = 0;
        }
      }
      live.nodeA += (nodeTarget - live.nodeA) * (1 - Math.pow(0.02, step));

      // Layout can shift after mount (fonts, fade-in) — follow the sphere.
      if (frame % 60 === 0 && scene) {
        const m = measure(sec);
        if (Math.hypot(m.cx - scene.cx, m.cy - scene.cy) > 24) rebuild();
      }

      if (scene) composite(c2d, scene, live);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      sec.removeEventListener('mousemove', onMouseMove);
      sec.removeEventListener('mouseleave', onMouseLeave);
      scene = null;
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{
        zIndex: -2,
        // Half-res canvas upscaled by CSS; blur turns texels into soft vapour.
        filter: 'blur(6px)',
        // Mirror the grid mask so both background layers dissolve in sync.
        maskImage: 'linear-gradient(to bottom, black 60%, transparent 95%)',
      }}
    />
  );
}
