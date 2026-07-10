"use client";

import { Html } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

export type CabinetArtist = {
  name: string;
  href: string;
  briefCount: number;
  draftCount: number;
  completedCount: number;
  projectPreview?: string;
};

type CabinetDrawerProps = {
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

export function CabinetDrawer({ artist, index, columns, rows, onOpen }: CabinetDrawerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const row = Math.floor(index / columns);
  const col = index % columns;
  const drawerWidth = columns === 1 ? 3.9 : 2.42;
  const drawerHeight = 0.72;
  const gapX = 0.18;
  const gapY = 0.22;
  const x = (col - (columns - 1) / 2) * (drawerWidth + gapX);
  const y = ((rows - 1) / 2 - row) * (drawerHeight + gapY);

  useFrame((state) => {
    if (!groupRef.current) return;
    const targetZ = hovered ? 0.58 : 0.03;
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.16);
    const hoverLift = hovered ? 0.025 : 0;
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, y + hoverLift, 0.12);

    const pulse = hovered ? Math.sin(state.clock.elapsedTime * 7) * 0.006 : 0;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, hovered ? -0.025 + pulse : 0, 0.12);
  });

  return (
    <group
      ref={groupRef}
      position={[x, y, 0.03]}
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
      <mesh castShadow receiveShadow>
        <boxGeometry args={[drawerWidth, drawerHeight, 0.52]} />
        <meshStandardMaterial color={hovered ? "#fff8f4" : "#ffffff"} roughness={0.72} metalness={0.08} />
      </mesh>

      <mesh position={[0, 0, 0.285]} castShadow>
        <boxGeometry args={[drawerWidth + 0.04, drawerHeight + 0.04, 0.06]} />
        <meshStandardMaterial color={hovered ? "#eb5160" : "#08090a"} roughness={0.52} metalness={0.14} />
      </mesh>

      <mesh position={[0, 0.01, 0.335]} castShadow>
        <boxGeometry args={[drawerWidth - 0.26, drawerHeight - 0.18, 0.045]} />
        <meshStandardMaterial color="#ffffff" roughness={0.64} metalness={0.02} />
      </mesh>

      <mesh position={[0, -0.055, 0.39]} castShadow>
        <boxGeometry args={[Math.min(0.86, drawerWidth * 0.36), 0.14, 0.08]} />
        <meshStandardMaterial color="#08090a" roughness={0.38} metalness={0.38} />
      </mesh>

      <Html
        position={[0, 0.06, 0.45]}
        center
        transform
        occlude={false}
        distanceFactor={columns === 1 ? 6.6 : 7.4}
        zIndexRange={[20, 0]}
      >
        <button className="cabinet-drawer-label" type="button" onClick={() => onOpen(artist.href)}>
          <span className="cabinet-drawer-name">{artist.name}</span>
          <span className="cabinet-drawer-meta">
            {artist.briefCount} brief{artist.briefCount === 1 ? "" : "s"} · {artist.draftCount} draft
            {artist.completedCount ? ` · ${artist.completedCount} done` : ""}
          </span>
          {artist.projectPreview ? <span className="cabinet-drawer-project">{artist.projectPreview}</span> : null}
        </button>
      </Html>
    </group>
  );
}
