'use client';

// ── HazeCompositor ────────────────────────────────────────────────────────────
//
// Screen-space thermal refraction around the plasma core.
//
// Each frame the hidden GridBackground canvas is uploaded as a texture and
// redrawn with an animated UV displacement in a ring around the sphere.
// The result sits at z=-1; NebulaBackground stays a visible DOM element at
// z=-2 with its original CSS blur — no shader approximation of that blur needed.
//
//   z=-2  NebulaBackground  visible, CSS blur(6px)           ← unchanged
//   z=-1  GridBackground    hidden, feeds TEXTURE0 here      ← data-haze-source="grid"
//   z=-1  HazeCompositor    this canvas; outputs grid+haze   ← this file
//   z≥0   Hero content
//
// Displacement design
// ───────────────────
//  • Zone: ring just outside sphere silhouette (HR_IN) to ~2.5 radii (HR_OUT).
//  • Envelope: asymmetric bell — 100% above sphere (hot air rises), 70% at
//    sides, 40% below.  Peak at ~20% of the HR_IN→HR_OUT span (corona zone).
//  • FBM: two octaves, independent X/Y drift, vertical component boosted ×1.8.
//    Pattern drifts upward slowly (SV < 0 in GL UV convention).
//  • AMP: 7px at section width ≈ 1392px.  Raise to 0.010 for stronger demo.
//
// Technical notes
// ───────────────
//  UNPACK_FLIP_Y_WEBGL=true  — canvas row-0 (visual top) → texture t=1,
//                              matching standard GL vUv (y=0 at bottom).
//  premultipliedAlpha:true   — Canvas 2D stores premultiplied pixels;
//                              texImage2D passes them verbatim; the browser
//                              reads the framebuffer as premultiplied.
//                              gl_FragColor = texture2D(uGrid, sUV) is correct
//                              with no additional alpha manipulation.

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './hooks/useReducedMotion';
import { LENS_CX, LENS_CY } from './lens';

// ── Haze parameters ───────────────────────────────────────────────────────────
//
// Sphere visual radius ≈ 85 px at section width ≈ 1392 px.
// In normalised horizontal-UV units: 85/1392 ≈ 0.061.
//
// HR_IN  = 0.062 →  86 px  (at sphere silhouette)
// HR_OUT = 0.155 → 216 px  (~2.5 sphere radii from centre)
// AMP    = 0.005 →   7 px  (raise to 0.010 for a stronger demo)

const HAZE_AMP    = 0.005;
const HAZE_HR_IN  = 0.062;
const HAZE_HR_OUT = 0.155;

// Sphere centre in GL UV (y=0 at bottom; LENS_CY is CSS "from top").
const HAZE_CX    = LENS_CX;
const HAZE_CY_GL = 1.0 - LENS_CY;

// FBM: two octaves, independent drift axes.
// F = noise frequency in UV units (cell size ≈ W/F).
// SU = horizontal drift speed (UV/sec); SV = vertical (negative → pattern drifts upward).
const F1  = 4.5;    // large blobs  ≈ 309 px
const F2  = 9.0;    // fine texture ≈ 155 px
const SU1 = 0.025;
const SV1 = -0.055; // upward drift
const SU2 = 0.045;
const SV2 = -0.090; // upward drift, second octave

// Vertical displacement is emphasised — convective columns rise.
const Y_BIAS = 1.8;

// ── GLSL ─────────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
attribute vec2 aPos;
varying   vec2 vUv;
void main() {
  vUv         = aPos * 0.5 + 0.5; // y=0 at screen bottom
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = /* glsl */`
precision mediump float;
varying vec2 vUv;

uniform sampler2D uGrid;
uniform float     uTime;
uniform float     uAspect;
uniform float     uActive; // 0 when prefers-reduced-motion, else 1

const float HCX    = ${HAZE_CX.toFixed(5)};
const float HCY    = ${HAZE_CY_GL.toFixed(5)};
const float HR_IN  = ${HAZE_HR_IN.toFixed(5)};
const float HR_OUT = ${HAZE_HR_OUT.toFixed(5)};
const float AMP    = ${HAZE_AMP.toFixed(5)};
const float F1     = ${F1.toFixed(1)};
const float F2     = ${F2.toFixed(1)};
const float SU1    = ${SU1.toFixed(4)};
const float SV1    = ${SV1.toFixed(4)};
const float SU2    = ${SU2.toFixed(4)};
const float SV2    = ${SV2.toFixed(4)};
const float Y_BIAS = ${Y_BIAS.toFixed(2)};

// ── Value noise ───────────────────────────────────────────────────────────────

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i),                  hash2(i + vec2(1.0, 0.0)), u.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

// Two-octave FBM → [−1, +1].
// Y component boosted by Y_BIAS (vertical displacement stronger than horizontal).
// Seeded with offset constants so X and Y are independent fields.
vec2 hazeDisp(vec2 uv, float t) {
  float dx = vnoise(uv * F1 + vec2(t * SU1,       t * SV1      ))
           + vnoise(uv * F2 + vec2(t * SU2,       t * SV2      )) * 0.5;
  float dy = vnoise(uv * F1 + vec2(t * SV1 + 3.7, t * SU1 + 1.3))
           + vnoise(uv * F2 + vec2(t * SV2 + 2.1, t * SU2 + 4.5)) * 0.5;
  vec2 raw = (vec2(dx, dy) / 1.5 - 0.5) * 2.0; // remap to [−1, +1]
  return vec2(raw.x, raw.y * Y_BIAS);
}

// Envelope: radial bell × asymmetric vertical bias.
// dy_norm: normalised aspect-corrected vertical direction from sphere centre.
//   +1 = directly above sphere (GL y), −1 = directly below.
// Bias: 1.0 above, 0.70 at sides, 0.40 below → heat rises from the top.
float hazeEnv(float r, float dy_norm) {
  if (r < HR_IN || r >= HR_OUT) return 0.0;
  float span = HR_OUT - HR_IN;
  float t    = (r - HR_IN) / span;
  float bell = 3.5 * sqrt(t) * (1.0 - t) * (1.0 - t); // peaks at t≈0.2
  float bias = 0.40 + 0.60 * clamp(0.5 + dy_norm * 0.5, 0.0, 1.0);
  return bell * bias;
}

void main() {
  vec2  uv      = vUv;
  vec2  dv      = uv - vec2(HCX, HCY);
  float dv_y_a  = dv.y / uAspect;                         // aspect-corrected vertical
  float r       = length(vec2(dv.x, dv_y_a));             // circular ring in screen px
  float dy_norm = (r > 1e-5) ? dv_y_a / r : 0.0;         // −1..+1, positive = above

  float env  = hazeEnv(r, dy_norm) * uActive;
  vec2  sUV  = clamp(uv + hazeDisp(uv, uTime) * env * AMP, 0.001, 0.999);

  // Grid pixels are premultiplied (Canvas 2D).
  // Nebula is a separate visible DOM canvas below — composited by the browser.
  gl_FragColor = texture2D(uGrid, sUV);
}`;

// ── WebGL boilerplate ─────────────────────────────────────────────────────────

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[HazeCompositor] shader:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function createProgram(gl: WebGLRenderingContext, vert: string, frag: string): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[HazeCompositor] link:', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

function makeTexture(gl: WebGLRenderingContext): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HazeCompositor() {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const section = canvas.parentElement;
    if (!section) return;

    const gl = canvas.getContext('webgl', {
      alpha:              true,
      premultipliedAlpha: true,  // canvas source data is premultiplied
      antialias:          false,
      depth:              false,
      stencil:            false,
    }) as WebGLRenderingContext | null;
    if (!gl) {
      console.warn('[HazeCompositor] WebGL unavailable');
      return;
    }

    const prog = createProgram(gl, VERT, FRAG);
    if (!prog) return;

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,   1, -1,  -1,  1,
       1, -1,   1,  1,  -1,  1,
    ]), gl.STATIC_DRAW);

    gl.useProgram(prog);

    const locPos    = gl.getAttribLocation(prog,  'aPos');
    const locGrid   = gl.getUniformLocation(prog, 'uGrid');
    const locTime   = gl.getUniformLocation(prog, 'uTime');
    const locAspect = gl.getUniformLocation(prog, 'uAspect');
    const locActive = gl.getUniformLocation(prog, 'uActive');

    const tex = makeTexture(gl);
    gl.uniform1i(locGrid, 0); // TEXTURE0

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

    // Flip canvas Y on upload: canvas row-0 (visual top) → texture t=1.
    // Standard vUv (y=0 at screen bottom) then samples correctly.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Lazy lookup: GridBackground mounts concurrently; may not exist on frame 0.
    let srcGrid: HTMLCanvasElement | null = null;
    function getGrid(): HTMLCanvasElement | null {
      if (!srcGrid) srcGrid = section!.querySelector('[data-haze-source="grid"]');
      return srcGrid;
    }

    let cssW = 1, cssH = 1;

    function applySize(): void {
      const sc = canvas!.parentElement;
      if (!sc) return;
      cssW = sc.clientWidth  || 1;
      cssH = sc.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width        = Math.round(cssW * dpr);
      canvas!.height       = Math.round(cssH * dpr);
      canvas!.style.width  = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }

    applySize();
    const ro = new ResizeObserver(applySize);
    ro.observe(section);

    let rafId   = 0;
    let prevNow = performance.now();
    let time    = 0;

    function tick(now: number): void {
      if (!gl) return;
      const delta = Math.min((now - prevNow) / 1000, 0.05);
      prevNow = now;
      if (!reducedMotion) time += delta;

      const grid = getGrid();
      if (grid) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, grid);
      }

      gl.uniform1f(locTime,   time);
      gl.uniform1f(locAspect, cssW / cssH);
      gl.uniform1f(locActive, reducedMotion ? 0.0 : 1.0);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
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
