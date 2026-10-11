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

  // ── Primary floor horizontal lines ───────────────────────────────────────
  for (let i = 1; i <= P_ROWS; i++) {
    const t  = (i / P_ROWS) ** PERSP_EXP;
    const y  = vpy + floorH * t;
    const op = t ** 0.40 * P_OP;
    const lw = 0.32 + t * 0.48;
    const xl = Math.max(0, vpx + (-FLOOR_EXT * W - vpx) * t);
    const xr = Math.min(W, vpx + ((1 + FLOOR_EXT) * W - vpx) * t);

    if (t > 0.70) {
      ctx.save();
      ctx.shadowColor = `rgba(${CR},${CG},${CB},0.18)`;
      ctx.shadowBlur  = 4;
      ctx.strokeStyle = edgeFade(op);
      ctx.lineWidth   = lw;
      ctx.beginPath();
      ctx.moveTo(xl, y);
      ctx.lineTo(xr, y);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = edgeFade(op);
      ctx.lineWidth   = lw;
      ctx.beginPath();
      ctx.moveTo(xl, y);
      ctx.lineTo(xr, y);
      ctx.stroke();
    }
  }

  // ── Secondary floor horizontal lines ─────────────────────────────────────
  ctx.lineWidth = 0.22;
  for (let i = 1; i <= S_ROWS; i++) {
    const t  = (i / S_ROWS) ** PERSP_EXP;
    const y  = vpy + floorH * t;
    const op = t ** 0.44 * S_OP;
    const xl = Math.max(0, vpx + (-FLOOR_EXT * W - vpx) * t);
    const xr = Math.min(W, vpx + ((1 + FLOOR_EXT) * W - vpx) * t);
    ctx.strokeStyle = edgeFade(op);
    ctx.beginPath();
    ctx.moveTo(xl, y);
    ctx.lineTo(xr, y);
    ctx.stroke();
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
        drawGrid(ctx, w, h, vpCurRef.current);
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

    const t0 = performance.now();

    function tick(now: number): void {
      const elapsed = (now - t0) / 1000;

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
      style={{ zIndex: -1 }}
    />
  );
}
