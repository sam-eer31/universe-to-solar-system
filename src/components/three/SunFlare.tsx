"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "@/lib/store";

export default function SunFlare() {
  const materialRef = useRef<THREE.SpriteMaterial>(null);
  const spriteRef = useRef<THREE.Sprite>(null);

  // 👇 USER ADJUSTMENTS HERE 👇
  const BRIGHTNESS = 5.0; // <--- CHANGE THIS VALUE to make light brighter/lesser (e.g. 0.5 to 2.0)
  const SIZE = 17000;      // <--- CHANGE THIS VALUE to make the point bigger/smaller
  // 👆 -------------------- 👆

  // Generate a perfect, smooth glowing point texture
  const lightTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // A more realistic "actual light" gradient (no distinct colored bands)
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");      // Intense white core
    gradient.addColorStop(0.05, "rgba(255, 240, 220, 0.9)"); // Hot inner glow
    gradient.addColorStop(0.2, "rgba(255, 200, 100, 0.4)");  // Warm mid glow
    gradient.addColorStop(0.5, "rgba(255, 100, 20, 0.1)");   // Very soft orange spread
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");            // Perfect fade to black/transparent

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    if (!materialRef.current || !spriteRef.current) return;

    const worldPos = new THREE.Vector3();
    spriteRef.current.getWorldPosition(worldPos);
    const dist = state.camera.position.distanceTo(worldPos);

    // Smoothly map distance to a 0-1 factor over a massive distance range (e.g. 5.0 to 0)
    // The camera zooms exponentially, meaning distance drops extremely fast at first, then slows down.
    // By using Math.sqrt on the distance factor, we perfectly counteract the exponential camera speed,
    // guaranteeing a buttery-smooth, constant visual fade over the entire scrolling journey!
    // 1. PERFECT PERSPECTIVE CANCELLATION
    // To make a 3D Sprite maintain the exact same visual size on your screen regardless of distance, 
    // we must multiply its base size by its distance to the camera.
    // The SIZE variable now acts as the true "On-Screen Size".
    const perspectiveScale = SIZE * dist;

    // 2. THE SHRINK EFFECT
    // We only want the glare to start shrinking when you get close (e.g. within 2.0 units).
    // So if dist > 2.0, shrinkFactor is 1.0 (no shrink). As it gets closer than 2.0, it goes to 0.
    const shrinkFactor = THREE.MathUtils.clamp(dist / 2.0, 0.0, 1.0);

    // Apply a slight curve so the shrinking feels organic
    const smoothShrink = Math.pow(shrinkFactor, 0.8);

    // Apply final scale!
    const currentSize = perspectiveScale * smoothShrink;
    spriteRef.current.scale.set(currentSize, currentSize, 1);

    // 3. PREVENT VISUAL BLEEDING BEHIND IMAGES
    // We only want the massive Sun Flare to fade in as we approach the final void circle.
    const storeState = useAppStore.getState();
    const scrollProgress = storeState.scrollProgress;
    const numScenes = storeState.universeData?.scenes?.length || 0;
    
    let visibilityFactor = 1.0;
    if (numScenes > 0) {
      // The CameraSystem uses exactly 3 segments when scenes and a solar system exist:
      // 0.0 -> 0.333 : From First Scene to Final Circle (passing all images)
      // 0.333 -> 0.666 : Final Circle to Mid Void
      // 0.666 -> 1.0 : Mid Void to Sun
      
      // The user wants the glow to be invisible at the very start (behind the first image at 0.0),
      // but fully visible once they pass all images and reach the void (around 0.333).
      visibilityFactor = THREE.MathUtils.clamp(
        (scrollProgress - 0.1) * 4.0, // 0.0 at scroll 0.1, 1.0 at scroll 0.35
        0.0, 
        1.0
      );
    }

    // 4. INTENSITY FADE
    // Keep brightness full until we get very close, then softly fade it
    materialRef.current.opacity = BRIGHTNESS * smoothShrink * visibilityFactor;
  });

  if (!lightTexture) return null;

  return (
    <sprite ref={spriteRef} position={[0, 0, 0]} scale={[SIZE, SIZE, 1]}>
      <spriteMaterial
        ref={materialRef}
        map={lightTexture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}
