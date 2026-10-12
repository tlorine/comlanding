'use client';

// ── Canvas nebula — procedural FBM + domain warping ──────────────────────────
//
// Computed once at mount / on resize at 1/8 CSS-pixel resolution (offscreen
// canvas), then scaled up with bilinear interpolation + a soft CSS blur.
// No per-frame recomputation; no animation loop.
//
// Technique:
//   1. q = fbm(p)              — displacement field (4 octaves each component)
//   2. density = fbm(p + q*s)  — warped density field (5 octaves)
//   3. Asymmetric radial mask  — concentrates nebula in right-center (behind
//      orbital system), falls off faster toward the text column.
//   4. Threshold + remap       — keeps only the denser regions visible; lower
//      portions become transparent background → preserves dark voids.
//   5. Color: deep navy (low density) → richer indigo (high density).
//
// z-index: −2 (behind grid canvas at −1 and all content at ≥ 0).

import { useEffect, useRef } from 'react';
import { lensDisplaceUV, LENS_NEBULA_UV_K } from './lens';

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

/**
 * Domain-warped FBM.
 * Computes a displacement (qx, qy) from two independent FBM fields, then
 * samples a final FBM at the displaced coordinate.  This folds space and
 * produces the characteristic swirling filament / void structure of nebulae.
 */
function nebulaField(x: number, y: number): number {
  const qx = fbm(x + 0.0, y + 0.0, 4);
  const qy = fbm(x + 5.2, y + 1.3, 4);
  return fbm(x + 1.8 * qx, y + 1.8 * qy, 5);
}

// ── Low-res nebula renderer ─────────────────────────────────────────────────

function renderNebula(canvas: HTMLCanvasElement, w: number, h: number): void {
  if (w < 2 || h < 2) return;

  canvas.width  = w;
  canvas.height = h;

  // Compute at 1/8 resolution → smooth when scaled, cheap to generate
  const STEP = 8;
  const rw = Math.max(1, Math.ceil(w / STEP));
  const rh = Math.max(1, Math.ceil(h / STEP));

  const off = document.createElement('canvas');
  off.width  = rw;
  off.height = rh;
  const oc = off.getContext('2d');
  if (!oc) return;

  const img  = oc.createImageData(rw, rh);
  const data = img.data;

  // Nebula center in UV space — right-center, behind the orbital system
  const CX = 0.65;
  const CY = 0.42;

  // Noise coordinate scale: rh maps to ≈3.5 noise units
  const aspect = w / h;

  for (let py = 0; py < rh; py++) {
    for (let px = 0; px < rw; px++) {
      const u = rw > 1 ? px / (rw - 1) : 0.5;
      const v = rh > 1 ? py / (rh - 1) : 0.5;

      // Asymmetric radial mask:
      //   • left side (toward text) compressed by 0.40 → falls off ~2.5× faster
      //   • bottom slightly tightened
      const du = u - CX;
      const dv = v - CY;
      const lft = du < 0 ? 0.40 : 1.00;
      const bot = dv > 0 ? 0.82 : 1.00;
      const r   = Math.sqrt((du * lft) ** 2 + (dv * bot) ** 2);
      // Mask radius 0.54 → nebula covers roughly the right 60% of the viewport
      const mask = Math.max(0, 1.0 - r / 0.54);
      if (mask < 0.004) continue;

      // Gravitational-lens magnification: sample from a position displaced
      // inward — the rendered pixel appears to show denser nebula from closer
      // to the lens centre → apparent outward expansion around the sphere.
      const [lu, lv] = lensDisplaceUV(u, v, LENS_NEBULA_UV_K);

      // Noise-space coordinates: aspect-corrected, offset to a non-degenerate
      // region of the noise field (avoid near-zero symmetry axes)
      const nx = (lu - CX) * aspect * 3.5 + 3.0;
      const ny = (lv - CY) * 3.5          + 7.0;

      const raw = nebulaField(nx, ny);

      // Only the upper ~62% of the noise range forms visible clouds; the rest
      // stays transparent → creates genuine dark voids between cloud regions
      const THRESHOLD = 0.38;
      if (raw < THRESHOLD) continue;
      const density = (raw - THRESHOLD) / (1.0 - THRESHOLD); // [0 .. 1]

      // Combine density with shape mask (power > 1 sharpens the spatial edge)
      const shaped = density * mask ** 1.5;
      if (shaped < 0.005) continue;

      // Alpha: shaped value scaled to a ceiling that keeps nebula subordinate
      // to the grid and orbital system above it
      const alpha = Math.min(1, shaped * 1.25) * 0.80;

      // Colour ramp: dark navy at low density → richer indigo at high density
      const t = Math.min(1, density * 1.4);
      const R = Math.round(lerp( 6,  18, t));
      const G = Math.round(lerp(14,  44, t));
      const B = Math.round(lerp(72, 178, t));
      const A = Math.round(alpha * 255);

      const i = (py * rw + px) * 4;
      data[i + 0] = R;
      data[i + 1] = G;
      data[i + 2] = B;
      data[i + 3] = A;
    }
  }

  oc.putImageData(img, 0, 0);

  // Scale low-res nebula to full canvas size with bilinear interpolation
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, 0, 0, w, h);
}

// ── Component ───────────────────────────────────────────────────────────────

export function NebulaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    function refresh(): void {
      if (!canvas || !parent) return;
      renderNebula(canvas, parent.clientWidth, parent.clientHeight);
    }

    refresh();

    const ro = new ResizeObserver(refresh);
    ro.observe(parent);

    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      // CSS blur softens the 8× upscaling to atmospheric smoothness
      style={{
        zIndex: -2,
        filter: 'blur(6px)',
        // Mirror the grid mask so both background layers dissolve in sync.
        maskImage: 'linear-gradient(to bottom, black 60%, transparent 95%)',
      }}
    />
  );
}
