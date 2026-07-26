"use client";

import { useTexture, Html } from "@react-three/drei";
import { SceneLayer, ZoomCircle } from "@/types/universe";
import { useAppStore } from "@/lib/store";
import * as THREE from "three";
import { useRef, useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import clsx from "clsx";

// CircleOverlay has been removed in favor of FinalCircleOverlay

export default function ImageLayer({ scene, layerIndex = 0 }: { scene: SceneLayer, layerIndex?: number }) {
  const { camera } = useThree();
  const texture = useTexture(scene.image, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
  });

  const meshRef = useRef<THREE.Mesh>(null);
  const { isDevMode, activeSceneId, setActiveSceneId, updateScene } = useAppStore();
  const isActive = activeSceneId === scene.id;

  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState(false);
  const startPos = useRef({ x: 0, y: 0, imgX: 0, imgY: 0, imgScale: 0 });

  const [localPos, setLocalPos] = useState({ x: scene.position.x, y: scene.position.y });
  const [localScale, setLocalScale] = useState(scene.scale);

  const latestImageValues = useRef({ x: scene.position.x, y: scene.position.y, scale: scene.scale });

  // Sync with store when not dragging
  useEffect(() => {
    if (!isDraggingImage && !isResizingImage) {
      setLocalPos({ x: scene.position.x, y: scene.position.y });
      setLocalScale(scene.scale);
      latestImageValues.current = { x: scene.position.x, y: scene.position.y, scale: scene.scale };
    }
  }, [scene.position.x, scene.position.y, scene.scale, isDraggingImage, isResizingImage]);

  useEffect(() => {
    if (!isDevMode || !isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingImage) {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;

        // Exact math for 1:1 pixel to 3D mapping based on camera distance
        const distance = Math.max(0.0001, camera.position.z - scene.depth);
        const fovRad = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180;
        const visibleHeightPhysical = 2 * distance * Math.tan(fovRad / 2);

        const unitsPerPixel = visibleHeightPhysical / window.innerHeight;

        const newX = startPos.current.imgX + dx * unitsPerPixel;
        const newY = startPos.current.imgY - dy * unitsPerPixel;

        latestImageValues.current.x = newX;
        latestImageValues.current.y = newY;
        setLocalPos({ x: newX, y: newY });

        // Dispatch liveDrag for children
        useAppStore.setState({
          liveDrag: {
            sourceIndex: layerIndex,
            deltaX: newX - scene.position.x,
            deltaY: newY - scene.position.y,
            scaleRatio: latestImageValues.current.scale / scene.scale,
            originX: scene.position.x,
            originY: scene.position.y,
          }
        });
      } else if (isResizingImage) {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        // Exponential scaling for natural feel at microscopic sizes
        const dist = (dx + dy) * 0.005;
        const newScale = Math.max(0.000001, startPos.current.imgScale * Math.exp(dist));

        latestImageValues.current.scale = newScale;
        setLocalScale(newScale);

        // Dispatch liveDrag for children
        useAppStore.setState({
          liveDrag: {
            sourceIndex: layerIndex,
            deltaX: latestImageValues.current.x - scene.position.x,
            deltaY: latestImageValues.current.y - scene.position.y,
            scaleRatio: newScale / scene.scale,
            originX: scene.position.x,
            originY: scene.position.y,
          }
        });
      }
    };

    const handleMouseUp = () => {
      if (isDraggingImage || isResizingImage) {
        // Save to store only on mouse up! 
        // This mathematically cascades to all children globally in the store logic!
        updateScene(scene.id, {
          position: { ...scene.position, x: latestImageValues.current.x, y: latestImageValues.current.y },
          scale: latestImageValues.current.scale
        });

        // Clear live drag state
        useAppStore.setState({ liveDrag: null });
      }
      setIsDraggingImage(false);
      setIsResizingImage(false);
    };

    if (isDraggingImage || isResizingImage) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingImage, isResizingImage, isDevMode, isActive, scene.id, updateScene, scene.scale]);

  // Compute CSS size for the bounding box based on 3D scale and camera distance roughly.
  // For Z=0 and camera Z=5, fov=45... 
  // We can just use a large multiplier that feels right or use Html transform.
  // Actually, using `transform` on Html makes it perfectly scale with 3D!

  // Removed raycastZOffset to eliminate 3D parallax gaps.
  // Rendering order is strictly enforced by the mesh's renderOrder property.
  const groupRef = useRef<THREE.Group>(null);

  // Update shader uniform dynamically if it changes
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Apply Live Drag Cascading
  useFrame(() => {
    if (!groupRef.current) return;
    const liveDrag = useAppStore.getState().liveDrag;
    if (liveDrag && layerIndex > liveDrag.sourceIndex) {
      // This scene is a child! Override position mathematically.
      const offsetX = scene.position.x - liveDrag.originX;
      const offsetY = scene.position.y - liveDrag.originY;
      const scaledOffsetX = offsetX * liveDrag.scaleRatio;
      const scaledOffsetY = offsetY * liveDrag.scaleRatio;

      const finalX = liveDrag.originX + liveDrag.deltaX + scaledOffsetX;
      const finalY = liveDrag.originY + liveDrag.deltaY + scaledOffsetY;

      groupRef.current.position.set(finalX, finalY, scene.depth || 0);
      // We only apply the scale ratio to the group because the mesh inside it already has localScale (scene.scale)
      groupRef.current.scale.set(liveDrag.scaleRatio, liveDrag.scaleRatio, 1);
    } else {
      // Restore standard state position
      groupRef.current.position.set(localPos.x, localPos.y, scene.depth || 0);
      groupRef.current.scale.set(1, 1, 1);
    }

    // Fade out logic for ALL images simultaneously when passing the last image
    const storeState = useAppStore.getState();
    const scrollProgress = storeState.scrollProgress;
    const universeData = storeState.universeData;

    if (materialRef.current && universeData?.scenes && universeData.scenes.length > 0) {
      if (universeData?.cameraSettings?.hasSolarSystem) {
        // The camera reaches the final circle (the void) exactly at scrollProgress = 1/3
        const finalCircleProgress = 1.0 / 3.0;

        // We start fading out the images exactly as we approach the final circle.
        // Tying this to scrollProgress guarantees a buttery-smooth cinematic fade
        // that can never "snap" to 0 due to 3D distance precision near zero!
        const fadeStartProgress = finalCircleProgress - 0.05; // Smooth 12% scroll window

        if (scrollProgress >= fadeStartProgress && scrollProgress <= finalCircleProgress) {
          let progress = (scrollProgress - fadeStartProgress) / (finalCircleProgress - fadeStartProgress);

          // Apply smoothstep easing (3x^2 - 2x^3) for a gentle, organic fade
          progress = progress * progress * (3 - 2 * progress);

          const fadeMultiplier = Math.max(0, 1 - progress);
          materialRef.current.opacity = scene.opacity * fadeMultiplier;
        } else if (scrollProgress > finalCircleProgress) {
          // After the final circle, the images are completely gone, revealing the void
          materialRef.current.opacity = 0;
        } else {
          // Before the fade window, images are fully solid
          materialRef.current.opacity = scene.opacity;
        }
      } else {
        materialRef.current.opacity = scene.opacity;
      }
    }
  });

  useEffect(() => {
    if (materialRef.current?.userData?.shader) {
      materialRef.current.userData.shader.uniforms.uFeather.value = scene.feathering || 0;
    }
  }, [scene.feathering]);

  return (
    <group
      ref={groupRef}
      rotation={[0, 0, scene.rotation]}
    >
      <mesh
        ref={meshRef}
        renderOrder={layerIndex}
        scale={[localScale, localScale, 1]}
        onPointerDown={(e) => {
          if (isDevMode) {
            if (e.button !== 0) return;

            // Fix for visual renderOrder vs 3D distance mismatch:
            // R3F triggers pointer events based on 3D distance. 
            // We want to select the object that is visually on top (highest renderOrder).
            let maxRenderOrder = -Infinity;
            for (const intersect of e.intersections) {
              // We only care about objects that are part of this layer system (they have renderOrder set)
              if (intersect.object && intersect.object.renderOrder !== undefined) {
                // Also check if the intersection is within the visual circle to be accurate
                let isInsideCircle = true;
                if (intersect.uv) {
                  const dist = Math.sqrt(Math.pow(intersect.uv.x - 0.5, 2) + Math.pow(intersect.uv.y - 0.5, 2));
                  if (dist > 0.5) isInsideCircle = false;
                }

                if (isInsideCircle && intersect.object.renderOrder > maxRenderOrder) {
                  maxRenderOrder = intersect.object.renderOrder;
                }
              }
            }

            // If there's an object visually on top of this one that was also clicked, ignore this click!
            if (maxRenderOrder > layerIndex) {
              return; // Bubbles down to the next intersected object
            }

            // Ensure we are actually inside our own visual circle before accepting the click
            if (e.uv) {
              const dist = Math.sqrt(Math.pow(e.uv.x - 0.5, 2) + Math.pow(e.uv.y - 0.5, 2));
              if (dist > 0.5) return;
            }

            e.stopPropagation();
            setActiveSceneId(scene.id);

            // Allow dragging immediately upon selection for better UX
            setIsDraggingImage(true);
            startPos.current = {
              x: e.clientX,
              y: e.clientY,
              imgX: localPos.x,
              imgY: localPos.y,
              imgScale: localScale
            };
          }
        }}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          opacity={scene.opacity}
          depthWrite={false}
          depthTest={false}
          color={isDevMode && isActive ? "#ffffff" : "#ffffff"}
          onBeforeCompile={(shader) => {
            shader.uniforms.uFeather = { value: scene.feathering || 0 };

            shader.fragmentShader = shader.fragmentShader.replace(
              'void main() {',
              'uniform float uFeather;\nvoid main() {'
            );

            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <alphamap_fragment>',
              `
              #include <alphamap_fragment>
              
              if (uFeather > 0.0) {
                // vMapUv is the UV coordinates provided by threejs when a map is active
                float dist = distance(vMapUv, vec2(0.5));
                float fadeStart = 0.5 - (0.5 * uFeather);
                float alphaMult = 1.0 - smoothstep(fadeStart, 0.5, dist);
                diffuseColor.a *= alphaMult;
              }
              `
            );

            if (materialRef.current) {
              materialRef.current.userData.shader = shader;
            }
          }}
        />
      </mesh>

      {isDevMode && isActive && (
        <lineSegments scale={[localScale, localScale, 1]} renderOrder={9999}>
          {/* A 1x1 plane geometry edges */}
          <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
          <lineBasicMaterial color="#6366f1" depthTest={false} depthWrite={false} />
        </lineSegments>
      )}

      {isDevMode && isActive && (
        <Html position={[0.5 * localScale, -0.5 * localScale, 0.01]} center zIndexRange={[9999, 0]}>
          <div
            className="w-3 h-3 bg-indigo-500 rounded-sm cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform shadow-[0_0_10px_rgba(99,102,241,0.5)] border border-white/50"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              setIsResizingImage(true);
              startPos.current = {
                x: e.clientX,
                y: e.clientY,
                imgX: localPos.x,
                imgY: localPos.y,
                imgScale: localScale
              };
            }}
          />
        </Html>
      )}
    </group>
  );
}
