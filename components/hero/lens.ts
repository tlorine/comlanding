// ── Gravitational-lens optical parameters ───────────────────────────────────
//
// Used by GridBackground (floor-line curvature, thermal shimmer) and
// HazeCompositor. LENS_CX / LENS_CY also serve as NebulaBackground's fallback
// sphere position before the core element is measured.
//
// Lens center in normalised UV space [0..1] × [0..1] — matches the
// approximate screen position of the plasma core inside the Hero layout.
export const LENS_CX = 0.69;
export const LENS_CY = 0.44;

// Inner hard radius: no distortion inside the sphere silhouette.
// Outer falloff radius: effect decays smoothly to zero beyond this.
export const LENS_R_INNER = 0.06;
export const LENS_R_OUTER = 0.24;

// Displacement strength for each consumer.
export const LENS_FLOOR_K = 0.022; // fraction of canvas width, grid lines

/**
 * Quartic bell profile — smooth zero at both ends, single peak at t = 0.5.
 *   f(r_inner) = 0,  f(r_mid) = 1,  f(r_outer) = 0
 */
export function lensProfile(r: number): number {
  if (r <= LENS_R_INNER || r >= LENS_R_OUTER) return 0;
  const t = (r - LENS_R_INNER) / (LENS_R_OUTER - LENS_R_INNER);
  return 16 * t * t * (1 - t) * (1 - t);
}

/**
 * Displace a canvas pixel (px, py) radially OUTWARD from the lens centre.
 * Used for grid floor lines — bends them away from the sphere, simulating
 * space-time curvature bending light paths.
 *
 * @param px   pixel x coordinate
 * @param py   pixel y coordinate
 * @param W    canvas CSS width
 * @param H    canvas CSS height
 * @param k    displacement strength (fraction of canvas width at peak)
 * @returns    displaced [x, y] in canvas pixels
 */
export function lensDisplace(
  px: number, py: number,
  W: number,  H: number,
  k: number,
): [number, number] {
  const u  = px / W;
  const v  = py / H;
  const du = u - LENS_CX;
  const dv = v - LENS_CY;
  const r  = Math.sqrt(du * du + dv * dv);
  const d  = lensProfile(r) * k;
  if (r < 1e-6 || d === 0) return [px, py];
  return [px + (du / r) * d * W, py + (dv / r) * d * H];
}

/**
 * Displace a UV coordinate INWARD toward the lens centre before noise
 * sampling.  Sampling a more central (denser) region makes the rendered
 * pixel appear to show nebula from behind the lens — the apparent effect
 * is outward magnification, matching gravitational lensing.
 *
 * @param u  horizontal UV [0..1]
 * @param v  vertical   UV [0..1]
 * @param k  displacement strength in UV units
 * @returns  displaced [u, v]
 */
export function lensDisplaceUV(
  u: number, v: number,
  k: number,
): [number, number] {
  const du = u - LENS_CX;
  const dv = v - LENS_CY;
  const r  = Math.sqrt(du * du + dv * dv);
  const d  = lensProfile(r) * k;
  if (r < 1e-6 || d === 0) return [u, v];
  return [u - (du / r) * d, v - (dv / r) * d];
}
