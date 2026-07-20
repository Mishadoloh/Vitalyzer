'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HybridResizeObserver, useSafe3D } from '@/lib/safe3d';

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
        const x = (progress - 0.5) * 4.35;
        const wave = Math.sin(progress * Math.PI * (3.3 + index * 0.34) + elapsed * (1.35 + index * 0.16)) * (0.32 - index * 0.014);
        const pulse = Math.sin(progress * Math.PI * 10 - elapsed * 2.15 + index) * 0.085;
        const z = Math.cos(progress * Math.PI * 2 + elapsed * 0.58 + index) * (0.42 + index * 0.025);
        attr.setXYZ(i, x, yOffset + wave + pulse, z);
      }

      attr.needsUpdate = true;
      line.material.opacity = (index === 0 ? 0.86 : 0.42) + Math.sin(elapsed * 0.9 + index) * 0.1;
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

function DataParticles() {
  const points = useRef<THREE.Points>(null);

  const { positions, colors, seeds } = useMemo(() => {
    const count = 190;
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
      const x = (progress - 0.5) * 4.3;
      const y = Math.sin(progress * Math.PI * 4 + phase + elapsed * 1.2) * 0.42 + (depth - 0.5) * 0.56;
      const z = Math.cos(progress * Math.PI * 2 + phase) * 0.54;
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
      <pointsMaterial size={0.039} vertexColors transparent opacity={0.72} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function HoloGrid() {
  const grid = useRef<THREE.LineSegments>(null);

  const { positions, colors } = useMemo(() => {
    const lines = 11;
    const positions = new Float32Array(lines * 4 * 3);
    const colors = new Float32Array(lines * 4 * 3);
    const accent = new THREE.Color('#34d399');
    const info = new THREE.Color('#60a5fa');
    let cursor = 0;

    for (let i = 0; i < lines; i++) {
      const p = (i / (lines - 1) - 0.5) * 3.9;
      positions.set([-2.2, p, 0, 2.2, p, 0, p, -1.85, 0, p, 1.85, 0], cursor);
      const color = accent.clone().lerp(info, i / (lines - 1)).toArray();
      for (let j = 0; j < 4; j++) colors.set(color, cursor + j * 3);
      cursor += 12;
    }

    return { positions, colors };
  }, []);

  useFrame(({ clock }) => {
    const g = grid.current;
    if (!g) return;
    const elapsed = clock.elapsedTime;
    g.rotation.z = Math.sin(elapsed * 0.24) * 0.08;
    g.position.y = -0.72 + Math.sin(elapsed * 0.9) * 0.025;
    const material = g.material as THREE.LineBasicMaterial;
    material.opacity = 0.14 + Math.sin(elapsed * 1.4) * 0.035;
  });

  return (
    <lineSegments ref={grid} rotation={[Math.PI / 2.38, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

function CoreGlow() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const elapsed = clock.elapsedTime;
    g.rotation.z = elapsed * 0.12;
    g.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      const pulse = 1 + Math.sin(elapsed * (1.25 + index * 0.18) + index) * 0.08;
      mesh.scale.setScalar(pulse);
      mesh.material.opacity = 0.045 + Math.max(0, Math.sin(elapsed * 1.45 + index)) * 0.035;
    });
  });

  return (
    <group ref={group}>
      {[0.86, 1.24, 1.68].map((radius, index) => (
        <mesh key={radius}>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshBasicMaterial
            color={index === 1 ? '#60a5fa' : '#34d399'}
            transparent
            opacity={0.055}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function DataBurstRays() {
  const rays = useRef<THREE.LineSegments>(null);

  const { positions, colors, phases } = useMemo(() => {
    const count = 34;
    const positions = new Float32Array(count * 2 * 3);
    const colors = new Float32Array(count * 2 * 3);
    const phases = new Float32Array(count);
    const accent = new THREE.Color('#6ee7b7');
    const info = new THREE.Color('#60a5fa');

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const y = Math.sin(angle * 1.7) * 0.42;
      const start = 0.62 + Math.sin(i * 0.9) * 0.08;
      const end = 1.95 + Math.cos(i * 1.3) * 0.22;
      positions.set([Math.cos(angle) * start, y * 0.45, Math.sin(angle) * start, Math.cos(angle) * end, y, Math.sin(angle) * end], i * 6);
      const color = accent.clone().lerp(info, (Math.sin(angle) + 1) / 2).toArray();
      colors.set(color, i * 6);
      colors.set(color, i * 6 + 3);
      phases[i] = angle;
    }

    return { positions, colors, phases };
  }, []);

  useFrame(({ clock }) => {
    const r = rays.current;
    if (!r) return;
    const elapsed = clock.elapsedTime;
    r.rotation.y = elapsed * 0.14;
    r.rotation.z = Math.sin(elapsed * 0.42) * 0.2;
    const material = r.material as THREE.LineBasicMaterial;
    material.opacity = 0.16 + Math.pow(Math.max(0, Math.sin(elapsed * 1.7 + phases[0])), 2) * 0.2;
  });

  return (
    <lineSegments ref={rays}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

function EnergyShell() {
  const shell = useRef<THREE.Points>(null);

  const { basePositions, positions, colors, phases } = useMemo(() => {
    const count = 520;
    const basePositions = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const accent = new THREE.Color('#6ee7b7');
    const info = new THREE.Color('#60a5fa');

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 2 * 5;
      const radius = 1.56 + Math.sin(i * 1.7) * 0.24;
      basePositions[i * 3] = Math.cos(angle) * radius;
      basePositions[i * 3 + 1] = Math.sin(angle * 0.52) * 0.74;
      basePositions[i * 3 + 2] = Math.sin(angle) * (0.46 + Math.cos(i * 0.31) * 0.12);
      positions[i * 3] = basePositions[i * 3];
      positions[i * 3 + 1] = basePositions[i * 3 + 1];
      positions[i * 3 + 2] = basePositions[i * 3 + 2];
      phases[i] = angle;
      const color = accent.clone().lerp(info, (Math.sin(angle) + 1) / 2);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { basePositions, positions, colors, phases };
  }, []);

  useFrame(({ clock }) => {
    const p = shell.current;
    if (!p) return;
    const elapsed = clock.elapsedTime;
    p.rotation.y = elapsed * 0.18;
    p.rotation.z = Math.sin(elapsed * 0.38) * 0.16;
    const attr = p.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    for (let i = 0; i < phases.length; i++) {
      const lift = Math.sin(elapsed * 1.6 + phases[i]) * 0.08;
      arr[i * 3] = basePositions[i * 3];
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + lift;
      arr[i * 3 + 2] = basePositions[i * 3 + 2];
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={shell}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.027} vertexColors transparent opacity={0.68} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function SignalComets() {
  const group = useRef<THREE.Group>(null);
  const comets = useMemo(
    () =>
      [
        { color: '#d1fae5', phase: 0.1, lane: -0.5, speed: 0.82 },
        { color: '#6ee7b7', phase: 1.1, lane: -0.18, speed: 0.68 },
        { color: '#60a5fa', phase: 2.1, lane: 0.18, speed: 0.74 },
        { color: '#fbbf24', phase: 2.9, lane: 0.48, speed: 0.58 },
      ].map((item) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24), 3));
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

      for (let i = 0; i < 8; i++) {
        const tail = i * 0.115;
        const x = head - tail;
        const y = comet.lane + Math.sin((x + elapsed * 0.72) * 2.2 + comet.phase) * 0.22;
        const z = Math.cos((x + comet.phase) * 1.7) * 0.42;
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
        <torusGeometry args={[1.62, 0.005, 8, 180]} />
        <meshBasicMaterial color="#d1fae5" transparent opacity={0.24} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.26, 0.015, 10, 150]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.7, 0.7, 0.35]}>
        <torusGeometry args={[0.96, 0.011, 10, 130]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.52} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.48, 32, 32]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.43, 1]} />
        <meshBasicMaterial color="#d1fae5" wireframe transparent opacity={0.78} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function CtaData3D({ className }: { className?: string }) {
  // Same gate as Hero3D: never mount the scene on software-rendered WebGL or
  // for users with prefers-reduced-motion — an unguarded canvas freezes the tab
  // on machines without GPU acceleration.
  const enabled = useSafe3D();
  if (!enabled) return null;

  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 3.55], fov: 42 }}
        dpr={[1, 1.45]}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        resize={{ polyfill: HybridResizeObserver as unknown as typeof ResizeObserver }}
      >
        <group scale={1.26}>
          <CoreGlow />
          <HoloGrid />
          <EnergyShell />
          <DataBurstRays />
          <DataParticles />
          <SignalComets />
          <DataWave />
          <CoreSignal />
          <OrbitingMetrics />
        </group>
      </Canvas>
    </div>
  );
}
