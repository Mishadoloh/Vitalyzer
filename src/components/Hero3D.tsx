'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const mouse = { x: 0, y: 0 };

function seededNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function NeuralShell() {
  const points = useRef<THREE.Points>(null);
  const target = useRef({ x: 0, y: 0 });

  const { positions, colors, directions, radii, phases } = useMemo(() => {
    const count = 3400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const directions = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    const phases = new Float32Array(count);
    const accent = new THREE.Color('#34d399');
    const info = new THREE.Color('#60a5fa');
    const warm = new THREE.Color('#fbbf24');

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = Math.PI * (1 + Math.sqrt(5)) * i;
      const noise = seededNoise(i + 13);
      const radius = 2.05 + noise * 0.22;
      const x = Math.sin(inclination) * Math.cos(azimuth);
      const y = Math.sin(inclination) * Math.sin(azimuth);
      const z = Math.cos(inclination);
      directions[i * 3] = x;
      directions[i * 3 + 1] = y;
      directions[i * 3 + 2] = z;
      radii[i] = radius;
      phases[i] = seededNoise(i + 91) * Math.PI * 2;
      positions[i * 3] = x * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = z * radius;

      const c = accent.clone().lerp(info, Math.max(0, z * 0.5 + 0.5)).lerp(warm, noise * 0.18);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors, directions, radii, phases };
  }, []);

  useFrame(({ clock }, delta) => {
    const p = points.current;
    if (!p) return;
    const attr = p.geometry.attributes.position as THREE.BufferAttribute;
    const elapsed = clock.elapsedTime;
    const breath = 1 + Math.sin(elapsed * 0.7) * 0.025;

    for (let i = 0; i < radii.length; i++) {
      const wave = Math.sin(elapsed * 1.45 + phases[i]) * 0.045;
      const pulse = Math.sin(elapsed * 2.2 + i * 0.018) * 0.018;
      const radius = (radii[i] + wave + pulse) * breath;
      attr.setXYZ(i, directions[i * 3] * radius, directions[i * 3 + 1] * radius, directions[i * 3 + 2] * radius);
    }
    attr.needsUpdate = true;

    p.rotation.y += delta * 0.16;
    target.current.x += (mouse.y * 0.34 - target.current.x) * 0.055;
    target.current.y += (mouse.x * 0.42 - target.current.y) * 0.055;
    p.rotation.x = target.current.x;
    p.rotation.z = target.current.y * 0.24;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        vertexColors
        transparent
        opacity={0.86}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function OrbitRings() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.18;
    g.rotation.x = Math.sin(clock.elapsedTime * 0.42) * 0.13 + mouse.y * 0.08;
    g.rotation.z = Math.cos(clock.elapsedTime * 0.36) * 0.1 + mouse.x * 0.08;
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2.7, 0, Math.PI / 5]}>
        <torusGeometry args={[2.48, 0.006, 8, 180]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.1, Math.PI / 4, -Math.PI / 7]}>
        <torusGeometry args={[2.18, 0.005, 8, 180]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.24} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 1.9, -Math.PI / 5, Math.PI / 3]}>
        <torusGeometry args={[1.66, 0.004, 8, 160]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Satellites() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = clock.elapsedTime * 0.42;
    g.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.18;
  });

  return (
    <group ref={group}>
      {[
        ['#34d399', 2.55, 0],
        ['#60a5fa', 2.2, Math.PI * 0.7],
        ['#fbbf24', 1.72, Math.PI * 1.35],
      ].map(([color, radius, angle]) => (
        <mesh key={`${color}-${angle}`} position={[Math.cos(Number(angle)) * Number(radius), Math.sin(Number(angle)) * 0.62, Math.sin(Number(angle)) * Number(radius) * 0.32]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color={String(color)} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function InnerCore() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const s = 1 + Math.sin(clock.elapsedTime * 1.25) * 0.055 + Math.sin(clock.elapsedTime * 2.4) * 0.018;
    g.scale.setScalar(s);
    g.rotation.y = clock.elapsedTime * 0.24;
    g.rotation.x = Math.sin(clock.elapsedTime * 0.8) * 0.16;
  });
  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.12, 2]} />
        <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.34} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0.4, 0.2, 0]}>
        <dodecahedronGeometry args={[0.62, 0]} />
        <meshBasicMaterial color="#60a5fa" wireframe transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.14, 32, 32]} />
        <meshBasicMaterial color="#d1fae5" transparent opacity={0.92} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function Hero3D({ className }: { className?: string }) {
  useEffect(() => {
    function onMove(e: MouseEvent) {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className={className} aria-hidden>
      <Canvas camera={{ position: [0, 0, 5.4], fov: 54 }} dpr={[1, 1.8]} gl={{ alpha: true, antialias: true }}>
        <OrbitRings />
        <NeuralShell />
        <Satellites />
        <InnerCore />
      </Canvas>
    </div>
  );
}
