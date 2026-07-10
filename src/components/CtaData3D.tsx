'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function DataWave() {
  const group = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    return ['#6ee7b7', '#34d399', '#60a5fa', '#fbbf24', '#d1fae5'].map((color, lineIndex) => {
      const segments = 128;
      const positions = new Float32Array(segments * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: lineIndex === 0 ? 0.82 : 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return { line: new THREE.Line(geometry, material), segments, lineIndex };
    });
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    g.rotation.y = Math.sin(elapsed * 0.45) * 0.32;
    g.rotation.x = Math.cos(elapsed * 0.34) * 0.12;

    g.children.forEach((child, index) => {
      const line = child as THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      const source = lines[index];
      const attr = line.geometry.attributes.position as THREE.BufferAttribute;
      const yOffset = (index - 2) * 0.16;

      for (let i = 0; i < source.segments; i++) {
        const progress = i / (source.segments - 1);
        const x = (progress - 0.5) * 3.65;
        const wave = Math.sin(progress * Math.PI * (3.3 + index * 0.34) + elapsed * (1.35 + index * 0.16)) * (0.26 - index * 0.015);
        const pulse = Math.sin(progress * Math.PI * 9 - elapsed * 1.9 + index) * 0.07;
        const z = Math.cos(progress * Math.PI * 2 + elapsed * 0.58 + index) * (0.34 + index * 0.025);
        attr.setXYZ(i, x, yOffset + wave + pulse, z);
      }

      attr.needsUpdate = true;
      line.material.opacity = (index === 0 ? 0.76 : 0.34) + Math.sin(elapsed * 0.9 + index) * 0.08;
    });
  });

  return (
    <group ref={group}>
      {lines.map(({ line }, index) => (
        <primitive key={index} object={line} />
      ))}
    </group>
  );
}

function DataSparkles() {
  const points = useRef<THREE.Points>(null);

  const { positions, colors, seeds } = useMemo(() => {
    const count = 120;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    const palette = [new THREE.Color('#6ee7b7'), new THREE.Color('#60a5fa'), new THREE.Color('#fbbf24')];

    for (let i = 0; i < count; i++) {
      seeds[i * 4] = Math.random();
      seeds[i * 4 + 1] = Math.random();
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random();
      const color = palette[i % palette.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors, seeds };
  }, []);

  useFrame(({ clock }) => {
    const p = points.current;
    if (!p) return;
    const elapsed = clock.elapsedTime;
    const attr = p.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < seeds.length / 4; i++) {
      const lane = seeds[i * 4];
      const phase = seeds[i * 4 + 1] * Math.PI * 2;
      const drift = seeds[i * 4 + 2];
      const depth = seeds[i * 4 + 3];
      const progress = (lane + elapsed * (0.035 + drift * 0.045)) % 1;
      const x = (progress - 0.5) * 3.75;
      const y = Math.sin(progress * Math.PI * 4 + phase + elapsed * 1.2) * 0.36 + (depth - 0.5) * 0.42;
      const z = Math.cos(progress * Math.PI * 2 + phase) * 0.44;
      attr.setXYZ(i, x, y, z);
    }

    attr.needsUpdate = true;
    p.rotation.y = Math.sin(elapsed * 0.32) * 0.22;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} vertexColors transparent opacity={0.62} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function SignalComets() {
  const group = useRef<THREE.Group>(null);
  const comets = useMemo(
    () =>
      [
        { color: '#d1fae5', phase: 0.1, lane: -0.42, speed: 0.82 },
        { color: '#6ee7b7', phase: 1.4, lane: 0.1, speed: 0.62 },
        { color: '#60a5fa', phase: 2.7, lane: 0.38, speed: 0.72 },
      ].map((item) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
        const material = new THREE.LineBasicMaterial({
          color: item.color,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        return { ...item, line: new THREE.Line(geometry, material) };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const elapsed = clock.elapsedTime;
    g.rotation.y = Math.sin(elapsed * 0.24) * 0.18;

    g.children.forEach((child, index) => {
      const comet = comets[index];
      const attr = (comet.line.geometry.attributes.position as THREE.BufferAttribute);
      const head = ((elapsed * comet.speed + comet.phase) % 4.4) - 2.2;

      for (let i = 0; i < 6; i++) {
        const tail = i * 0.12;
        const x = head - tail;
        const y = comet.lane + Math.sin((x + elapsed * 0.72) * 2.2 + comet.phase) * 0.18;
        const z = Math.cos((x + comet.phase) * 1.7) * 0.32;
        attr.setXYZ(i, x, y, z);
      }

      attr.needsUpdate = true;
      const material = (child as THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>).material;
      material.opacity = 0.34 + Math.max(0, Math.sin(elapsed * 1.6 + comet.phase)) * 0.42;
    });
  });

  return (
    <group ref={group}>
      {comets.map(({ line }, index) => (
        <primitive key={index} object={line} />
      ))}
    </group>
  );
}

function OrbitingMetrics() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(
    () => [
      { color: '#d1fae5', phase: 0, radius: 1.72, size: 0.1, speed: 0.82 },
      { color: '#6ee7b7', phase: 1.8, radius: 1.5, size: 0.078, speed: -1.05 },
      { color: '#60a5fa', phase: 3.35, radius: 1.86, size: 0.08, speed: 0.68 },
      { color: '#fbbf24', phase: 4.8, radius: 1.3, size: 0.068, speed: -0.74 },
    ],
    [],
  );

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const elapsed = clock.elapsedTime;
    g.rotation.z = Math.sin(elapsed * 0.28) * 0.12;

    g.children.forEach((child, index) => {
      const node = nodes[index];
      const angle = elapsed * node.speed + node.phase;
      child.position.set(Math.cos(angle) * node.radius, Math.sin(angle) * 0.6, Math.sin(angle) * 0.38);
      child.scale.setScalar(1 + Math.sin(elapsed * 2.3 + node.phase) * 0.2);
    });
  });

  return (
    <group ref={group}>
      {nodes.map((node) => (
        <mesh key={node.color}>
          <sphereGeometry args={[node.size, 18, 18]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function CoreSignal() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const elapsed = clock.elapsedTime;
    g.rotation.y = elapsed * 0.42;
    g.rotation.x = Math.sin(elapsed * 0.52) * 0.18;
    g.scale.setScalar(1 + Math.sin(elapsed * 1.35) * 0.045);
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2.18, 0.2, -0.18]}>
        <torusGeometry args={[1.48, 0.004, 8, 160]} />
        <meshBasicMaterial color="#d1fae5" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.18, 0.012, 10, 140]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.58} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.7, 0.7, 0.35]}>
        <torusGeometry args={[0.88, 0.009, 10, 120]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.42} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.33, 32, 32]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshBasicMaterial color="#d1fae5" wireframe transparent opacity={0.68} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function CtaData3D({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas camera={{ position: [0, 0, 3.65], fov: 44 }} dpr={[1, 1.6]} gl={{ alpha: true, antialias: true }}>
        <group scale={1.08}>
          <DataSparkles />
          <SignalComets />
          <DataWave />
          <CoreSignal />
          <OrbitingMetrics />
        </group>
      </Canvas>
    </div>
  );
}
