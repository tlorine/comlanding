// ── Gravitational-lens optical parameters ───────────────────────────────────
//
// Shared by GridBackground (floor-line curvature) and NebulaBackground
// (UV magnification).  Both effects use the same bell profile so the
// distortion field reads as a single coherent physical lens.
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
export const LENS_FLOOR_K    = 0.022;  // fraction of canvas width, grid lines
export const LENS_NEBULA_UV_K = 0.030; // UV units, nebula inward sampling

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
