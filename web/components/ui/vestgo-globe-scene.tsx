'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const POINTS = 1400;
const NODES: Array<{ lat: number; lon: number; role: 'donor' | 'point' | 'ngo' }> = [
  { lat: -23.55, lon: -46.63, role: 'donor' },
  { lat: -22.91, lon: -43.17, role: 'point' },
  { lat: -12.97, lon: -38.51, role: 'ngo' },
  { lat: -8.05, lon: -34.9, role: 'point' },
  { lat: -15.78, lon: -47.93, role: 'ngo' },
  { lat: -25.43, lon: -49.27, role: 'donor' },
  { lat: -30.03, lon: -51.23, role: 'point' },
  { lat: -3.73, lon: -38.52, role: 'donor' },
  { lat: -19.92, lon: -43.94, role: 'ngo' },
];

const ROLE_COLOR: Record<'donor' | 'point' | 'ngo', string> = {
  donor: '#21d3c4',
  point: '#e8a33d',
  ngo: '#9bc78a',
};

function latLonToVec3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function DotSphere({ radius }: { radius: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(POINTS * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < POINTS; i += 1) {
      const y = 1 - (i / (POINTS - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      arr[i * 3] = Math.cos(theta) * r * radius;
      arr[i * 3 + 1] = y * radius;
      arr[i * 3 + 2] = Math.sin(theta) * r * radius;
    }
    return arr;
  }, [radius]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#21d3c4"
        size={0.018}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}

function Wireframe({ radius }: { radius: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 0.995, 48, 32]} />
      <meshBasicMaterial color="#00544d" transparent opacity={0.22} wireframe />
    </mesh>
  );
}

function GlowCore({ radius }: { radius: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 0.96, 48, 32]} />
      <meshBasicMaterial color="#00333c" transparent opacity={0.6} />
    </mesh>
  );
}

function NodeMarkers({ radius }: { radius: number }) {
  const group = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, i) => {
      const s = 1 + Math.sin(t * 1.6 + i) * 0.35;
      child.scale.setScalar(s);
    });
  });

  return (
    <group ref={group}>
      {NODES.map((node, i) => {
        const pos = latLonToVec3(node.lat, node.lon, radius * 1.015);
        const color = ROLE_COLOR[node.role];
        return (
          <mesh key={i} position={pos.toArray()}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}

function Arc({
  start,
  end,
  color,
  offset,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  offset: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const { geometry, length } = useMemo(() => {
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const lift = start.distanceTo(end) * 0.9 + 0.35;
    mid.normalize().multiplyScalar(start.length() + lift);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tubular = 64;
    const geo = new THREE.TubeGeometry(curve, tubular, 0.012, 8, false);
    return { geometry: geo, length: tubular };
  }, [start, end]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const material = ref.current.material as THREE.ShaderMaterial;
    if (material.uniforms) {
      material.uniforms.uTime.value = clock.getElapsedTime() + offset;
    }
  });

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
        },
        vertexShader: `
          varying float vProgress;
          void main() {
            vProgress = uv.x;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          varying float vProgress;
          void main() {
            float head = mod(uTime * 0.3, 1.2) - 0.2;
            float dist = abs(vProgress - head);
            float trail = smoothstep(0.35, 0.0, dist);
            float base = 0.25;
            float alpha = max(base, trail);
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      }),
    [color],
  );

  return <mesh ref={ref} geometry={geometry} material={material} />;
}

function Arcs({ radius }: { radius: number }) {
  const pairs = useMemo(() => {
    const arr: Array<{ start: THREE.Vector3; end: THREE.Vector3; color: string; offset: number }> = [];
    const colors = ['#21d3c4', '#e8a33d', '#9bc78a'];
    for (let i = 0; i < NODES.length - 1; i += 1) {
      const start = latLonToVec3(NODES[i].lat, NODES[i].lon, radius * 1.01);
      const end = latLonToVec3(NODES[i + 1].lat, NODES[i + 1].lon, radius * 1.01);
      arr.push({ start, end, color: colors[i % colors.length], offset: i * 0.6 });
    }
    return arr;
  }, [radius]);

  return (
    <>
      {pairs.map((p, i) => (
        <Arc key={i} start={p.start} end={p.end} color={p.color} offset={p.offset} />
      ))}
    </>
  );
}

export default function VestgoGlobeScene({ radius = 1.3 }: { radius?: number }) {
  const group = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.08;
      group.current.rotation.x = Math.sin(Date.now() * 0.00015) * 0.15;
    }
  });

  return (
    <group ref={group}>
      <GlowCore radius={radius} />
      <Wireframe radius={radius} />
      <DotSphere radius={radius} />
      <NodeMarkers radius={radius} />
      <Arcs radius={radius} />
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 4, 4]} intensity={1.1} color="#21d3c4" />
      <pointLight position={[-4, -2, 2]} intensity={0.6} color="#e8a33d" />
    </group>
  );
}
