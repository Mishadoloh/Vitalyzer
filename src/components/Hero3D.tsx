'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// The canvas sits behind the hero with pointer-events: none (so CTA buttons stay
// clickable), which means r3f's own pointer state never updates — track the mouse
// on window instead and share it via a module-level ref.
const mouse = { x: 0, y: 0 };

// Particle sphere with an organic "breathing" displacement: each point oscillates
// along its own radius with a phase derived from its position, so the surface
// ripples like a living organism instead of rotating as a rigid ball.
function ParticleSphere() {
  const points = useRef<THREE.Points>(null);
  const target = useRef({ x: 0, y: 0 });

  const { basePositions, positions, colors, phases } = useMemo(() => {
    const count = 1800;
    const basePositions = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const accent = new THREE.Color('#34d399');
    const info = new THREE.Color('#60a5fa');
    for (let i = 0; i < count; i++) {
      // Fibonacci sphere for even distribution
      const t = i / count;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = Math.PI * (1 + Math.sqrt(5)) * i;
      const x = Math.sin(inclination) * Math.cos(azimuth);
      const y = Math.sin(inclination) * Math.sin(azimuth);
      const z = Math.cos(inclination);
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;
      positions[i * 3] = x * 2.2;
      positions[i * 3 + 1] = y * 2.2;
      positions[i * 3 + 2] = z * 2.2;
      phases[i] = x * 2.1 + y * 1.7 + z * 1.3;
      const c = accent.clone().lerp(info, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { basePositions, positions, colors, phases };
  }, []);

  useFrame(({ clock }, delta) => {
    const p = points.current;
    if (!p) return;
    const time = clock.elapsedTime;

    p.rotation.y += delta * 0.12;
    // Ease toward pointer for a subtle parallax
    target.current.x += (mouse.y * 0.35 - target.current.x) * 0.05;
    target.current.y += (mouse.x * 0.35 - target.current.y) * 0.05;
    p.rotation.x = target.current.x;
    p.rotation.z = target.current.y * 0.3;

    // Breathing surface: radius of each point oscillates with its own phase.
    const attr = p.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < phases.length; i++) {
      const r = 2.2 + Math.sin(time * 1.1 + phases[i] * 2.4) * 0.14;
      arr[i * 3] = basePositions[i * 3] * r;
      arr[i * 3 + 1] = basePositions[i * 3 + 1] * r;
      arr[i * 3 + 2] = basePositions[i * 3 + 2] * r;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.028} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// A tilted ring of particles orbiting the sphere in the opposite direction —
// reads as a "scanning" halo around the data core.
function OrbitRing() {
  const ring = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 3.1 + (Math.random() - 0.5) * 0.22;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    return positions;
  }, []);

  useFrame(({ clock }, delta) => {
    const r = ring.current;
    if (!r) return;
    r.rotation.y -= delta * 0.35;
    r.rotation.x = Math.PI / 3.2 + Math.sin(clock.elapsedTime * 0.4) * 0.08;
  });

  return (
    <points ref={ring} rotation={[Math.PI / 3.2, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.022} color="#60a5fa" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function SignalLattice() {
  const lines = useRef<THREE.LineSegments>(null);

  const { positions, colors, phases } = useMemo(() => {
    const nodeCount = 42;
    const edgeCount = 74;
    const nodes: THREE.Vector3[] = [];
    const positions = new Float32Array(edgeCount * 2 * 3);
    const colors = new Float32Array(edgeCount * 2 * 3);
    const phases = new Float32Array(edgeCount);
    const accent = new THREE.Color('#6ee7b7');
    const info = new THREE.Color('#60a5fa');

    for (let i = 0; i < nodeCount; i++) {
      const t = i / nodeCount;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = Math.PI * (1 + Math.sqrt(5)) * i;
      const radius = 1.26 + Math.sin(i * 4.7) * 0.1;
      nodes.push(
        new THREE.Vector3(
          Math.sin(inclination) * Math.cos(azimuth) * radius,
          Math.sin(inclination) * Math.sin(azimuth) * radius,
          Math.cos(inclination) * radius,
        ),
      );
    }

    for (let i = 0; i < edgeCount; i++) {
      const a = i % nodeCount;
      const b = (i * 13 + 7) % nodeCount;
      const ca = accent.clone().lerp(info, (i % 9) / 8);
      positions.set(nodes[a].toArray(), i * 6);
      positions.set(nodes[b].toArray(), i * 6 + 3);
      colors.set(ca.toArray(), i * 6);
      colors.set(ca.toArray(), i * 6 + 3);
      phases[i] = i * 0.37;
    }

    return { positions, colors, phases };
  }, []);

  useFrame(({ clock }, delta) => {
    const l = lines.current;
    if (!l) return;
    const t = clock.elapsedTime;
    l.rotation.y -= delta * 0.08;
    l.rotation.x = Math.sin(t * 0.31) * 0.12;
    const colorAttr = l.geometry.getAttribute('color') as THREE.BufferAttribute;
    const arr = colorAttr.array as Float32Array;

    for (let i = 0; i < phases.length; i++) {
      const pulse = 0.5 + Math.pow(Math.max(0, Math.sin(t * 1.45 + phases[i])), 3) * 0.7;
      const offset = i * 6;
      arr[offset] = 0.42 * pulse;
      arr[offset + 1] = 0.9 * pulse;
      arr[offset + 2] = 0.74 * pulse;
      arr[offset + 3] = 0.26 * pulse;
      arr[offset + 4] = 0.62 * pulse;
      arr[offset + 5] = 1;
    }
    colorAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={lines}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.34} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

function PulseRings() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((child, index) => {
      const progress = (t * 0.34 + index / 3) % 1;
      const scale = 0.72 + progress * 2.35;
      child.scale.setScalar(scale);
      child.rotation.z = t * (0.12 + index * 0.03);
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = (1 - progress) * 0.26;
    });
  });

  return (
    <group ref={group} rotation={[Math.PI / 2.35, 0.18, -0.28]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <torusGeometry args={[0.72, 0.006, 8, 150]} />
          <meshBasicMaterial color={i === 1 ? '#60a5fa' : '#34d399'} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// Two counter-rotating wireframe shells with a heartbeat pulse.
function InnerCore() {
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Double-beat like a heartbeat: sharp systole, soft diastole.
    const beat = Math.pow(Math.max(0, Math.sin(t * 2.2)), 6) * 0.16 + Math.sin(t * 1.1) * 0.03;
    if (outer.current) {
      outer.current.scale.setScalar(1 + beat);
      outer.current.rotation.y = t * 0.2;
    }
    if (inner.current) {
      inner.current.scale.setScalar(1 + beat * 1.4);
      inner.current.rotation.y = -t * 0.35;
      inner.current.rotation.x = t * 0.15;
    }
  });
  return (
    <>
      <mesh ref={outer}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.28} />
      </mesh>
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.7, 0]} />
        <meshBasicMaterial color="#6ee7b7" wireframe transparent opacity={0.4} />
      </mesh>
    </>
  );
}

// r3f mounts the scene only after react-use-measure reports a non-zero size, and
// react-use-measure relies on ResizeObserver callbacks. Some embedded browsers
// never deliver those callbacks, so the canvas would stay at its 300x150 default
// forever. This hybrid observer (passed via Canvas `resize.polyfill`) delegates
// to the native RO when it works and additionally self-triggers on mount and on
// window resize — spurious triggers are harmless (they just cause a re-measure).
class HybridResizeObserver {
  private cb: ResizeObserverCallback;
  private native: ResizeObserver | null;
  private targets = new Set<Element>();
  private onResize = () => this.fire();

  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    this.native = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(cb) : null;
  }

  private fire() {
    const entries = Array.from(this.targets).map(
      (target) => ({ target, contentRect: target.getBoundingClientRect() }) as unknown as ResizeObserverEntry
    );
    if (entries.length) this.cb(entries, this as unknown as ResizeObserver);
  }

  observe(target: Element) {
    this.native?.observe(target);
    if (this.targets.size === 0) window.addEventListener('resize', this.onResize);
    this.targets.add(target);
    // Initial + delayed re-measure (layout may settle after fonts/hydration).
    requestAnimationFrame(() => this.fire());
    setTimeout(() => this.fire(), 350);
  }

  unobserve(target: Element) {
    this.native?.unobserve(target);
    this.targets.delete(target);
    if (this.targets.size === 0) window.removeEventListener('resize', this.onResize);
  }

  disconnect() {
    this.native?.disconnect();
    this.targets.clear();
    window.removeEventListener('resize', this.onResize);
  }
}

// Gentle camera float so the whole scene drifts even when the cursor is idle.
function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.25) * 0.25;
    camera.position.y = Math.cos(t * 0.2) * 0.18;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// WebGL on machines without GPU acceleration falls back to a software rasterizer
// (SwiftShader/llvmpipe) that can freeze the whole renderer on a full-hero canvas.
// Probe once and skip the 3D scene there — the page still has its CSS orb
// animations, so the fallback is graceful.
function isHardwareAccelerated(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    (gl.getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null)?.loseContext?.();
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

export default function Hero3D({ className }: { className?: string }) {
  const [enabled, setEnabled] = React.useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!reducedMotion && isHardwareAccelerated());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    function onMove(e: MouseEvent) {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 55 }}
        dpr={[1, 1.25]}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        resize={{ polyfill: HybridResizeObserver as unknown as typeof ResizeObserver }}
      >
        <ParticleSphere />
        <SignalLattice />
        <OrbitRing />
        <PulseRings />
        <InnerCore />
        <CameraDrift />
      </Canvas>
    </div>
  );
}
