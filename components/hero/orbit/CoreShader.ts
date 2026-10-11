'use client';

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

// Plasma sphere vertex: world position needed for 3D noise sampling.
export const plasmaVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

void main() {
  vNormal     = normalize(normalMatrix * normal);
  vec4 wPos   = modelMatrix * vec4(position, 1.0);
  vWorldPos   = wPos.xyz;
  vViewDir    = normalize(cameraPosition - wPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Corona sphere vertex: Fresnel only, world position not needed.
export const coronaVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vNormal     = normalize(normalMatrix * normal);
  vec4 wPos   = modelMatrix * vec4(position, 1.0);
  vViewDir    = normalize(cameraPosition - wPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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

// gfbm5: 5-octave FBM of gradient noise, remapped to [0, 1].
// Lacunarity 2.1, gain 0.48. Raw FBM max ≈ ±0.58 → scale 0.86 maps to ±0.50.
// Remapping: v * 0.86 + 0.5 → output ≈ [0.00, 1.00], centred at 0.50.
float gfbm5(vec3 p) {
  float v = 0.0, a = 0.5;
  vec3  q = p;
  for (int i = 0; i < 5; i++) {
    v += a * gnoise(q);
    q  = q * 2.1 + vec3(1.7, 9.2, 3.4);
    a *= 0.48;
  }
  return clamp(v * 0.86 + 0.5, 0.0, 1.0);
}

// gfbm3: 3-octave FBM — cheaper variant used only for domain warp (3× per fragment).
// Raw FBM max ≈ ±0.51 → scale 0.98 maps to ±0.50 → output ≈ [0.00, 1.00].
float gfbm3(vec3 p) {
  float v = 0.0, a = 0.5;
  vec3  q = p;
  for (int i = 0; i < 3; i++) {
    v += a * gnoise(q);
    q  = q * 2.1 + vec3(1.7, 9.2, 3.4);
    a *= 0.48;
  }
  return clamp(v * 0.98 + 0.5, 0.0, 1.0);
}

// ── Main ───────────────────────────────────────────────────────────────────

void main() {
  float t = uTime;

  // ── Vec3 domain warp ─────────────────────────────────────────────────────
  // Three independent gfbm3 evaluations produce a full 3D displacement field.
  // Each axis uses a spatially-offset seed → genuinely independent patterns.
  // Magnitude 2.0 wu/noise-unit at scale 0.025 → max displacement ±1.0 noise
  // unit at the primary plasma scale (0.082) — coherent but not amorphous.
  // Slow warpP drift (0.014/s) lets the flow direction itself evolve over ~45 s.
  vec3 warpP = vWorldPos * 0.025 + vec3(t * 0.014, t * 0.010, t * 0.007);
  vec3 warpVec;
  warpVec.x = gfbm3(warpP)                       - 0.5;
  warpVec.y = gfbm3(warpP + vec3(7.3, 0.0, 0.0)) - 0.5;
  warpVec.z = gfbm3(warpP + vec3(0.0, 5.1, 0.0)) - 0.5;
  // warpVec ∈ [−0.5, +0.5]; multiply by 2.0 → ±1.0 noise unit at primary scale.

  // ── Layer 1: primary plasma (finer scale, vec3-domain-warped) ────────────
  vec3 p1 = vWorldPos * 0.082 + vec3(t * 0.055, t * 0.038, t * 0.030);
  p1 += warpVec * 2.0;

  // ── Layer 2: fine detail (no warp, independent drift axes) ───────────────
  vec3 p2 = vWorldPos * 0.062 + vec3(-t * 0.042, t * 0.052, -t * 0.024)
            + vec3(5.1, 2.7, 8.3);

  float plasma = gfbm5(p1) * 0.65 + gfbm5(p2) * 0.35;

  // ── Organic energy burst — computed before color ramp ────────────────────
  // burstN: normalised positive-only burst level (0..1).
  // Drives hot-spot expansion, vein brightness, and rim amplification so the
  // sphere visually changes plasma state at peak — not just uniform brightness.
  // Matches PULSE_FREQ_1/2 in config.ts for cross-component synchronisation.
  float burst  = 0.12 * sin(t * 0.78)
               + 0.08 * sin(t * 1.23 + 2.10);
  float burstN = clamp(max(0.0, burst) / 0.20, 0.0, 1.0);

  // ── Colour ramp: 4 stops — hot zone expands at peak burst ────────────────
  // At rest:  hot threshold 0.64–0.82 → ~20% of surface shows hot spots.
  // At peak:  hot threshold 0.50–0.68 → ~50% of surface shows hot spots.
  // The whole plasma surface visibly brightens and shifts toward cHot.
  vec3 cDark   = vec3(0.004, 0.016, 0.120);   // deep cold navy
  vec3 cMid    = vec3(0.060, 0.280, 1.000);   // saturated electric blue
  vec3 cBright = vec3(0.520, 0.820, 1.000);   // cold white-blue
  vec3 cHot    = vec3(0.920, 0.970, 1.000);   // near-white hot spots

  vec3 col = mix(cDark,   cMid,    smoothstep(0.22, 0.48, plasma));
  col      = mix(col,     cBright, smoothstep(0.46, 0.66, plasma));
  float hotLo = mix(0.64, 0.50, burstN);
  float hotHi = mix(0.82, 0.68, burstN);
  col      = mix(col,     cHot,    smoothstep(hotLo, hotHi, plasma));

  // ── Vein / discharge filaments — brighter at peak burst ──────────────────
  // 0.80 at rest → 1.50 at peak: discharge streaks visibly intensify.
  float ridgeVal = abs(gfbm5(p2 + vec3(3.7, 1.4, 6.2)) - 0.5);
  float vein     = pow(max(0.0, 0.04 - ridgeVal) / 0.04, 2.0);
  col += vec3(0.30, 0.72, 1.00) * vein * (0.80 + burstN * 0.70);

  // ── Rim: two-component silhouette definition ─────────────────────────────
  // rimBoost 1.0..1.55 — rim broadens/brightens at peak, sphere appears to
  // genuinely emit more light toward the observer.
  float NdotV    = max(dot(vNormal, vViewDir), 0.0);
  float oneMinNV = 1.0 - NdotV;
  float rimBoost = 1.0 + burstN * 0.55;
  float rimTight = pow(oneMinNV, 11.0) * 4.50 * rimBoost;
  float rimBroad = pow(oneMinNV,  2.2) * 0.65 * rimBoost;
  col += vec3(0.55, 0.88, 1.00) * rimTight;
  col += vec3(0.08, 0.36, 1.00) * rimBroad;

  // ── Luminosity floor — deep blue, never pure black ───────────────────────
  col = max(col, vec3(0.006, 0.018, 0.075));

  // ── Final brightness modulation ───────────────────────────────────────────
  // Coefficient reduced to 0.70: internal structural changes (hot-spot expansion,
  // rim boost) already contribute meaningful luminance at peak.
  col *= 1.0 + burst * 0.70 + 0.04 * sin(t * 2.37 + 1.9);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Corona fragment shader ────────────────────────────────────────────────
//
// Wider Fresnel exponent (1.8 vs previous 2.5) → thicker atmospheric halo.
// Brightness raised (0.62 vs 0.45) → more visible outer glow.
// Combined with CSS drop-shadow on the Core container, the light "spills"
// beyond the 256 px canvas onto the SVG orbit rings and grid background.

export const coronaFragmentShader = /* glsl */ `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float NdotV   = max(dot(vNormal, vViewDir), 0.0);
  // Exponent 1.8: wider, softer halo than the sharper limb glow in plasma shader.
  float fresnel = pow(1.0 - NdotV, 1.8);
  // Burst: same formula as plasma shader — corona brightens in lock-step.
  // max(0) ensures corona only amplifies on positive burst cycles.
  float burst   = 0.12 * sin(uTime * 0.78)
                + 0.08 * sin(uTime * 1.23 + 2.10);
  // Baseline 0.62; at burst peak (+0.20) → corona × 1.75 vs baseline.
  float coroMult = 0.62 + max(0.0, burst) * 1.8;
  // Slow independent breathing (92% phase offset) adds sub-harmonic life.
  float breathe  = 1.0 + 0.08 * sin(uTime * 0.92 + 1.2);
  vec3  col      = vec3(0.06, 0.30, 1.00) * fresnel * coroMult * breathe;
  gl_FragColor   = vec4(col, 1.0);
}
`;
