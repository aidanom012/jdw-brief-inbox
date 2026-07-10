"use client";

import { Html } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type CabinetArtist = {
  name: string;
  href: string;
  briefCount: number;
  draftCount: number;
  completedCount: number;
  projectPreview?: string;
};

type DesktopFolder3DProps = {
  artist: CabinetArtist;
  index: number;
  columns: number;
  rows: number;
  onOpen: (href: string) => void;
};

function stopAndOpen(event: ThreeEvent<MouseEvent>, href: string, onOpen: (href: string) => void) {
  event.stopPropagation();
  onOpen(href);
}

function useFolderPosition(index: number, columns: number, rows: number): [number, number, number] {
  return useMemo(() => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const xGap = columns >= 4 ? 1.82 : 2.08;
    const yGap = rows >= 3 ? 1.26 : 1.38;
    const x = (col - (columns - 1) / 2) * xGap;
    const y = ((rows - 1) / 2 - row) * yGap;
    const z = (row % 2) * -0.08;
    return [x, y, z];
  }, [columns, index, rows]);
}

export function DesktopFolder3D({ artist, index, columns, rows, onOpen }: DesktopFolder3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [x, y, z] = useFolderPosition(index, columns, rows);
  const hasDrafts = artist.draftCount > 0;

  useFrame((state) => {
    if (!groupRef.current) return;
    const targetZ = hovered ? z + 0.48 : z;
    const targetY = hovered ? y + 0.12 : y;
    const targetRotX = hovered ? -0.18 : -0.05;
    const targetRotY = hovered ? (x < 0 ? 0.08 : -0.08) : 0;
    const targetScale = hovered ? 1.045 : 1;

    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.14);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.14);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.12);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.12);
    groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.12);
    groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, targetScale, 0.12);
    groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, targetScale, 0.12);

    const pulse = hovered ? Math.sin(state.clock.elapsedTime * 8) * 0.008 : 0;
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, x + pulse, 0.08);
  });

  return (
    <group
      ref={groupRef}
      position={[x, y, z]}
      rotation={[-0.05, 0, 0]}
      onPointerEnter={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "";
      }}
      onClick={(event) => stopAndOpen(event, artist.href, onOpen)}
    >
      <mesh position={[0, 0.17, -0.08]} castShadow receiveShadow>
        <boxGeometry args={[1.36, 0.92, 0.16]} />
        <meshStandardMaterial color={hovered ? "#fff1da" : "#ffe4ad"} roughness={0.72} metalness={0.02} />
      </mesh>

      <mesh position={[-0.37, 0.72, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.58, 0.26, 0.18]} />
        <meshStandardMaterial color={hovered ? "#ffdc93" : "#ffd073"} roughness={0.68} metalness={0.02} />
      </mesh>

      <mesh position={[0, -0.02, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[1.52, 0.9, 0.22]} />
        <meshStandardMaterial color={hovered ? "#fff5e5" : "#fff0cc"} roughness={0.66} metalness={0.02} />
      </mesh>

      <mesh position={[0, -0.41, 0.235]} castShadow>
        <boxGeometry args={[1.34, 0.07, 0.06]} />
        <meshStandardMaterial color="#08090a" roughness={0.56} metalness={0.08} />
      </mesh>

      <mesh position={[0.53, 0.41, 0.245]} castShadow>
        <boxGeometry args={[0.24, 0.18, 0.055]} />
        <meshStandardMaterial color={hasDrafts ? "#eb5160" : "#08090a"} roughness={0.5} metalness={0.04} />
      </mesh>

      <Html
        position={[0, -0.02, 0.34]}
        center
        transform
        occlude={false}
        distanceFactor={7.2}
        zIndexRange={[30, 0]}
      >
        <button className="desktop-folder-3d-label" type="button" onClick={() => onOpen(artist.href)}>
          <span className="desktop-folder-3d-open">{hovered ? "Open folder →" : "Artist folder"}</span>
          <span className="desktop-folder-3d-name">{artist.name}</span>
          <span className="desktop-folder-3d-meta">
            {artist.briefCount} brief{artist.briefCount === 1 ? "" : "s"} · {artist.draftCount} draft
            {artist.completedCount ? ` · ${artist.completedCount} done` : ""}
          </span>
          {artist.projectPreview ? <span className="desktop-folder-3d-project">{artist.projectPreview}</span> : null}
        </button>
      </Html>
    </group>
  );
}
