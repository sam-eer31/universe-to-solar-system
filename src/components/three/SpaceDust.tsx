"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "@/lib/store";

export default function SpaceDust() {
  const { universeData } = useAppStore();
  const finalCircle = universeData?.cameraSettings?.finalCircle;
  
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Generate a sparse volume of dust particles
  const [positions, scales] = useMemo(() => {
    const particleCount = 600; // Slightly more so they are visible even when tiny
    const pos = new Float32Array(particleCount * 3);
    const scale = new Float32Array(particleCount);

    const xOrigin = finalCircle?.x || 0;
    const yOrigin = finalCircle?.y || 0;

    const fov = universeData?.cameraSettings?.baseFov || 45;
    const fovRad = (fov * Math.PI) / 180;
    
    // We extend the particle field all the way back to Z=0.5 (which is far before the void)
    // This guarantees that as the camera flies through the image fade out window, it is ALREADY
    // flying through the particle field, creating beautiful motion!
    const startZ = 0.5;
    const endZ = -0.49;
    const zRange = startZ - endZ;

    for (let i = 0; i < particleCount; i++) {
      // Exponential distribution so more particles are closer to the sun where the camera slows down.
      // This balances out the exponential camera speed perfectly!
      const zPos = startZ - (Math.pow(Math.random(), 0.8) * zRange); 
      
      const angle = Math.random() * Math.PI * 2;
      
      // CRITICAL MATHEMATICAL FIX: To fill the screen at ALL depths, the radius MUST scale with Z!
      // This forms a perfect cone matching the camera's exact FOV frustum.
      const distToSun = zPos + 0.495;
      const maxRadius = distToSun * Math.tan(fovRad / 2) * 1.5; // Slightly larger than screen to cover edges
      
      // Uniform area distribution across the circular slice
      const radius = Math.pow(Math.random(), 0.5) * maxRadius; 

      pos[i * 3 + 0] = xOrigin + Math.cos(angle) * radius;
      pos[i * 3 + 1] = yOrigin + Math.sin(angle) * radius;
      pos[i * 3 + 2] = zPos;

      // Make them incredibly tiny!
      scale[i] = 0.02 + Math.random() * 0.08;
    }

    return [pos, scale];
  }, [finalCircle, universeData]);

  const uniforms = useMemo(() => ({ uVisibility: { value: 0.0 } }), []);

  useFrame(() => {
    const { scrollProgress, universeData } = useAppStore.getState();
    if (materialRef.current && universeData?.cameraSettings?.hasSolarSystem) {
      const finalCircleProgress = 1.0 / 3.0;
      const fadeStartProgress = finalCircleProgress - 0.12; // Exactly when image starts fading
      
      let visibility = 0.0;
      if (scrollProgress >= fadeStartProgress) {
        // Fade particles in as the image fades out!
        visibility = Math.min(1.0, (scrollProgress - fadeStartProgress) / 0.05);
      }
      
      materialRef.current.uniforms.uVisibility.value = visibility;
    }
  });

  if (!finalCircle) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={scales.length}
          array={scales}
          itemSize={1}
          args={[scales, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          attribute float aScale;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // Base multiplier dropped drastically to make them extremely tiny dots
            gl_PointSize = (2.0 * aScale) * (1.0 / -mvPosition.z);
            
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform float uVisibility;
          void main() {
            vec2 center = vec2(0.5, 0.5);
            float dist = distance(gl_PointCoord, center);
            
            if (dist > 0.5) discard;
            
            float alpha = (0.5 - dist) * 2.0; 
            alpha = pow(alpha, 1.5); 
            
            vec3 color = vec3(1.0, 0.85, 0.6);
            
            gl_FragColor = vec4(color, alpha * 0.6 * uVisibility);
          }
        `}
      />
    </points>
  );
}
