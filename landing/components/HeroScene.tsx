"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

const EnergyCore = () => {
  const coreRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.15;
    if (shellRef.current) shellRef.current.rotation.y -= delta * 0.08;
    if (shellRef.current) shellRef.current.rotation.x += delta * 0.03;
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.15, 2]} />
        <MeshDistortMaterial
          color="#2a4bff"
          emissive="#2a4bff"
          emissiveIntensity={0.35}
          distort={0.28}
          speed={1.4}
          roughness={0.2}
          metalness={0.7}
          flatShading
        />
      </mesh>
      <mesh ref={shellRef} scale={1.55}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial
          color="#39ff14"
          wireframe
          transparent
          opacity={0.14}
        />
      </mesh>
    </group>
  );
};

const HeroScene = () => {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.3} />
        <pointLight position={[4, 3, 4]} intensity={1.6} color="#4d6bff" />
        <pointLight position={[-4, -2, -3]} intensity={1} color="#39ff14" />
        <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.1}>
          <group position={[0, -0.6, -1.4]} scale={0.85}>
            <EnergyCore />
          </group>
        </Float>
        <Sparkles count={80} scale={6} size={2} speed={0.3} color="#4d6bff" />
      </Suspense>
    </Canvas>
  );
};

export default HeroScene;
