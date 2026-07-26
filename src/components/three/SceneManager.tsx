"use client";

import { useAppStore } from "@/lib/store";
import { Canvas } from "@react-three/fiber";
import { Preload, MapControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import CameraSystem from "./CameraSystem";
import ImageLayer from "./ImageLayer";
import FinalCircleOverlay from "./FinalCircleOverlay";
import SolarSystem from "./SolarSystem";
import { Suspense } from "react";

export default function SceneManager() {
  const { universeData, isDevMode } = useAppStore();

  if (!universeData) return null;

  return (
    <Canvas
      gl={{ antialias: false, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
      camera={{ position: [0, 0, 5], fov: universeData.cameraSettings.baseFov, near: 0.000001, far: 1000000000 }}
      dpr={[1, 2]}
      onContextMenu={(e) => e.preventDefault()} // Prevent browser menu on right click
    >
      <color attach="background" args={['#020202']} />
      <Suspense fallback={null}>
        
        {/* Core Camera Interpolation */}
        <CameraSystem />

        {/* Editor Controls */}
        {isDevMode && (
          <MapControls 
            makeDefault 
            enableRotate={false} 
            minDistance={0.00001}
            maxDistance={1000}
            zoomSpeed={3.0}
            screenSpacePanning={true}
            mouseButtons={{
              LEFT: THREE.MOUSE.NONE,   // Left click is for dragging images
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN    // Right click is for panning the camera
            }}
          />
        )}

        {/* Global Final View Circle (Dev Mode only) */}
        <FinalCircleOverlay />

        {/* Dynamic Image Layers */}
        {universeData.scenes.map((scene, index) => (
          <ImageLayer key={scene.id} scene={scene} layerIndex={index} />
        ))}

        {/* 3D Solar System */}
        <SolarSystem />

        <Preload all />

        {/* Cinematic Post Processing */}
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom luminanceThreshold={0.5} mipmapBlur intensity={0.5} />
          <Noise opacity={0.03} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
