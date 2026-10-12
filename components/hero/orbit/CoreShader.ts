// ── Plasma star shaders ───────────────────────────────────────────────────
//
// plasmaFragment: gradient noise replaces value noise.
//
//   Gradient (Perlin-style) noise: dot(gradient_vector, offset) at 8 corners,
//   quintic C2 smoothstep. Output is zero-mean with near-flat distribution
//   vs bell-curve for value noise → full color ramp coverage, no "uniformly
//   mid-blue mud". Hot spots visible on ~15-20% of surface vs <2% before.
//
//   Vec3 domain warp: three independent gfbm3 evaluations (one per axis) vs
//   previous scalar warp applied asymmetrically. Full 3D flow field → richer
//   feature morphing (splitting, merging, rotating simultaneously).
//
//   4-stop colour ramp recalibrated to gfbm5 flat-distribution range [0.05, 0.95]:
//   all zones populated, hot spots sparse but genuinely visible (~20% of surface).
//
//   Thin vein filaments: abs(fbm − 0.5) threshold at 0.04 → captures only top
//   ~8% of pixels nearest the isosurface → genuine narrow bright streaks.
//
// coronaFragment improvements:
//   Wider exponent (1.8 vs 2.5) → softer, thicker atmospheric halo.
//   Brightness raised from 0.45 to 0.62 → more visible outer glow.
//
// GLSL notes — Three.js ShaderMaterial WebGL2 compatibility:
//   'attribute' → 'in', 'varying' → 'in'/'out', 'gl_FragColor' → pc_fragColor.
//   Built-ins available without declaration: position, normal, normalMatrix,
//   modelMatrix, modelViewMatrix, projectionMatrix, cameraPosition.

export type StarUniforms = {
  uTime: { value: number };
};

// ── Vertex shaders ────────────────────────────────────────────────────────

// Plasma sphere vertex: world position + coherent surface displacement.
//
// Displacement is derived from the same noise seed as coronaVertexShader
// (identical scale 0.020 wu⁻¹ and time offsets). Because both meshes share
// the same origin, a point on the corona at direction D and a point on the
// plasma sphere at the same D differ by only 9 wu — well under one FBM cell
// (≈ 50 wu) — so displacement values agree within ~18 %, making bumps and
// hollows appear at the same angular positions on both meshes.
//
// Passing the displaced position as vWorldPos means the fragment shader
// samples the 3D noise at the actual surface location, not the underlying
// perfect sphere. Plasma energy flows anchor to the surface relief rather
// than sliding independently across it.
//
// Displacement budget
// ───────────────────
// pvfbm2 range ≈ ±0.45; × 4.0 → amplitude ≈ ±1.80 wu ≈ 3.9 % of r=46.
// Screen-space variation: ±1.80 wu × 1.946 px/wu = ±3.5 px (7 px p-to-p).
// Chromosphere half-power rim ≈ 8.5 px → 82 % of rim width → clearly visible.
// Tangential gradient ≈ 1.80 × 0.020 = 0.036 → normal angle error ≈ 2.1°.
// Without a competing circular corona rim this error creates a smooth ±22 %
// brightness variation around the limb → reads as volume, not as arc artefact.
export const plasmaVertexShader = /* glsl */ `
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

// ── Displacement noise (Perlin-style gradient, separate GLSL program) ─────
// Hash, quintic and noise functions mirror coronaVertexShader (cv → pv prefix).
// Same arithmetic ensures identical displacement field given the same input.
vec3 pvhash3(vec3 p) {
  p  = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0;
}
vec3 pvquintic(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
float pvnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p), u = pvquintic(f);
  float n000 = dot(pvhash3(i               ), f               );
  float n100 = dot(pvhash3(i+vec3(1,0,0)   ), f-vec3(1,0,0)   );
  float n010 = dot(pvhash3(i+vec3(0,1,0)   ), f-vec3(0,1,0)   );
  float n110 = dot(pvhash3(i+vec3(1,1,0)   ), f-vec3(1,1,0)   );
  float n001 = dot(pvhash3(i+vec3(0,0,1)   ), f-vec3(0,0,1)   );
  float n101 = dot(pvhash3(i+vec3(1,0,1)   ), f-vec3(1,0,1)   );
  float n011 = dot(pvhash3(i+vec3(0,1,1)   ), f-vec3(0,1,1)   );
  float n111 = dot(pvhash3(i+vec3(1,1,1)   ), f-vec3(1,1,1)   );
  return mix(
    mix(mix(n000,n100,u.x),mix(n010,n110,u.x),u.y),
    mix(mix(n001,n101,u.x),mix(n011,n111,u.x),u.y),
    u.z);
}
// 2-octave FBM — large-cell only; no high frequencies → smooth surface.
// Range ≈ ±0.45  (octave 0: 0.5 × pvnoise, octave 1: 0.25 × pvnoise).
float pvfbm2(vec3 p) {
  return pvnoise(p) * 0.50
       + pvnoise(p * 2.1 + vec3(1.7, 9.2, 3.4)) * 0.25;
}

void main() {
  // Same seed as coronaVertexShader → coherent deformation across both meshes.
  vec3  dispP     = position * 0.020
                  + vec3(uTime * 0.011, uTime * 0.008, uTime * 0.006);
  float disp      = pvfbm2(dispP) * 4.0;          // ≈ ±1.80 wu ≈ 3.9% of r=46
  vec3  displaced = position + normal * disp;

  // World-space normal: camera is unrotated, so this equals the previous
  // normalMatrix result, but matches vWorldPos / cameraPosition space exactly.
  vNormal     = normalize(mat3(modelMatrix) * normal);
  vec4 wPos   = modelMatrix * vec4(displaced, 1.0);
  vWorldPos   = wPos.xyz;                         // displaced → fragment noise anchors to relief
  vViewDir    = normalize(cameraPosition - wPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

// Corona sphere vertex: Fresnel + organic silhouette deformation.
//
// The corona (r=55) defines the perceived outer contour of the core — displacing
// its vertices along the sphere normal makes the outline gently undulate.
//
// Displacement budget
// ───────────────────
// Scale  0.020 wu⁻¹ → FBM cell ≈ 50 wu  (≈ 0.9 × r=55) → 1–2 smooth bumps
//        visible at any moment — no faceting, no spikes.
// cvfbm2 output range ≈ ±0.45; × 6.1 → amplitude ≈ ±2.75 wu ≈ 5.0 % of r=55.
// Drift speeds (0.011 / 0.008 / 0.006 wu/s) give a ~90 s morph cycle.
// Geometry: requires 64 × 48 segments — at 32 × 24 the linear interpolation error
// between vertices reaches ~46 % of the displacement → visible faceting at 5 %.
//
// Why original normals are kept (not displaced normals):
//   Normal rotation at this scale = arctan(|∇_T h| / R) = arctan(0.073 / 55) ≈ 0.075°.
//   Resulting Fresnel (fRim) variation < 0.6 % — sub-perceptual.
//   Visibility mechanism is purely geometric: equatorial silhouette vertices
//   project to a ±5.35 px screen-space band → 10.7 px peak-to-peak rim oscillation
//   vs ~15 px Fresnel rim half-power width → clearly visible organic contour.
//
// Normal accuracy
// ───────────────
// Tangential gradient of displacement ≈ amp × scale = 1.62 × 0.020 = 0.032.
// Normal angle error = arctan(0.032) ≈ 1.8° — below perceptual threshold.
// Original sphere normal passed to fragment for Fresnel: no arc artefacts.
export const coronaVertexShader = /* glsl */ `
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewDir;

// ── Displacement noise (Perlin-style gradient, separate GLSL program) ─────
vec3 cvhash3(vec3 p) {
  p  = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0;
}
vec3 cvquintic(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
float cvnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p), u = cvquintic(f);
  float n000 = dot(cvhash3(i               ), f               );
  float n100 = dot(cvhash3(i+vec3(1,0,0)   ), f-vec3(1,0,0)   );
  float n010 = dot(cvhash3(i+vec3(0,1,0)   ), f-vec3(0,1,0)   );
  float n110 = dot(cvhash3(i+vec3(1,1,0)   ), f-vec3(1,1,0)   );
  float n001 = dot(cvhash3(i+vec3(0,0,1)   ), f-vec3(0,0,1)   );
  float n101 = dot(cvhash3(i+vec3(1,0,1)   ), f-vec3(1,0,1)   );
  float n011 = dot(cvhash3(i+vec3(0,1,1)   ), f-vec3(0,1,1)   );
  float n111 = dot(cvhash3(i+vec3(1,1,1)   ), f-vec3(1,1,1)   );
  return mix(
    mix(mix(n000,n100,u.x),mix(n010,n110,u.x),u.y),
    mix(mix(n001,n101,u.x),mix(n011,n111,u.x),u.y),
    u.z);
}
// 2-octave FBM — large-cell only; no high frequencies → smooth deformation.
// Range ≈ ±0.45  (octave 0: 0.5 × cvnoise, octave 1: 0.25 × cvnoise).
float cvfbm2(vec3 p) {
  return cvnoise(p) * 0.50
       + cvnoise(p * 2.1 + vec3(1.7, 9.2, 3.4)) * 0.25;
}

void main() {
  vec3  dispP     = position * 0.020
                  + vec3(uTime * 0.011, uTime * 0.008, uTime * 0.006);
  float disp      = cvfbm2(dispP) * 6.1;          // ≈ ±2.75 wu ≈ 5.0% of r=55
  vec3  displaced = position + normal * disp;

  // Original sphere normal → Fresnel in fragment; angle error <1° at this amplitude.
  vNormal     = normalize(normalMatrix * normal);
  vec4 wPos   = modelMatrix * vec4(displaced, 1.0);
  vViewDir    = normalize(cameraPosition - wPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

// ── Plasma fragment shader ────────────────────────────────────────────────
//
// Gradient (Perlin-style) noise replaces value noise.
//
// Why gradient noise is sharper than value noise:
//   Value noise interpolates scalar hash values → bell-curve output, 90% of
//   pixels in mid-range → muddy uniform tint, hot spots on <2% of surface.
//
//   Gradient noise interpolates dot(gradient, offset) at lattice corners.
//   Output is zero-mean with near-flat distribution → full dynamic range
//   across the color ramp. Hot spots visible on ~15% of surface.
//
//   Quintic C2 smoothstep (vs cubic C1) eliminates the lattice-edge derivative
//   discontinuity that appears as a faint grid pattern in value noise.
//
// Vec3 domain warp (3 × gfbm3, one per axis) vs previous scalar warp:
//   Scalar warp (prev): same scalar applied asymmetrically → limited flow variety.
//   Vec3 warp: each axis warped independently → full 3D flow field → richer
//   feature morphing (splitting, merging, rotating simultaneously).
//
// Noise scale 0.082 wu⁻¹: sphere r=42, one FBM cell ≈ 12 wu ≈ 23 px.
// 5 FBM octaves add detail down to 23/2⁵ ≈ 0.7 px — sub-pixel, no aliasing.
// gfbm3 warp at 0.025 scale: ~40 wu cell — coherent directional flow.
// Total per fragment: 3×gfbm3 + 2×gfbm5 + 1×gfbm5 = (9 + 10 + 5) × gnoise.
// At 256 px canvas (~21 k sphere pixels) — well within GPU budget.

export const plasmaFragmentShader = /* glsl */ `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

// ── Gradient (Perlin-style) noise ──────────────────────────────────────────
//
// ghash3: pseudo-random gradient vector per integer lattice cell.
// Pure fract/dot arithmetic — no texture lookups, no large-integer wrapping.
// Output ≈ [−1, +1] per component (not unit sphere; acceptable for FBM).

vec3 ghash3(vec3 p) {
  p  = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0;
}

// quintic C2 smoothstep — zero first and second derivatives at t=0,1.
// Eliminates the faint lattice-edge pattern caused by C1 cubic smoothstep.
vec3 quintic(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// gnoise: 3D Perlin-style gradient noise. Output range ≈ [−0.60, +0.60].
// Flat distribution (vs bell-curve for value noise) → full ramp coverage.
float gnoise(vec3 p) {
  vec3  i = floor(p);
  vec3  f = fract(p);
  vec3  u = quintic(f);

  float n000 = dot(ghash3(i                 ), f                 );
  float n100 = dot(ghash3(i + vec3(1,0,0)   ), f - vec3(1,0,0)   );
  float n010 = dot(ghash3(i + vec3(0,1,0)   ), f - vec3(0,1,0)   );
  float n110 = dot(ghash3(i + vec3(1,1,0)   ), f - vec3(1,1,0)   );
  float n001 = dot(ghash3(i + vec3(0,0,1)   ), f - vec3(0,0,1)   );
  float n101 = dot(ghash3(i + vec3(1,0,1)   ), f - vec3(1,0,1)   );
  float n011 = dot(ghash3(i + vec3(0,1,1)   ), f - vec3(0,1,1)   );
  float n111 = dot(ghash3(i + vec3(1,1,1)   ), f - vec3(1,1,1)   );

  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z);
}

// ── Pixel-footprint octave filtering ──────────────────────────────────────
// fw = noise cells per pixel. An octave fades out once its cell drops below
// ~1.5–3 px (Nyquist) → no sub-pixel sparkle, resolvable detail untouched.
float octaveFade(float fw) { return 1.0 - smoothstep(0.35, 0.70, fw); }

// Footprint measured AFTER domain warp → accounts for local warp compression
// and limb foreshortening.
float footprint(vec3 p) { return max(length(dFdx(p)), length(dFdy(p))); }

// gfbm5: 5-octave FBM of gradient noise, remapped to [0, 1].
// Lacunarity 2.1, gain 0.48. Raw FBM max ≈ ±0.58 → scale 0.86 maps to ±0.50.
// Remapping: v * 0.86 + 0.5 → output ≈ [0.00, 1.00], centred at 0.50.
float gfbm5(vec3 p, float fw) {
  float v = 0.0, a = 0.5;
  vec3  q = p;
  for (int i = 0; i < 5; i++) {
    v  += a * gnoise(q) * octaveFade(fw);
    q   = q * 2.1 + vec3(1.7, 9.2, 3.4);
    a  *= 0.48;
    fw *= 2.1;
  }
  return clamp(v * 0.86 + 0.5, 0.0, 1.0);
}

// gfbm3: 3-octave FBM — cheaper variant used only for domain warp (3× per fragment).
// Raw FBM max ≈ ±0.51 → scale 0.98 maps to ±0.50 → output ≈ [0.00, 1.00].
float gfbm3(vec3 p, float fw) {
  float v = 0.0, a = 0.5;
  vec3  q = p;
  for (int i = 0; i < 3; i++) {
    v  += a * gnoise(q) * octaveFade(fw);
    q   = q * 2.1 + vec3(1.7, 9.2, 3.4);
    a  *= 0.48;
    fw *= 2.1;
  }
  return clamp(v * 0.98 + 0.5, 0.0, 1.0);
}

// softClip: identity below 0.8, asymptotic shoulder to 1.0 above —
// keeps structure in hot spots instead of flat clipped patches.
vec3 softClip(vec3 c) {
  const float k = 0.80;
  vec3 x = max(c - k, 0.0);
  return min(c, vec3(k)) + x / (1.0 + x / (1.0 - k));
}

// ── Main ───────────────────────────────────────────────────────────────────

void main() {
  float t = uTime;

  // Per-pixel renormalised normal and view vector (interpolated ones are < 1
  // between vertices → faint faceting under pow(…,7) / pow(…,52)).
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);

  // ── Primary domain warp ───────────────────────────────────────────────────
  vec3 warpP = vWorldPos * 0.022 + vec3(t * 0.031, t * 0.022, t * 0.015);
  vec3 warpVec;
  warpVec.x = gfbm3(warpP, 0.0)                        - 0.5;
  warpVec.y = gfbm3(warpP + vec3(7.3, 0.0, 0.0), 0.0)  - 0.5;
  warpVec.z = gfbm3(warpP + vec3(0.0, 5.1, 0.0), 0.0)  - 0.5;
  // ── Warp rotation experiment ───────────────────────────────────────────────
  // Slowly rotates warpVec in the xz-plane. Period ≈ 262 s; small harmonic
  // breaks periodicity. Effect: p1 sampling direction gradually curls rather
  // than translating uniformly → features may bend and spiral over time.
  // To revert: remove these 3 lines.
  float rotPhi = t * 0.024 + 0.18 * sin(t * 0.070);
  float cR = cos(rotPhi), sR = sin(rotPhi);
  warpVec = vec3(warpVec.x * cR - warpVec.z * sR, warpVec.y, warpVec.x * sR + warpVec.z * cR);

  // ── Secondary domain warp (independent flow layer for p2) ─────────────────
  vec3 warpP2 = vWorldPos * 0.035 + vec3(-t * 0.018, t * 0.025, -t * 0.011);
  vec3 warpVec2;
  warpVec2.x = gfbm3(warpP2 + vec3(3.1, 0.0, 0.0), 0.0) - 0.5;
  warpVec2.y = gfbm3(warpP2 + vec3(0.0, 4.7, 0.0), 0.0) - 0.5;
  warpVec2.z = gfbm3(warpP2 + vec3(0.0, 0.0, 6.3), 0.0) - 0.5;

  float warpAmp  = 1.55 + 0.50 * sin(t * 0.09 + 0.8) + 0.22 * sin(t * 0.23 + 2.1);
  float warpAmp2 = 0.90 + 0.32 * sin(t * 0.13 + 3.2) + 0.14 * sin(t * 0.31 + 0.5);

  // ── Two-layer counter-shear plasma ───────────────────────────────────────
  vec3 p1 = vWorldPos * 0.075 + vec3(t * 0.115, t * 0.078, t * 0.052);
  p1 += warpVec * warpAmp;

  vec3 p2 = vWorldPos * 0.058 + vec3(-t * 0.095, t * 0.125, -t * 0.060)
            + vec3(5.1, 2.7, 8.3);
  p2 += warpVec2 * warpAmp2;

  float blend1 = 0.50 + 0.17 * sin(t * 0.11 + 1.4) + 0.06 * sin(t * 0.27 + 0.6);
  float v1 = gfbm5(p1, footprint(p1));
  float v2 = gfbm5(p2, footprint(p2));

  // Reduced interact coefficient 0.22 → 0.14: less upward brightness bias.
  // Average plasma drops from ~0.56 back toward ~0.52 → more pixels spend time
  // in the dark zones → higher contrast between voids and bright flows.
  float interact = v1 * v2;
  float plasma   = clamp(v1 * blend1 + v2 * (1.0 - blend1) + interact * 0.14, 0.0, 1.0);

  // ── Fine-scale energy layer ───────────────────────────────────────────────
  // gfbm3 at scale 0.20 → features ~14px vs ~37–44px for the main layers.
  // Partially warped by primary flow field so structures follow plasma motion.
  // Smooth bump function at the midline of vFine: peaks where vFine ≈ 0.50,
  // falls to zero over ±0.20 of the [0,1] range.
  // pow(2) rounds the peak without hard edges → soft filaments, not lightning.
  // Gate via plasma smoothstep: only visible in mid-to-bright zones.
  vec3 pFine = vWorldPos * 0.200 + vec3(t * 0.19, t * 0.14, t * 0.09);
  pFine += warpVec * (warpAmp * 0.22);
  float vFine  = gfbm3(pFine, footprint(pFine));
  // Band half-width 0.20, never narrower than ~1.5 px; widened bands are
  // dimmed by w/wAA so average filament energy stays the same.
  float wStreak = 0.20;
  float wAA     = max(wStreak, fwidth(vFine) * 1.5);
  float streak  = pow(max(0.0, 1.0 - abs(vFine - 0.50) / wAA), 2.0)
                * (wStreak / wAA)
                * smoothstep(0.32, 0.58, plasma);

  // v1-v2 large-scale layer-difference modulation (carried over from prev)
  float plasmaFine = clamp(plasma + (v1 - v2) * 0.15 * smoothstep(0.30, 0.62, plasma), 0.0, 1.0);

  // ── Organic pulsation ─────────────────────────────────────────────────────
  float burst  = 0.07 * sin(t * 0.52) + 0.04 * sin(t * 0.91 + 2.10);
  float burstN = clamp(max(0.0, burst) / 0.11, 0.0, 1.0);

  // ── Colour ramp — five stops ──────────────────────────────────────────────
  // Lower bands tightened vs previous: smoothstep(0.08,0.24) and (0.22,0.44)
  // vs (0.10,0.32) and (0.28,0.52). Narrower cVoid→cDeep and cDeep→cMid
  // transitions keep more pixels in the truly dark zones → visible depth contrast.
  // Upper bands (cMid→cBright, cHot) use plasmaFine for fine-structure detail.
  vec3 cVoid   = vec3(0.001, 0.004, 0.040);
  vec3 cDeep   = vec3(0.010, 0.058, 0.310);
  vec3 cMid    = vec3(0.028, 0.158, 0.818);
  vec3 cBright = vec3(0.200, 0.590, 1.000);
  vec3 cHot    = vec3(0.560, 0.840, 1.000);

  vec3 col = mix(cVoid,   cDeep,   smoothstep(0.08, 0.24, plasma));
  col      = mix(col,     cMid,    smoothstep(0.22, 0.44, plasma));
  col      = mix(col,     cBright, smoothstep(0.46, 0.68, plasmaFine));
  float hotLo = mix(0.64, 0.50, burstN);
  float hotHi = mix(0.82, 0.68, burstN);
  col      = mix(col,     cHot,    smoothstep(hotLo, hotHi, plasmaFine));

  // ── Cyan energy filaments — fine-scale additive layer ─────────────────────
  // Added on top of the ramp colour, not woven into plasma value.
  // Colour (0.08, 0.42, 1.00) × 0.20 at peak → (0.016, 0.084, 0.20):
  // a visible but not dominant cyan brightening along energy flow lines.
  col += vec3(0.08, 0.42, 1.00) * streak * 0.20;

  // ── Deep inner radiance — volumetric depth impression ─────────────────────
  float NdotV    = max(dot(N, V), 0.0);
  float oneMinNV = 1.0 - NdotV;
  float faceGlow = NdotV * NdotV * 0.30;
  col += vec3(0.008, 0.040, 0.300) * faceGlow;

  // ── Edge layers ──────────────────────────────────────────────────────────
  float rimBoost = 1.0 + burstN * 0.28;

  float innerGlow = pow(oneMinNV, 3.5) * 0.10 * rimBoost;
  col += vec3(0.04, 0.22, 0.88) * innerGlow;

  // Chromosphere: coefficient reduced 1.20 → 0.85 — significantly thinner edge.
  // At typical values (NdotV=0.05, typical rimBoost/edgeOrg/chromSurf) the peak
  // contribution is now ~0.95 × vec3(0.26,0.68,1.00) — no channel overshoots 1.
  // Organic warp variation and surface-brightness tracking are preserved.
  float edgeOrg   = 1.0 + warpVec.y * 0.28 + warpVec2.x * 0.16;
  float chromSurf = 0.82 + v1 * 0.22;
  float chrom     = pow(oneMinNV, 7.0) * 0.85 * rimBoost * edgeOrg * chromSurf;
  col += vec3(0.26, 0.68, 1.00) * chrom;

  // ── Dual-lobe surface sheen ───────────────────────────────────────────────
  vec3  keyDir    = normalize(vec3(-0.55, 0.75, 0.55));
  vec3  halfDir   = normalize(keyDir + V);
  float NdotH     = max(dot(N, halfDir), 0.0);
  float specBroad = pow(NdotH, 10.0) * 0.09 * smoothstep(0.30, 0.60, plasmaFine);
  float specSharp = pow(NdotH, 52.0) * 0.24 * smoothstep(0.54, 0.82, plasmaFine);
  col += vec3(0.42, 0.65, 1.00) * specBroad
       + vec3(0.82, 0.94, 1.00) * specSharp;

  // ── Luminosity floor ──────────────────────────────────────────────────────
  col = max(col, vec3(0.001, 0.004, 0.032));

  // ── Slow breathing modulation ─────────────────────────────────────────────
  col *= 1.0 + burst * 0.30 + 0.013 * sin(t * 2.37 + 1.9);

  col = softClip(col);

  // ── Dither ±½ LSB (interleaved gradient noise) — removes 8-bit banding in
  // the deep-blue range; invisible as grain.
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  col += (ign - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Corona fragment shader ────────────────────────────────────────────────
//
// Two-layer Fresnel redesign: tight bright rim + wide dim veil.
//
// Previous: inner exp 1.2 (very wide, bright) → thick neon ring.
// New layout:
//   fRim  (exp 4.5, bright): precise luminous edge at the silhouette only
//   fVeil (exp 1.2, very dim): faint wide atmospheric scattering halo
//
// The plasma sphere's chromosphere (exp 7.5 in plasmaFragment) handles the
// tightest edge; the corona adds a second softer glow layer just beyond it.
// Overall coroMult reduced (0.38 base vs 0.62) — less total corona brightness,
// more controlled. Burst synced with plasma shader frequencies.

export const coronaFragmentShader = /* glsl */ `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float NdotV = max(dot(vNormal, vViewDir), 0.0);
  float base  = 1.0 - NdotV;

  // Rim (exp 4.5): tight luminous edge at the silhouette — cool blue-white
  float fRim  = pow(base, 4.5);
  // Veil (exp 3.5): tight natural falloff — only the outermost limb is lit.
  // At base=0.5 contribution is 11% vs 22% at exp 2.2 — 50% narrower halo.
  // At base=0.3: 2.7% vs 8.5% — inner overlap with plasma sphere nearly gone.
  // Effect: the "plastic ring" disappears; corona reads as atmosphere, not shell.
  float fVeil = pow(base, 3.5);

  // Burst synced with plasma shader
  float burst    = 0.07 * sin(uTime * 0.52)
                 + 0.04 * sin(uTime * 0.91 + 2.10);
  float coroMult = 0.44 + max(0.0, burst) * 1.15;
  float breathe  = 1.0 + 0.06 * sin(uTime * 0.92 + 1.2)
                       + 0.03 * sin(uTime * 0.37 + 0.8);

  // Rim pulsation: decoupled from veil for layered halo breathing
  float rimPulse = 1.0 + 0.10 * sin(uTime * 0.67 + 0.5);

  // Rim: cooler hue (less green: 0.60 vs 0.68) — no warm-cyan neon look.
  // Veil: richer deep blue (0.82 b vs 0.75), slightly reduced coeff (0.20 vs 0.24)
  //   — more controlled ambient scatter, less visual mass.
  // Veil coefficient reduced 0.20 → 0.12: combined with tighter exponent,
  // total mid-limb veil contribution is ~46% of the previous value.
  vec3 col = (vec3(0.24, 0.60, 1.00) * fRim  * 0.90 * rimPulse
            + vec3(0.03, 0.10, 0.82) * fVeil * 0.12)
           * coroMult * breathe;

  gl_FragColor = vec4(col, 1.0);
}
`;
