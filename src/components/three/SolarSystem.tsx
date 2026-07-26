"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useAppStore } from "@/lib/store";
import { useGLTF, useAnimations, useTexture } from "@react-three/drei";
import SunFlare from "./SunFlare";

const PLANETS = ['Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

const getClickedPlanetName = (objectName: string) => {
  return PLANETS.find(p => objectName.includes(p) && !objectName.includes('OrbitLine'));
};

export default function SolarSystem() {
  const { universeData } = useAppStore();
  const groupRef = useRef<THREE.Group>(null);
  const bgGroupRef = useRef<THREE.Group>(null);
  const bgMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const isDragging = useRef(false);
  const grabStartPos = useRef({ x: 0, y: 0 });
  const previousPosition = useRef({ x: 0, y: 0 });
  const targetRotationX = useRef(0);
  const targetRotationY = useRef(0);
  const offsetGroupRef = useRef<THREE.Group>(null);
  const currentOffset = useRef(new THREE.Vector3(0, 0, 0));

  const finalCircle = universeData?.cameraSettings?.finalCircle;
  const hasSolarSystem = universeData?.cameraSettings?.hasSolarSystem;

  const { scene: gltfScene, animations } = useGLTF("/solar_system.glb");
  const { actions } = useAnimations(animations, gltfScene);
  const texture = useTexture("/8k_stars.jpg");

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  // Clean up the GLTF model to prevent its built-in lighting from mixing with our custom logic
  useMemo(() => {
    if (gltfScene) {
      gltfScene.traverse((node: any) => {
        if (node.isLight) {
          // Turn off built-in lights (like a PointLight inside the sun)
          node.intensity = 0;
          node.visible = false;
        }
        if (node.isMesh && node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          
          materials.forEach((mat: any) => {
            // Tone down the sun's emissive material to prevent blowing out the bloom
            if (
              node.name.toLowerCase().includes("sun") ||
              (mat.name && mat.name.toLowerCase().includes("sun"))
            ) {
              mat.emissiveIntensity = 0;
            }
            
            // FIX: Prevent transparent objects (like rings or atmospheres) 
            // from writing to the depth buffer and slicing geometry behind them.
            if (mat.transparent) {
              mat.depthWrite = false;
            }
          });
        }
      });
    }
  }, [gltfScene]);

  const grabSphereRadius = useMemo(() => {
    if (!gltfScene) return 1000;
    const box = new THREE.Box3().setFromObject(gltfScene);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    return sphere.radius;
  }, [gltfScene]);

  // Play all animations (planet orbits, tilts, rotations) automatically
  useEffect(() => {
    if (actions) {
      Object.values(actions).forEach((action) => {
        action?.play();
      });
    }
  }, [actions]);

  // Handle global pointer events for smooth dragging even if the mouse leaves the model
  useEffect(() => {
    const handlePointerUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'auto';
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      // We only handle mouse pointer moves here to avoid double-processing touches
      if (e.pointerType !== 'mouse') return;

      const deltaX = e.clientX - previousPosition.current.x;
      const deltaY = e.clientY - previousPosition.current.y;
      previousPosition.current = { x: e.clientX, y: e.clientY };

      // Adjust sensitivity and add to target rotation
      targetRotationX.current += deltaY * 0.01;
      targetRotationY.current += deltaX * 0.01;

      // Clamp between -90 and 90 degrees (Math.PI / 2) to avoid flipping the model upside down completely
      targetRotationX.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationX.current));
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Ignore multi-touch (pinch gestures) so they don't fight with rotation
      if (e.touches.length > 1) return;

      const touch = e.touches[0];
      if (!touch) return;

      if (!isDragging.current) return;

      // We are officially grabbing! Prevent scrolling!
      if (e.cancelable) {
        e.preventDefault();
      }

      const deltaX = touch.clientX - previousPosition.current.x;
      const deltaY = touch.clientY - previousPosition.current.y;
      previousPosition.current = { x: touch.clientX, y: touch.clientY };

      // Touch sensitivity
      targetRotationX.current += deltaY * 0.015;
      targetRotationY.current += deltaX * 0.015;
      targetRotationX.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationX.current));
    };

    const handleWheel = (e: WheelEvent) => {
      const { focusedPlanet, planetZoom, setPlanetZoom, setFocusedPlanet } = useAppStore.getState();
      if (focusedPlanet) {
        e.preventDefault();
        
        // deltaY > 0 means scroll down (now zooms in / smaller zoom value)
        const zoomDelta = -e.deltaY * 0.001;
        let newZoom = planetZoom + zoomDelta;
        
        if (newZoom > 1.05) {
          setFocusedPlanet(null);
          setPlanetZoom(1.0);
        } else {
          newZoom = Math.max(0.1, newZoom);
          setPlanetZoom(newZoom);
        }
      }
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('touchcancel', handlePointerUp);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // We use scale 0.005 which is large enough to prevent vertex precision loss.
  const solarSystemScale = 0.0001;

  useFrame((state, delta) => {
    if (finalCircle && groupRef.current) {
      // Smoothly interpolate Y rotation based on user drag
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotationY.current,
        0.1
      );

      // Smoothly interpolate X rotation based on user drag
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotationX.current,
        0.1
      );

      if (bgGroupRef.current) {
        bgGroupRef.current.rotation.y = groupRef.current.rotation.y;
        bgGroupRef.current.rotation.x = groupRef.current.rotation.x;
      }

      if (bgMaterialRef.current) {
        const { scrollProgress } = useAppStore.getState();
        const finalCircleProgress = 1.0 / 3.0;
        const fadeStartProgress = finalCircleProgress - 0.05;

        if (scrollProgress >= fadeStartProgress && scrollProgress <= finalCircleProgress) {
          let progress = (scrollProgress - fadeStartProgress) / (finalCircleProgress - fadeStartProgress);
          progress = progress * progress * (3 - 2 * progress);
          bgMaterialRef.current.opacity = progress;
        } else if (scrollProgress > finalCircleProgress) {
          bgMaterialRef.current.opacity = 1;
        } else {
          bgMaterialRef.current.opacity = 0;
        }
      }

      // Smoothly offset the scene to center the focused planet
      if (offsetGroupRef.current) {
        let targetLocalPos = new THREE.Vector3(0, 0, 0);

        const { focusedPlanet } = useAppStore.getState();
        if (focusedPlanet) {
          const target = gltfScene.getObjectByName(focusedPlanet.name);
          if (target) {
            // Temporarily set offset to 0 to get true local position without feedback loop
            const originalOffset = offsetGroupRef.current.position.clone();
            offsetGroupRef.current.position.set(0, 0, 0);
            offsetGroupRef.current.updateMatrixWorld(true);

            const worldPos = new THREE.Vector3();
            target.getWorldPosition(worldPos);
            targetLocalPos = groupRef.current.worldToLocal(worldPos);

            // Restore the offset
            offsetGroupRef.current.position.copy(originalOffset);
            offsetGroupRef.current.updateMatrixWorld(true);
          }
        }

        // Smoothly move the current offset towards the negative of targetLocalPos
        const desiredOffset = targetLocalPos.clone().multiplyScalar(-1);
        currentOffset.current.lerp(desiredOffset, 4 * delta);
        
        offsetGroupRef.current.position.copy(currentOffset.current);
      }
    }
  });

  if (!hasSolarSystem || !finalCircle) return null;

  return (
    <>
      {/* Background Sphere */}
      <group ref={bgGroupRef} position={[finalCircle.x, finalCircle.y, -0.5]}>
        <mesh renderOrder={-1}>
          <sphereGeometry args={[500, 64, 64]} />
          <meshBasicMaterial
            ref={bgMaterialRef}
            map={texture}
            side={THREE.BackSide}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group
        ref={groupRef}
        position={[finalCircle.x, finalCircle.y, -0.5]} // Restored far away depth for massive void journey!
        scale={[solarSystemScale, solarSystemScale, solarSystemScale]}
        onPointerDown={(e) => {
          e.stopPropagation();
          previousPosition.current = { x: e.clientX, y: e.clientY };
          grabStartPos.current = { x: e.clientX, y: e.clientY };

          isDragging.current = true;
          if (e.pointerType === 'mouse') {
            document.body.style.cursor = 'grabbing';
          }
          if (e.pointerId !== undefined && e.nativeEvent.target) {
            (e.nativeEvent.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }
        }}

        onClick={(e) => {
          e.stopPropagation();
          
          const dist = Math.hypot(e.clientX - grabStartPos.current.x, e.clientY - grabStartPos.current.y);
          if (dist > 10) return; // Ignore if user dragged to rotate
          
          // Iterate through all intersections to pierce through invisible/transparent blockers (like SunFlare)
          for (const hit of e.intersections) {
            const planetName = getClickedPlanetName(hit.object.name);
            if (planetName) {
              const target = gltfScene.getObjectByName(planetName);
              if (target) {
                const box = new THREE.Box3().setFromObject(target);
                const sphere = new THREE.Sphere();
                box.getBoundingSphere(sphere);
                
                let distance = sphere.radius * 3.5;
                if (planetName === 'Sun') distance = sphere.radius * 2.5;

                useAppStore.getState().setFocusedPlanet({ name: planetName, distance });
                return; // Stop checking after we found the first valid target!
              }
            } else if (hit.object.name === 'GrabSphere') {
              useAppStore.getState().setFocusedPlanet(null);
              return; // Stop checking
            }
          }
        }}
        onPointerMissed={(e) => {
          if (e.type === 'click') {
             useAppStore.getState().setFocusedPlanet(null);
          }
        }}
      >
        <mesh name="GrabSphere">
          <sphereGeometry args={[grabSphereRadius, 32, 32]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.BackSide} depthWrite={false} />
        </mesh>
        
        <group ref={offsetGroupRef}>
          <primitive object={gltfScene} />
        </group>
        <SunFlare />
        {/* Basic lighting to ensure the GLTF model is visible */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={2} />
      </group>
    </>
  );
}

useGLTF.preload("/solar_system.glb");
