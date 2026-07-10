"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { DesktopFolder3D, type CabinetArtist } from "@/components/CabinetDrawer";

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

function DesktopRig({ children }: { children: ReactNode }) {
  const rigRef = useRef<THREE.Group>(null);

  useFrame(({ pointer }) => {
    if (!rigRef.current) return;
    rigRef.current.rotation.y = THREE.MathUtils.lerp(rigRef.current.rotation.y, pointer.x * 0.045, 0.045);
    rigRef.current.rotation.x = THREE.MathUtils.lerp(rigRef.current.rotation.x, -0.055 + pointer.y * 0.025, 0.045);
  });

  return <group ref={rigRef}>{children}</group>;
}

function DesktopScreenScene({ artists, onOpen }: { artists: CabinetArtist[]; onOpen: (href: string) => void }) {
  const visibleArtists = artists.slice(0, 12);
  const columns = visibleArtists.length <= 4 ? visibleArtists.length : 4;
  const rows = Math.max(1, Math.ceil(visibleArtists.length / Math.max(1, columns)));
  const screenWidth = 8.6;
  const screenHeight = rows > 2 ? 4.9 : 4.25;
  const screenY = rows > 2 ? 0.1 : 0;

  return (
    <>
      <color attach="background" args={["#eff3f9"]} />
      <ambientLight intensity={0.78} />
      <directionalLight position={[3.6, 5.4, 4.2]} intensity={1.05} castShadow />
      <directionalLight position={[-4.5, 2.2, 2.8]} intensity={0.42} />
      <spotLight position={[0, 5.4, 4.8]} angle={0.5} penumbra={0.55} intensity={0.72} />

      <DesktopRig>
        <group position={[0, screenY, 0]}>
          <mesh position={[0, 0, -0.42]} castShadow receiveShadow>
            <boxGeometry args={[screenWidth + 0.36, screenHeight + 0.36, 0.34]} />
            <meshStandardMaterial color="#08090a" roughness={0.62} metalness={0.08} />
          </mesh>

          <mesh position={[0, 0, -0.2]} receiveShadow>
            <boxGeometry args={[screenWidth, screenHeight, 0.12]} />
            <meshStandardMaterial color="#f7f9fc" roughness={0.78} metalness={0.02} />
          </mesh>

          <mesh position={[0, screenHeight / 2 - 0.27, -0.08]} receiveShadow>
            <boxGeometry args={[screenWidth - 0.28, 0.36, 0.08]} />
            <meshStandardMaterial color="#ffffff" roughness={0.7} metalness={0.02} />
          </mesh>

          <mesh position={[0, -screenHeight / 2 + 0.3, -0.075]} receiveShadow>
            <boxGeometry args={[screenWidth - 0.28, 0.34, 0.08]} />
            <meshStandardMaterial color="#08090a" roughness={0.6} metalness={0.1} />
          </mesh>

          <mesh position={[-screenWidth / 2 + 0.55, screenHeight / 2 - 0.27, 0.03]} castShadow>
            <boxGeometry args={[0.18, 0.18, 0.07]} />
            <meshStandardMaterial color="#eb5160" roughness={0.55} metalness={0.05} />
          </mesh>
          <mesh position={[-screenWidth / 2 + 0.85, screenHeight / 2 - 0.27, 0.03]} castShadow>
            <boxGeometry args={[0.18, 0.18, 0.07]} />
            <meshStandardMaterial color="#ffd073" roughness={0.55} metalness={0.05} />
          </mesh>
          <mesh position={[-screenWidth / 2 + 1.15, screenHeight / 2 - 0.27, 0.03]} castShadow>
            <boxGeometry args={[0.18, 0.18, 0.07]} />
            <meshStandardMaterial color="#57c785" roughness={0.55} metalness={0.05} />
          </mesh>

          {visibleArtists.map((artist, index) => (
            <DesktopFolder3D
              key={artist.name}
              artist={artist}
              index={index}
              columns={columns || 1}
              rows={rows}
              onOpen={onOpen}
            />
          ))}

          <Html position={[0, screenHeight / 2 - 0.28, 0.13]} center distanceFactor={7.6} zIndexRange={[15, 0]}>
            <div className="desktop-3d-titlebar-label">
              JDW desktop · artist folders · click a folder to open
            </div>
          </Html>

          <Html position={[0, -screenHeight / 2 + 0.3, 0.13]} center distanceFactor={7.9} zIndexRange={[15, 0]}>
            <div className="desktop-3d-taskbar-label">
              {visibleArtists.length} visible folder{visibleArtists.length === 1 ? "" : "s"}
              {artists.length > visibleArtists.length ? ` · ${artists.length - visibleArtists.length} more in the grid below` : ""}
            </div>
          </Html>
        </group>
      </DesktopRig>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.72, -0.28]} receiveShadow>
        <planeGeometry args={[10.8, 4.6]} />
        <shadowMaterial opacity={0.12} />
      </mesh>
    </>
  );
}

class Desktop3DErrorBoundary extends Component<{ children: ReactNode; onFail: () => void }, { hasError: boolean }> {
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
    const visibleCount = Math.min(artists.length, 12);
    const rows = Math.max(1, Math.ceil(visibleCount / (visibleCount <= 4 ? Math.max(1, visibleCount) : 4)));
    return [0, rows > 2 ? 0.5 : 0.25, rows > 2 ? 8.6 : 7.4];
  }, [artists.length]);

  useEffect(() => {
    setWebglReady(canUseWebGL());
  }, []);

  if (artists.length === 0 || failed || !webglReady) return null;

  return (
    <section className="artist-cabinet-panel desktop-3d-panel" aria-label="3D desktop artist folder preview">
      <div className="desktop-3d-intro">
        <div>
          <p className="pixel-label">Desktop view</p>
          <h2>Open artist folders fast.</h2>
          <p>Clean 3D folder shortcuts with the key campaign info visible. The full 2D grid stays underneath as the fallback.</p>
        </div>
        <div className="desktop-3d-stats" aria-hidden="true">
          <span>{artists.length} artists</span>
          <span>{artists.reduce((total, artist) => total + artist.briefCount, 0)} briefs</span>
          <span>{artists.reduce((total, artist) => total + artist.draftCount, 0)} drafts</span>
        </div>
      </div>

      <div className="artist-cabinet-frame desktop-3d-frame">
        <Desktop3DErrorBoundary onFail={() => setFailed(true)}>
          <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{ position: cameraPosition, fov: 40 }}
            gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              gl.setClearColor("#eff3f9", 1);
            }}
          >
            <DesktopScreenScene artists={artists} onOpen={(href) => router.push(href)} />
          </Canvas>
        </Desktop3DErrorBoundary>
      </div>
    </section>
  );
}
