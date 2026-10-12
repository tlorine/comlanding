'use client';

// ── Perspective grid background ────────────────────────────────────────────
//
// Single vanishing point.  Floor plane extended beyond the canvas edges.
//
// Geometry model
// ──────────────
// Every convergence line is defined by a world-space column index j and a
// fixed step dx = W / (N_COLS − 1).  The bottom-edge x of column j is
//   xBot(j) = j · dx
// so j = 0 → x = 0, j = N_COLS−1 → x = W (the original N_COLS lines).
//
// The virtual floor extends FLOOR_EXT canvas-widths beyond each side, so j
// runs from  j_min = −floor(FLOOR_EXT·(N_COLS−1))  to
//            j_max =  (N_COLS−1) + floor(FLOOR_EXT·(N_COLS−1)).
//
// All lines use the same formula — there is no separate "extension" pass.
// This guarantees uniform world-space column spacing across the full width.
//
// Clipping
// ────────
// A line from VP = (vpx, vpy) toward (xBot, H):
//   • xBot ∈ [0, W]  → reaches the bottom edge; draw to (xBot, H).
//   • xBot < 0       → exits the left edge at t = vpx / (vpx − xBot);
//                       draw to (0, vpy + t·floorH).
//   • xBot > W       → exits the right edge at t = (W−vpx) / (xBot−vpx);
//                       draw to (W, vpy + t·floorH).
// Canvas 2-D clips the stroke automatically; we stop drawing at the boundary
// so the gradient endpoint coincides with the visible end of the line.
//
// Floor horizontal lines use the same FLOOR_EXT to compute their left/right
// bounds, so every floor cell is bounded by exactly two convergence lines.
//
// Previous bug
// ────────────
// Primary lines used dx = W/15 (spacing W/15 ≈ 0.067 W at the bottom).
// Extension lines were generated with frac = j/P_EXT, giving spacing
//   FLOOR_EXT · W / P_EXT = 3 · W / 8 = 0.375 W — 5.6× coarser.
// This density discontinuity produced inconsistent cells on both sides.
//
// Mouse VP range: ±18 px — no rubber-surface deformation.

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './hooks/useReducedMotion';
import { lensDisplace, LENS_FLOOR_K, LENS_CX, LENS_CY } from './lens';

// ── Constants ──────────────────────────────────────────────────────────────

const VP_X0 = 0.50;
const VP_Y0 = 0.38;

const MOUSE_X_RANGE = 0.018;
const MOUSE_Y_RANGE = 0.010;

const LERP = 0.055;

const DRIFT_X_AMP = 0.008;
const DRIFT_Y_AMP = 0.005;

const P_ROWS = 12;
const P_COLS = 16;
const S_ROWS = 24;
const S_COLS = 30;

// Virtual floor extends FLOOR_EXT canvas-widths beyond each edge.
// All convergence lines and floor-line bounds use the same value.
// With FLOOR_EXT = 2 and VP_X0 = 0.5 the floor spans the full canvas
// width for all floor rows with t ≥ 0.20 (rows 5–12 out of 12).
const FLOOR_EXT = 2;

// Gravitational-lens floor-line distortion
const LENS_SEGS = 32; // segments per floor line (more → smoother lens curve and haze wave)

const PERSP_EXP = 1.85;

const P_OP   = 0.38;
const S_OP   = 0.14;
const C_P_OP = 0.38;
const C_S_OP = 0.14;
const H_OP   = 0.24;
const ABOVE_N  = 6;
const ABOVE_OP = 0.08;

const CR = 88;
const CG = 116;
const CB = 162;

// ── Thermal shimmer ──────────────────────────────────────────────────────────
//
// Adds a small animated vertical displacement to floor-line vertices inside
// the same lensProfile bell used for gravitational curvature.  Effect is
// purely geometric (vertex y-shift); no new layers or compositors needed.
//
// HAZE_AMP   — peak displacement in CSS px at the bell midpoint.
// IN_PX/OUT_PX — zone in pixel-distance from sphere centre.  Using absolute
//               pixels (not UV units) ensures the bell covers the thick,
//               visible bottom floor lines (up to ~380 px below sphere centre)
//               rather than only the thin lines near the sphere equator.
// F1 / F2    — noise cell sizes ≈ W/F (F=6 → ~230 px cells at 1392 px).
// SU / SV    — drift in noise-UV/sec; apparent pixel/sec ≈ SU×W/F.
//              SU1=0.40 → ~90 px/sec → one ±HAZE_AMP cycle every ~1.3 s.
const HAZE_AMP    = 8.0; // DIAGNOSTIC — reduce to 2.5–3.5 after confirming visibility
const HAZE_IN_PX  = 65;  // inner hard edge: just outside sphere silhouette
const HAZE_OUT_PX = 400; // outer edge: covers all floor lines including row 12
const HAZE_F1     = 6.2;
const HAZE_F2     = 13.7;
const HAZE_SU1    = 0.40; // was 0.09 — faster drift for perceptible animation
const HAZE_SV1    = 0.25;
const HAZE_SU2    = 0.60;
const HAZE_SV2    = 0.38;

function hazeHash(ix: number, iy: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function hazeNoise(x: number, y: number): number {
  const ix = Math.floor(x); const iy = Math.floor(y);
  const fx = x - ix;        const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (
    hazeHash(ix,   iy  ) * (1 - ux) * (1 - uy) +
    hazeHash(ix+1, iy  ) *      ux  * (1 - uy) +
    hazeHash(ix,   iy+1) * (1 - ux) *      uy  +
    hazeHash(ix+1, iy+1) *      ux  *      uy
  );
}
/** Two-octave FBM → [0, 1].  Each octave drifts at a different UV rate. */
function hazeField(u: number, v: number, t: number): number {
  const s1 = hazeNoise(u * HAZE_F1 + t * HAZE_SU1, v * HAZE_F1 + t * HAZE_SV1);
  const s2 = hazeNoise(u * HAZE_F2 + t * HAZE_SU2, v * HAZE_F2 + t * HAZE_SV2) * 0.5;
  return (s1 + s2) / 1.5;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Vp { x: number; y: number }

// ── Helpers ────────────────────────────────────────────────────────────────

function rgba(a: number): string {
  return `rgba(${CR},${CG},${CB},${a.toFixed(3)})`;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ── Grid drawing ───────────────────────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  vp: Vp,
  time: number,
): void {
  ctx.clearRect(0, 0, W, H);

  const vpx    = W * vp.x;
  const vpy    = H * vp.y;
  const floorH = H - vpy;

  function edgeFade(op: number): CanvasGradient {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0,    rgba(op * 0.42));
    g.addColorStop(0.10, rgba(op));
    g.addColorStop(0.90, rgba(op));
    g.addColorStop(1,    rgba(op * 0.42));
    return g;
  }

  // ── Horizon line ─────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = `rgba(${CR},${CG},${CB},0.22)`;
  ctx.shadowBlur  = 6;
  ctx.strokeStyle = edgeFade(H_OP);
  ctx.lineWidth   = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, vpy);
  ctx.lineTo(W, vpy);
  ctx.stroke();
  ctx.restore();

  // ── Lines above horizon ───────────────────────────────────────────────────
  ctx.lineWidth = 0.28;
  for (let i = 1; i <= ABOVE_N; i++) {
    const t  = (i / (ABOVE_N + 1)) ** 1.5;
    const y  = vpy - vpy * t;
    const op = ABOVE_OP * (1 - t * 0.60);
    ctx.strokeStyle = edgeFade(op);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // ── Lens-distorted floor line helper ─────────────────────────────────────
  // Splits the line [xl, y] → [xr, y] into LENS_SEGS segments; each vertex
  // is displaced radially outward by the lens profile → floor curves away
  // from the sphere boundary, reading as a gravitational-lens warp.
  function drawFloorLine(
    xl: number, xr: number, y: number,
    style: string | CanvasGradient,
    lw: number,
    withShadow: boolean,
  ): void {
    if (withShadow) {
      ctx.save();
      ctx.shadowColor = `rgba(${CR},${CG},${CB},0.18)`;
      ctx.shadowBlur  = 4;
    }
    ctx.strokeStyle = style;
    ctx.lineWidth   = lw;
    ctx.beginPath();
    for (let s = 0; s <= LENS_SEGS; s++) {
      const tx = s / LENS_SEGS;
      const rx = xl + (xr - xl) * tx;
      const [dx, dy] = lensDisplace(rx, y, W, H, LENS_FLOOR_K);

      // Thermal shimmer: vertical-only FBM displacement inside a pixel-radius
      // bell centred on the sphere.  Pixel distances cover the thick bottom
      // floor lines that the old UV-unit bell (LENS_R_OUTER≈292 px) missed.
      const u_h  = rx / W;
      const v_h  = y  / H;
      const rdx  = rx - LENS_CX * W;
      const rdy  = y  - LENS_CY * H;
      const r_px = Math.sqrt(rdx * rdx + rdy * rdy);
      let   env  = 0;
      if (r_px > HAZE_IN_PX && r_px < HAZE_OUT_PX) {
        const tp = (r_px - HAZE_IN_PX) / (HAZE_OUT_PX - HAZE_IN_PX);
        env = 16 * tp * tp * (1 - tp) * (1 - tp); // quartic bell, peak at tp=0.5
      }
      const haze = (hazeField(u_h, v_h, time) - 0.5) * 2.0; // [−1, +1]
      const hy   = dy + env * HAZE_AMP * haze;

      if (s === 0) ctx.moveTo(dx, hy); else ctx.lineTo(dx, hy);
    }
    ctx.stroke();
    if (withShadow) ctx.restore();
  }

  // ── Primary floor horizontal lines ───────────────────────────────────────
  for (let i = 1; i <= P_ROWS; i++) {
    const t  = (i / P_ROWS) ** PERSP_EXP;
    const y  = vpy + floorH * t;
    const op = t ** 0.40 * P_OP;
    const lw = 0.32 + t * 0.48;
    const xl = Math.max(0, vpx + (-FLOOR_EXT * W - vpx) * t);
    const xr = Math.min(W, vpx + ((1 + FLOOR_EXT) * W - vpx) * t);

    drawFloorLine(xl, xr, y, edgeFade(op), lw, t > 0.70);
  }

  // ── Secondary floor horizontal lines ─────────────────────────────────────
  for (let i = 1; i <= S_ROWS; i++) {
    const t  = (i / S_ROWS) ** PERSP_EXP;
    const y  = vpy + floorH * t;
    const op = t ** 0.44 * S_OP;
    const xl = Math.max(0, vpx + (-FLOOR_EXT * W - vpx) * t);
    const xr = Math.min(W, vpx + ((1 + FLOOR_EXT) * W - vpx) * t);
    drawFloorLine(xl, xr, y, edgeFade(op), 0.22, false);
  }

  // ── Convergence lines — unified world-space loop ──────────────────────────
  //
  // For N_COLS columns spanning [0, W] with step dx = W/(N_COLS−1),
  // extend to [−FLOOR_EXT·W, (1+FLOOR_EXT)·W] using the same step.
  //
  // Column j has xBot = j·dx.  Route to exit point:
  //   xBot ∈ [0,W]  → bottom edge  (xBot, H)
  //   xBot < 0      → left edge    (0, vpy + t_exit·floorH)
  //   xBot > W      → right edge   (W, vpy + t_exit·floorH)

  function drawConvergenceLines(
    nCols: number,
    maxOp: number,
    lw: number,
    midStop: number,   // opacity multiplier at the 0.16 gradient stop
  ): void {
    ctx.lineWidth = lw;
    const dx   = W / (nCols - 1);
    const ext  = Math.floor(FLOOR_EXT * (nCols - 1));
    const jMin = -ext;
    const jMax = (nCols - 1) + ext;

    for (let j = jMin; j <= jMax; j++) {
      const xBot = j * dx;
      const nx   = Math.max(0, Math.min(1, xBot / W));
      const op   = maxOp * (0.55 + 0.45 * nx);

      // Clip to canvas boundary
      let ex: number, ey: number;
      if (xBot < 0) {
        const te = vpx / (vpx - xBot);       // t where x = 0
        ex = 0;  ey = vpy + te * floorH;
      } else if (xBot > W) {
        const te = (W - vpx) / (xBot - vpx); // t where x = W
        ex = W;  ey = vpy + te * floorH;
      } else {
        ex = xBot; ey = H;
      }

      const gr = ctx.createLinearGradient(vpx, vpy, ex, ey);
      gr.addColorStop(0,    rgba(0));
      gr.addColorStop(0.16, rgba(op * midStop));
      gr.addColorStop(1,    rgba(op));
      ctx.strokeStyle = gr;
      ctx.beginPath();
      ctx.moveTo(vpx, vpy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }

  drawConvergenceLines(P_COLS, C_P_OP, 0.42, 0.26);
  drawConvergenceLines(S_COLS, C_S_OP, 0.22, 0.22);
}

// ── Component ──────────────────────────────────────────────────────────────

export function GridBackground() {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const vpCurRef      = useRef<Vp>({ x: VP_X0, y: VP_Y0 });
  const vpTgtRef      = useRef<Vp>({ x: VP_X0, y: VP_Y0 });
  const mouseOnRef    = useRef(false);
  const rafRef        = useRef<number>(0);
  const sizeRef       = useRef({ w: 1, h: 1 });
  const timeRef       = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const section = canvas.parentElement;
    if (!section) return;

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

    function redraw(): void {
      const cv       = canvasRef.current;
      const ctx      = cv?.getContext('2d') ?? null;
      const { w, h } = sizeRef.current;
      if (ctx && w > 1 && h > 1) {
        drawGrid(ctx, w, h, vpCurRef.current, timeRef.current);
      }
    }

    applySize();
    redraw();

    const ro = new ResizeObserver(() => {
      applySize();
      redraw();
    });
    ro.observe(section);

    function onMouseMove(e: MouseEvent): void {
      const sc   = e.currentTarget as HTMLElement;
      const rect = sc.getBoundingClientRect();
      const nx   = (e.clientX - rect.left) / rect.width;
      const ny   = (e.clientY - rect.top)  / rect.height;
      vpTgtRef.current.x = clamp(VP_X0 + (nx - 0.5) * MOUSE_X_RANGE * 2, 0.47, 0.53);
      vpTgtRef.current.y = clamp(VP_Y0 + (ny - 0.5) * MOUSE_Y_RANGE * 2, 0.36, 0.41);
      mouseOnRef.current = true;
    }

    function onMouseLeave(): void {
      vpTgtRef.current.x = VP_X0;
      vpTgtRef.current.y = VP_Y0;
      mouseOnRef.current = false;
    }

    section.addEventListener('mousemove', onMouseMove);
    section.addEventListener('mouseleave', onMouseLeave);

    const t0      = performance.now();
    let   prevNow = t0;

    function tick(now: number): void {
      const elapsed = (now - t0) / 1000;
      const delta   = Math.min((now - prevNow) / 1000, 0.05);
      prevNow = now;
      timeRef.current += delta;

      if (!mouseOnRef.current) {
        vpTgtRef.current.x = VP_X0 + Math.sin(elapsed * 0.18) * DRIFT_X_AMP;
        vpTgtRef.current.y = VP_Y0 + Math.cos(elapsed * 0.12) * DRIFT_Y_AMP;
      }

      vpCurRef.current.x += (vpTgtRef.current.x - vpCurRef.current.x) * LERP;
      vpCurRef.current.y += (vpTgtRef.current.y - vpCurRef.current.y) * LERP;

      redraw();
      rafRef.current = requestAnimationFrame(tick);
    }

    if (!reducedMotion) {
      rafRef.current = requestAnimationFrame(tick);
    }

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
      style={{
        zIndex: -1,
        // Fade the bottom ~35% of the canvas so the perspective floor dissolves
        // into the page background rather than terminating in a hard edge.
        // Applied purely as CSS; no changes to geometry, VP, or drawing code.
        maskImage: 'linear-gradient(to bottom, black 65%, transparent 97%)',
      }}
    />
  );
}
