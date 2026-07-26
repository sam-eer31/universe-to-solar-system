"use client";

import { useAppStore } from "@/lib/store";
import { Html } from "@react-three/drei";
import { useState, useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import clsx from "clsx";

export default function FinalCircleOverlay() {
  const { universeData, setFinalCircle, isDevMode } = useAppStore();
  const { camera } = useThree();
  const circle = universeData?.cameraSettings?.finalCircle;
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0, cx: 0, cy: 0, r: 0 });

  // We need to attach event listeners to window for smooth dragging without losing focus
  useEffect(() => {
    if (!circle) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        
        // Exact pixel to 3D mapping at Z = 0
        const distance = Math.max(0.0001, camera.position.z);
        const fovRad = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180;
        const visibleHeightPhysical = 2 * distance * Math.tan(fovRad / 2);
        
        const unitsPerPixel = visibleHeightPhysical / window.innerHeight;
        
        const newX = startPos.current.cx + dx * unitsPerPixel;
        const newY = startPos.current.cy - dy * unitsPerPixel;
        
        setFinalCircle({ x: newX, y: newY, radius: circle.radius });
      } else if (isResizing) {
        const dx = e.clientX - startPos.current.x;
        
        // Exponential resizing
        const delta = dx * 0.005;
        const newR = Math.max(0.0001, startPos.current.r * Math.exp(delta));
        
        setFinalCircle({ x: circle.x, y: circle.y, radius: newR });
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isResizing, camera, setFinalCircle, circle]);

  const groupRef = useRef<THREE.Group>(null);
  const dragTargetRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!circle) return;

    // Apply Live Drag Cascading
    const liveDrag = useAppStore.getState().liveDrag;
    let currentX = circle.x;
    let currentY = circle.y;
    let currentR = circle.radius;
    
    if (liveDrag && groupRef.current) {
      const offsetX = circle.x - liveDrag.originX;
      const offsetY = circle.y - liveDrag.originY;
      const scaledOffsetX = offsetX * liveDrag.scaleRatio;
      const scaledOffsetY = offsetY * liveDrag.scaleRatio;
      
      currentX = liveDrag.originX + liveDrag.deltaX + scaledOffsetX;
      currentY = liveDrag.originY + liveDrag.deltaY + scaledOffsetY;
      currentR = circle.radius * liveDrag.scaleRatio;
      
      groupRef.current.position.set(currentX, currentY, 0);
      groupRef.current.scale.set(liveDrag.scaleRatio, liveDrag.scaleRatio, 1);
    } else if (groupRef.current) {
      groupRef.current.position.set(circle.x, circle.y, 0);
      groupRef.current.scale.set(1, 1, 1);
    }

    if (dragTargetRef.current) {
      const distance = Math.max(0.0001, camera.position.z);
      const fovRad = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180;
      const visibleHeightPhysical = 2 * distance * Math.tan(fovRad / 2);
      
      const pixelsPerUnit = window.innerHeight / visibleHeightPhysical;
      const sizePx = currentR * 2 * pixelsPerUnit;
      
      dragTargetRef.current.style.width = `${sizePx}px`;
      dragTargetRef.current.style.height = `${sizePx}px`;
    }
  });

  if (!isDevMode || !circle) return null;

  return (
    <group ref={groupRef} position={[circle.x, circle.y, 0]} renderOrder={9999}>
      <mesh>
        <ringGeometry args={[circle.radius - 0.01 * circle.radius, circle.radius, 64]} />
        <meshBasicMaterial color="#ef4444" depthTest={false} depthWrite={false} transparent opacity={0.8} />
      </mesh>
      
      {/* Invisible HTML drag target covering the center */}
      <Html position={[0, 0, 0]} center zIndexRange={[9999, 0]}>
        <div 
          ref={dragTargetRef}
          draggable={false}
          className="rounded-full cursor-move select-none touch-none bg-red-500/5"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            setIsDragging(true);
            startPos.current = { x: e.clientX, y: e.clientY, cx: circle.x, cy: circle.y, r: circle.radius };
          }}
        />
      </Html>

      <Html position={[circle.radius, -circle.radius, 0]} center zIndexRange={[10000, 0]}>
        <div 
          draggable={false}
          className="w-4 h-4 bg-red-500 rounded-sm cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform shadow-[0_0_10px_rgba(239,68,68,0.5)] border-2 border-white select-none touch-none"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            setIsResizing(true);
            startPos.current = { x: e.clientX, y: e.clientY, cx: circle.x, cy: circle.y, r: circle.radius };
          }}
        />
      </Html>
      
      <Html position={[0, circle.radius + 0.1 * circle.radius, 0]} center zIndexRange={[10000, 0]}>
        <div className="px-2 py-1 bg-red-500/90 text-white text-[10px] uppercase tracking-widest font-bold rounded shadow-lg whitespace-nowrap backdrop-blur">
          Final View Target
        </div>
      </Html>
    </group>
  );
}
