'use client';

import { useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Euler, PerspectiveCamera, ShaderMaterial, type Group, type Mesh } from 'three';
import { useRef } from 'react';
import {
  coronaFragmentShader,
  coronaVertexShader,
  plasmaFragmentShader,
  plasmaVertexShader,
  type StarUniforms,
} from './CoreShader';

// ── Geometry constants (Three.js world units) ─────────────────────────────
// Camera z=155, FOV=46 → half-height at object = 155×tan(23°) = 65.8 wu.
// Canvas 256 px → scale = 128/65.8 = 1.946 px/wu.
//
//   Plasma sphere  r=46  → Ø 179 px   — body of the star  (70% of canvas)
//   Corona sphere  r=55  → Ø 214 px   — atmospheric halo ring
//   Orbital ring   r=57, tube=1.2  → outer edge Ø 226 px — fits in 256 px
//
// +10 % vs previous (r=42/50/52): achieved by scaling Three.js geometry,
// not the canvas or CSS — preserves rendering quality at all DPRs.

const R_SPHERE  = 46;
const R_CORONA  = 55;   // 20 % larger than sphere — thin halo margin
const R_RING    = 57;
const TUBE_RING = 1.2;

// ~64° tilt: reads as a meridional orbital marker, not an equatorial halo.
const RING_TILT = new Euler(1.12, 0, 0.28);

// ── Aspect ratio guard ────────────────────────────────────────────────────
// The Canvas lives inside transform:scale(fit). Browser zoom triggers a resize
// event; some R3F resize paths read getBoundingClientRect() which includes the
// parent CSS transform. If at that moment width and height differ by even one
// subpixel (rounding at non-100% zoom levels), camera.aspect is set to a
// value ≠ 1 and the sphere appears permanently squished until page reload.
//
// This component re-asserts aspect=1 after every R3F resize (indicated by a
// change in the `size` value from useThree). The canvas is always square
// (CORE_SIZE × CORE_SIZE), so aspect is always 1 by definition.

function AspectGuard() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    if (Math.abs(cam.aspect - 1) > 1e-4) {
      cam.aspect = 1;
      cam.updateProjectionMatrix();
      invalidate(); // trigger re-render with corrected projection
    }
  }, [camera, size, invalidate]);
  return null;
}

// ── Animated mesh group ───────────────────────────────────────────────────

type CoreMeshProps = { reducedMotion: boolean; inView: boolean };

function CoreMesh({ reducedMotion, inView }: CoreMeshProps) {
  // Single uniforms object shared by both shader materials —
  // one uTime update in useFrame drives both plasma and corona.
  const uniforms = useMemo<StarUniforms>(() => ({ uTime: { value: 0 } }), []);

  // Plasma sphere: 3D FBM noise, self-illuminated, no scene lights needed.
  const plasmaMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader:   plasmaVertexShader,
        fragmentShader: plasmaFragmentShader,
        uniforms,
      }),
    [uniforms],
  );

  // Corona sphere: Fresnel-only, additive over the background.
  // depthWrite=false so the plasma sphere renders correctly behind it.
  const coronaMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader:   coronaVertexShader,
        fragmentShader: coronaFragmentShader,
        uniforms,
        blending:       AdditiveBlending,
        transparent:    true,
        depthWrite:     false,
      }),
    [uniforms],
  );

  const groupRef = useRef<Group | null>(null);
  const ringRef  = useRef<Mesh  | null>(null);
  const timeRef  = useRef(0);

  const { invalidate } = useThree();

  // Trigger one initial frame so the scene is visible in frameloop='demand'.
  useEffect(() => { invalidate(); }, [invalidate]);

  // Dispose GPU resources on unmount.
  useEffect(
    () => () => {
      plasmaMat.dispose();
      coronaMat.dispose();
    },
    [plasmaMat, coronaMat],
  );

  useFrame((state, delta) => {
    if (reducedMotion || !inView) return;
    const d = Math.min(delta, 0.05);

    // Accumulate time with clamped delta — prevents jump on tab return.
    // state.clock.elapsedTime accumulates real wall time including background
    // periods, causing the shader to teleport to a new noise state on resume.
    timeRef.current += d;
    uniforms.uTime.value = timeRef.current;

    // Organic rotation: two-harmonic wobble adds ±25% variation over
    // periods of ~37 s and ~14 s — feels alive rather than mechanically constant.
    if (groupRef.current) {
      const et = timeRef.current;
      const rotSpeed = 0.09
        + 0.022 * Math.sin(et * 0.17)
        + 0.012 * Math.sin(et * 0.43);
      groupRef.current.rotation.y += rotSpeed * d;
    }

    // Ring precesses independently — orbital motion cue.
    if (ringRef.current) ringRef.current.rotation.y += 0.45 * d;
  });

  return (
    <group ref={groupRef}>

      {/* ── Plasma sphere ─────────────────────────────────────────────── */}
      {/*   ShaderMaterial: self-illuminated, no scene lights.            */}
      {/*   64 × 48 segments: smooth silhouette and Fresnel gradient.     */}
      <mesh>
        <sphereGeometry args={[R_SPHERE, 64, 48]} />
        <primitive object={plasmaMat} attach="material" />
      </mesh>

      {/* ── Corona / atmospheric halo ──────────────────────────────────── */}
      {/*   EXPERIMENT: hidden — the gap between r=46 (plasma) and r=55    */}
      {/*   (corona Fresnel peak at ~114 px) creates a ~20 px dark annular */}
      {/*   zone that reads as a thick plastic shell.                       */}
      {/*   To restore: remove visible={false}.                             */}
      {/*   Fresnel ≈ 0 at centre → adds near-nothing over the plasma.    */}
      {/*   Fresnel ≈ 1 at limb → soft electric-blue glow beyond silhouette.*/}
      <mesh visible={false}>
        <sphereGeometry args={[R_CORONA, 64, 48]} />
        <primitive object={coronaMat} attach="material" />
      </mesh>

      {/* ── Orbital ring ──────────────────────────────────────────────── */}
      {/*   Thin, unlit, semi-transparent. MeshBasicMaterial matches the  */}
      {/*   self-lit aesthetic — no IBL reflections, no metallic artefacts.*/}
      <mesh ref={ringRef} rotation={RING_TILT}>
        <torusGeometry args={[R_RING, TUBE_RING, 12, 100]} />
        <meshBasicMaterial color={0x1a4ecc} transparent opacity={0.42} />
      </mesh>

    </group>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────
// No scene lights: plasma sphere is self-illuminated via ShaderMaterial;
// ring uses MeshBasicMaterial (unlit). Keeps the scene lean.
//
// frameloop='always' only when in-viewport and motion is allowed —
// falls back to 'demand' (single frame) otherwise.

export type CoreSceneProps = {
  reducedMotion: boolean;
  inView: boolean;
};

export function CoreScene({ reducedMotion, inView }: CoreSceneProps) {
  return (
    <Canvas
      frameloop={reducedMotion || !inView ? 'demand' : 'always'}
      camera={{ position: [0, 0, 155], fov: 46, near: 0.1, far: 1000 }}
      gl={{
        alpha:           true,
        antialias:       true,
        powerPreference: 'low-power',
        stencil:         false,
      }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      <AspectGuard />
      <CoreMesh reducedMotion={reducedMotion} inView={inView} />
    </Canvas>
  );
}
