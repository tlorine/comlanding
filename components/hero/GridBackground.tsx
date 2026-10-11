'use client';

import { useEffect, useRef } from 'react';
import {
  PULSE_AMP_1,
  PULSE_AMP_2,
  PULSE_FREQ_1,
  PULSE_FREQ_2,
  PULSE_PHASE_2,
} from './orbit/config';
import { useReducedMotion } from './orbit/hooks/useReducedMotion';

// ── Visual constants ───────────────────────────────────────────────────────
// All opacity values are intentionally low. The grid is environmental
// texture; it must not compete with text or the 3D core.

/** Default vanishing-point position (normalized 0–1 of canvas dims) */
const VP_X0 = 0.50;
const VP_Y0 = 0.38;

/** Max VP displacement from mouse position (in VP-normalized units) */
const MOUSE_X_RANGE = 0.055;
const MOUSE_Y_RANGE = 0.022;

/** Lerp coefficient per frame (~0.042 ≈ smooth ~24-frame follow at 60fps) */
const LERP = 0.042;

/** Idle sinusoidal drift amplitude when no mouse is active */
const DRIFT_X_AMP = 0.016;
const DRIFT_Y_AMP = 0.008;

// Primary grid — coarser spacing, baseline opacity
const P_ROWS   = 9;
const P_COLS   = 13;
const P_OP_MAX = 0.192;

// Secondary grid — fine subdivision, significantly dimmer
const S_ROWS   = 18;
const S_COLS   = 24;
const S_OP_MAX = 0.072;

// Horizon line
const H_OP = 0.100;

// Faint atmosphere lines above horizon
const ABOVE_N  = 6;
const ABOVE_OP = 0.042;

// Perspective depth exponent (> 1 = compress rows near horizon)
const PERSP_EXP = 1.85;

// Grid colour: cold steel-blue — matches orbit-system palette
const CR = 100;
const CG = 130;
const CB = 168;

// ── Types ─────────────────────────────────────────────────────────────────

interface Vp { x: number; y: number }

// ── Helpers ───────────────────────────────────────────────────────────────

function rgba(a: number): string {
  return `rgba(${CR},${CG},${CB},${a.toFixed(3)})`;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ── Grid drawing (pure function) ──────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  vp: Vp,
  pulse: number,  // 0..1 — Core energy burst level; synced with CoreShader.ts
): void {
  ctx.clearRect(0, 0, W, H);

  const vpx    = W * vp.x;
  const vpy    = H * vp.y;
  const floorH = H - vpy;

  // ── Orbit halo — radial glow behind the right-column 3D scene ───────────
  // Pulses in sync with the Core's energy burst: radius expands +21% and
  // inner opacity doubles at peak, creating the impression that the sphere
  // actually illuminates the background grid around it.
  {
    const hx = W * 0.74;
    const hy = H * 0.50;
    const hr  = Math.min(W, H) * (0.38 + pulse * 0.10);   // 0.38 → 0.48 at peak
    const op0 = 0.038 + pulse * 0.14;                      // 0.038 → 0.178 at peak
    const op1 = 0.014 + pulse * 0.045;                     // 0.014 → 0.059 at peak
    const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    halo.addColorStop(0,   `rgba(${CR},${CG},${CB},${op0.toFixed(3)})`);
    halo.addColorStop(0.5, `rgba(${CR},${CG},${CB},${op1.toFixed(3)})`);
    halo.addColorStop(1,   `rgba(${CR},${CG},${CB},0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Helpers: horizontal gradient stroke ──────────────────────────────────
  // All horizontal elements (horizon, atmosphere, floor rows) use a left→right
  // gradient. Left side (text column) is very dim; right side (orbit column)
  // gets full opacity. This is the same spatial logic as convergence lines and
  // prevents the grid from appearing as a uniform overlay behind the heading.
  //
  // Gradient points: (0,0)→(W*0.52,0) — beyond x=0.52 the last stop holds.
  // The y-coordinate is irrelevant for horizontal-only gradients (Canvas
  // linear gradients are defined by direction, not restricted to a pixel row).
  function hGrad(op: number): CanvasGradient {
    const g = ctx.createLinearGradient(0, 0, W * 0.52, 0);
    g.addColorStop(0, rgba(op * 0.10));
    g.addColorStop(1, rgba(op));
    return g;
  }

  // ── Horizon line ─────────────────────────────────────────────────────────
  ctx.strokeStyle = hGrad(H_OP);
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, vpy);
  ctx.lineTo(W, vpy);
  ctx.stroke();

  // ── Atmosphere lines above horizon ───────────────────────────────────────
  ctx.lineWidth = 0.35;
  for (let i = 1; i <= ABOVE_N; i++) {
    const t  = (i / (ABOVE_N + 1)) ** 1.5;
    const y  = vpy - vpy * t;
    const op = ABOVE_OP * (1 - t * 0.55);
    ctx.strokeStyle = hGrad(op);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // ── Primary floor grid — horizontal depth bands ───────────────────────────
  // Power-law distribution compresses rows near horizon (perspective effect).
  ctx.lineWidth = 0.5;
  for (let i = 1; i <= P_ROWS; i++) {
    const t  = (i / P_ROWS) ** PERSP_EXP;
    const y  = vpy + floorH * t;
    const op = t ** 0.55 * P_OP_MAX;
    ctx.strokeStyle = hGrad(op);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // ── Secondary floor grid — horizontal depth bands ─────────────────────────
  ctx.lineWidth = 0.3;
  for (let i = 1; i <= S_ROWS; i++) {
    const t  = (i / S_ROWS) ** PERSP_EXP;
    const y  = vpy + floorH * t;
    const op = t ** 0.6 * S_OP_MAX;
    ctx.strokeStyle = hGrad(op);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // ── Primary convergence lines ─────────────────────────────────────────────
  // Radiate from VP toward evenly-spaced points along the bottom edge.
  // Left side (text column) is kept dim (45%) for reading contrast.
  // Right side (orbit column) receives full brightness.
  // Quadratic ramp (nx²) makes the transition felt rather than just linear.
  // Pulse boosts brightness — the convergence field reacts to Core output.
  ctx.lineWidth = 0.5;
  for (let j = 0; j < P_COLS; j++) {
    const xBot = W * (j / (P_COLS - 1));
    const nx   = xBot / W; // 0 = left edge, 1 = right edge
    const op   = (P_OP_MAX + pulse * 0.09) * (0.45 + 0.55 * (nx * nx));

    const gr = ctx.createLinearGradient(vpx, vpy, xBot, H);
    gr.addColorStop(0, rgba(0));
    gr.addColorStop(1, rgba(op));
    ctx.strokeStyle = gr;
    ctx.beginPath();
    ctx.moveTo(vpx, vpy);
    ctx.lineTo(xBot, H);
    ctx.stroke();
  }

  // ── Secondary convergence lines ───────────────────────────────────────────
  ctx.lineWidth = 0.3;
  for (let j = 0; j < S_COLS; j++) {
    const xBot = W * (j / (S_COLS - 1));
    const nx   = xBot / W;
    const op   = (S_OP_MAX + pulse * 0.04) * (0.45 + 0.55 * (nx * nx));

    const gr = ctx.createLinearGradient(vpx, vpy, xBot, H);
    gr.addColorStop(0, rgba(0));
    gr.addColorStop(1, rgba(op));
    ctx.strokeStyle = gr;
    ctx.beginPath();
    ctx.moveTo(vpx, vpy);
    ctx.lineTo(xBot, H);
    ctx.stroke();
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function GridBackground() {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const vpCurRef      = useRef<Vp>({ x: VP_X0, y: VP_Y0 });
  const vpTgtRef      = useRef<Vp>({ x: VP_X0, y: VP_Y0 });
  const mouseOnRef    = useRef(false);
  const rafRef        = useRef<number>(0);
  /** Logical pixel dimensions (pre-DPR scale), used directly by drawGrid */
  const sizeRef       = useRef({ w: 1, h: 1 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const section = canvas.parentElement;
    if (!section) return;

    // ── Canvas sizing ────────────────────────────────────────────────────────
    // setTransform replaces any accumulated DPR scale, so it is safe to call
    // on every resize without stacking transforms.
    //
    // TypeScript note: canvas/section are narrowed non-null above, but strict
    // mode un-narrows them inside escaped closure bodies (RAF/event handlers).
    // The inner null-guards below are the idiomatic TypeScript fix.
    function applySize(): void {
      const cv = canvasRef.current;
      const sc = cv?.parentElement;
      if (!cv || !sc) return;

      const w   = sc.clientWidth  || 1;
      const h   = sc.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      cv.width  = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width  = `${w}px`;
      cv.style.height = `${h}px`;
      sizeRef.current = { w, h };

      const ctx = cv.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function redraw(pulse = 0): void {
      const cv       = canvasRef.current;
      const ctx      = cv?.getContext('2d') ?? null;
      const { w, h } = sizeRef.current;
      if (ctx && w > 1 && h > 1) {
        drawGrid(ctx, w, h, vpCurRef.current, pulse);
      }
    }

    applySize();
    redraw();

    // Resize observer keeps canvas size in sync with Hero layout changes
    const ro = new ResizeObserver(() => {
      applySize();
      redraw();
    });
    ro.observe(section);

    // ── Mouse / pointer tracking ──────────────────────────────────────────────
    // Attached to the section so the grid only reacts within the Hero.
    // mousemove does not fire on touch devices → mobile gets idle-drift only.
    function onMouseMove(e: MouseEvent): void {
      // Use currentTarget (the section element) rather than the outer-scope
      // `section` const — avoids TypeScript's closure un-narrowing issue.
      const sc   = e.currentTarget as HTMLElement;
      const rect = sc.getBoundingClientRect();
      const nx   = (e.clientX - rect.left) / rect.width;
      const ny   = (e.clientY - rect.top)  / rect.height;
      vpTgtRef.current.x = clamp(VP_X0 + (nx - 0.5) * MOUSE_X_RANGE * 2, 0.28, 0.72);
      vpTgtRef.current.y = clamp(VP_Y0 + (ny - 0.5) * MOUSE_Y_RANGE * 2, 0.18, 0.58);
      mouseOnRef.current = true;
    }

    function onMouseLeave(): void {
      vpTgtRef.current.x = VP_X0;
      vpTgtRef.current.y = VP_Y0;
      mouseOnRef.current = false;
    }

    section.addEventListener('mousemove', onMouseMove);
    section.addEventListener('mouseleave', onMouseLeave);

    // ── Animation loop ────────────────────────────────────────────────────────
    // No React state updates — VP stored in refs, canvas written directly.
    const t0 = performance.now();

    function tick(now: number): void {
      const elapsed = (now - t0) / 1000;

      // Idle drift: slow sinusoidal VP motion when no mouse is present.
      // Period: ~35s X, ~52s Y. Barely perceptible, gives grid subtle life.
      if (!mouseOnRef.current) {
        vpTgtRef.current.x = VP_X0 + Math.sin(elapsed * 0.18) * DRIFT_X_AMP;
        vpTgtRef.current.y = VP_Y0 + Math.cos(elapsed * 0.12) * DRIFT_Y_AMP;
      }

      // Exponential lerp — smooth deceleration toward target
      vpCurRef.current.x += (vpTgtRef.current.x - vpCurRef.current.x) * LERP;
      vpCurRef.current.y += (vpTgtRef.current.y - vpCurRef.current.y) * LERP;

      // Halo pulse: same formula as CoreShader.ts burst + OrbitSystem.tsx.
      // Both clocks start near t=0 at mount; any startup desync (< 300 ms)
      // is imperceptible across the 8.1 s period.
      const rawBurst = PULSE_AMP_1 * Math.sin(elapsed * PULSE_FREQ_1)
                     + PULSE_AMP_2 * Math.sin(elapsed * PULSE_FREQ_2 + PULSE_PHASE_2);
      // 2-second fade-in matches OrbitSystem.tsx pulseFadeIn ramp.
      const rampIn = Math.min(1, elapsed / 2.0);
      const pulse = rampIn * Math.max(0, rawBurst) / (PULSE_AMP_1 + PULSE_AMP_2);

      redraw(pulse);

      rafRef.current = requestAnimationFrame(tick);
    }

    if (!reducedMotion) {
      rafRef.current = requestAnimationFrame(tick);
    }
    // Static frame already issued by redraw() above.

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      section.removeEventListener('mousemove', onMouseMove);
      section.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: -1 }}
    />
  );
}
