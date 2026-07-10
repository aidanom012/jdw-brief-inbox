"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { CabinetDrawer, type CabinetArtist } from "@/components/CabinetDrawer";

type ArtistCabinet3DProps = {
  artists: CabinetArtist[];
};

function canUseWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function CabinetRig({ children }: { children: ReactNode }) {
  const rigRef = useRef<THREE.Group>(null);

  useFrame(({ pointer }) => {
    if (!rigRef.current) return;
    rigRef.current.rotation.y = THREE.MathUtils.lerp(rigRef.current.rotation.y, pointer.x * 0.08, 0.05);
    rigRef.current.rotation.x = THREE.MathUtils.lerp(rigRef.current.rotation.x, -0.04 + pointer.y * 0.035, 0.05);
  });

  return <group ref={rigRef}>{children}</group>;
}

function CabinetScene({ artists, onOpen }: { artists: CabinetArtist[]; onOpen: (href: string) => void }) {
  const visibleArtists = artists.slice(0, 10);
  const columns = visibleArtists.length <= 3 ? 1 : 2;
  const rows = Math.max(1, Math.ceil(visibleArtists.length / columns));
  const drawerWidth = columns === 1 ? 3.9 : 2.42;
  const totalWidth = columns * drawerWidth + (columns - 1) * 0.18 + 0.58;
  const totalHeight = rows * 0.72 + (rows - 1) * 0.22 + 0.72;
  const bodyDepth = 0.72;

  return (
    <>
      <color attach="background" args={["#f7f8fb"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[2.8, 5.2, 4.6]} intensity={1.1} castShadow />
      <directionalLight position={[-3.5, 2.2, 2.2]} intensity={0.38} />
      <spotLight position={[0, 4.8, 4.4]} angle={0.42} penumbra={0.55} intensity={0.7} />

      <CabinetRig>
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0, -bodyDepth / 2]} castShadow receiveShadow>
            <boxGeometry args={[totalWidth, totalHeight, bodyDepth]} />
            <meshStandardMaterial color="#08090a" roughness={0.62} metalness={0.08} />
          </mesh>

          <mesh position={[0, totalHeight / 2 + 0.12, -bodyDepth / 2]} castShadow receiveShadow>
            <boxGeometry args={[totalWidth + 0.18, 0.18, bodyDepth + 0.12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.74} metalness={0.04} />
          </mesh>

          <mesh position={[0, -totalHeight / 2 - 0.11, -bodyDepth / 2]} castShadow receiveShadow>
            <boxGeometry args={[totalWidth + 0.28, 0.22, bodyDepth + 0.18]} />
            <meshStandardMaterial color="#08090a" roughness={0.62} metalness={0.1} />
          </mesh>

          <mesh position={[-totalWidth / 2 - 0.07, 0, -bodyDepth / 2]} castShadow receiveShadow>
            <boxGeometry args={[0.14, totalHeight + 0.26, bodyDepth + 0.1]} />
            <meshStandardMaterial color="#08090a" roughness={0.62} metalness={0.1} />
          </mesh>
          <mesh position={[totalWidth / 2 + 0.07, 0, -bodyDepth / 2]} castShadow receiveShadow>
            <boxGeometry args={[0.14, totalHeight + 0.26, bodyDepth + 0.1]} />
            <meshStandardMaterial color="#08090a" roughness={0.62} metalness={0.1} />
          </mesh>

          {visibleArtists.map((artist, index) => (
            <CabinetDrawer
              key={artist.name}
              artist={artist}
              index={index}
              columns={columns}
              rows={rows}
              onOpen={onOpen}
            />
          ))}

          <Html position={[0, -totalHeight / 2 - 0.52, 0.2]} center distanceFactor={9} zIndexRange={[10, 0]}>
            <div className="cabinet-caption">
              Hover a drawer · click to open artist folder
              {artists.length > visibleArtists.length ? ` · ${artists.length - visibleArtists.length} more below` : ""}
            </div>
          </Html>
        </group>
      </CabinetRig>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -totalHeight / 2 - 0.28, -0.15]} receiveShadow>
        <planeGeometry args={[9, 4.2]} />
        <shadowMaterial opacity={0.14} />
      </mesh>
    </>
  );
}

class CabinetErrorBoundary extends Component<{ children: ReactNode; onFail: () => void }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function ArtistCabinet3D({ artists }: ArtistCabinet3DProps) {
  const router = useRouter();
  const [webglReady, setWebglReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const cameraPosition = useMemo<[number, number, number]>(() => {
    const rows = Math.max(1, Math.ceil(Math.min(artists.length, 10) / (artists.length <= 3 ? 1 : 2)));
    return [0, rows > 4 ? 1.15 : 0.85, rows > 4 ? 7.3 : 6.4];
  }, [artists.length]);

  useEffect(() => {
    setWebglReady(canUseWebGL());
  }, []);

  if (artists.length === 0 || failed || !webglReady) return null;

  return (
    <section className="artist-cabinet-panel" aria-label="3D artist filing cabinet preview">
      <div className="artist-cabinet-copy">
        <p className="pixel-label">3D desk preview</p>
        <h2>Filing cabinet mode.</h2>
        <p>The normal folder grid stays below. This is just the fun drawer view on desktop.</p>
      </div>
      <div className="artist-cabinet-frame">
        <CabinetErrorBoundary onFail={() => setFailed(true)}>
          <Canvas
          shadows
          dpr={[1, 1.6]}
          camera={{ position: cameraPosition, fov: 38 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.setClearColor("#f7f8fb", 1);
          }}
        >
          <CabinetScene artists={artists} onOpen={(href) => router.push(href)} />
          </Canvas>
        </CabinetErrorBoundary>
      </div>
    </section>
  );
}
