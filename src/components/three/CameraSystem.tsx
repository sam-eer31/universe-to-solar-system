"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useAppStore } from "@/lib/store";
import * as THREE from "three";
import { useRef } from "react";
import gsap from "gsap";

interface CameraKeyframe {
  x: number;
  y: number;
  z: number;
}

export default function CameraSystem() {
  const { camera } = useThree();

  const targetPos = useRef(new THREE.Vector3(0, 0, 5));

  useFrame((state, delta) => {
    const { universeData, scrollProgress, isDevMode, focusedPlanet, planetZoom } = useAppStore.getState();

    if (!universeData) return;

    // Yield control to MapControls in Dev Mode
    if (isDevMode) return;

    // Generate Keyframes
    const keyframes: CameraKeyframe[] = [];
    const fov = universeData.cameraSettings?.baseFov || 45;
    const fovRad = (fov * Math.PI) / 180;
    const aspect = state.size.width / state.size.height;

    const finalCircle = universeData.cameraSettings?.finalCircle;

    if (universeData.scenes.length > 0) {
      const firstScene = universeData.scenes[0];
      let visibleHeight = firstScene.scale;
      if (aspect < 1) visibleHeight /= aspect; // Fit width on vertical screens
      const distance = visibleHeight / (2 * Math.tan(fovRad / 2));

      keyframes.push({
        x: firstScene.position.x,
        y: firstScene.position.y,
        z: firstScene.depth + distance
      });
    }

    if (finalCircle) {
      let visibleHeight = 2 * finalCircle.radius;
      if (aspect < 1) visibleHeight /= aspect; // Fit width on vertical screens
      const distance = visibleHeight / (2 * Math.tan(fovRad / 2));

      keyframes.push({
        x: finalCircle.x,
        y: finalCircle.y,
        z: distance // Circle is placed at Z=0 global
      });

      if (universeData.cameraSettings?.hasSolarSystem) {
        // Calculate a mathematically perfect logarithmic midpoint to ensure
        // the camera maintains a completely constant exponential velocity 
        // through the void without any "dead zones" where it feels stuck.
        const offset = 0.500001; // VOID_ASYMPTOTE offset used in interpolation
        const startLog = Math.log(distance + offset);
        const endLog = Math.log(-0.4995 + offset);
        const midLog = (startLog + endLog) / 2;
        const midZ = Math.exp(midLog) - offset;

        // Smooth continuous void transition
        keyframes.push({
          x: finalCircle.x,
          y: finalCircle.y,
          z: midZ
        });

        // Solar System View: Arrive perfectly in front of the sun at -0.495
        keyframes.push({
          x: finalCircle.x,
          y: finalCircle.y,
          z: -0.4995
        });
      }
    }

    if (keyframes.length === 0) {
      keyframes.push({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 5 });
    } else if (keyframes.length === 1) {
      // If only one keyframe exists, just hold it there
      keyframes.push({ ...keyframes[0] });
    }

    // Determine current interpolation segment
    const numSegments = keyframes.length - 1;
    const globalT = scrollProgress * numSegments;
    const segmentIndex = Math.max(0, Math.min(Math.floor(globalT), numSegments - 1));
    const localT = globalT - segmentIndex;

    // Use linear interpolation for the scroll progress.
    const easeT = localT;

    const currentKF = keyframes[segmentIndex];
    const nextKF = keyframes[segmentIndex + 1];

    // Exponential interpolation for Z to maintain constant visual zoom speed at microscopic scales.
    // We dynamically shift the logarithm asymptote to the absolute destination (-0.5) 
    // ensuring one flawless, continuous buttery-smooth exponential curve through the entire void!
    let currentZ;
    if (nextKF.z < 0 || currentKF.z < 0) {
      const VOID_ASYMPTOTE = -0.5;
      const offset = -VOID_ASYMPTOTE + 0.000001;
      currentZ = Math.exp(gsap.utils.interpolate(
        Math.log(currentKF.z + offset),
        Math.log(nextKF.z + offset),
        easeT
      )) - offset;
    } else {
      currentZ = Math.exp(gsap.utils.interpolate(Math.log(currentKF.z), Math.log(nextKF.z), easeT));
    }

    // Screen-space centering interpolation for X and Y
    // This brilliant mathematical formula forces the target to smoothly drift into the exact center of the screen,
    // guaranteeing it never flies off-screen and always lands perfectly dead-center regardless of exponential Z speed.
    const zDiff = currentKF.z - nextKF.z;
    const currentZDiff = currentZ - nextKF.z;

    let currentX, currentY;
    if (Math.abs(zDiff) > 1e-10) {
      currentX = nextKF.x - (nextKF.x - currentKF.x) * (1 - easeT) * (currentZDiff / zDiff);
      currentY = nextKF.y - (nextKF.y - currentKF.y) * (1 - easeT) * (currentZDiff / zDiff);
    } else {
      currentX = gsap.utils.interpolate(currentKF.x, nextKF.x, easeT);
      currentY = gsap.utils.interpolate(currentKF.y, nextKF.y, easeT);
    }

    let finalTargetX = currentX;
    let finalTargetY = currentY;
    let finalTargetZ = currentZ;

    // If focused on a planet, override the target completely!
    if (focusedPlanet && finalCircle) {
      finalTargetX = finalCircle.x;
      finalTargetY = finalCircle.y;
      finalTargetZ = -0.5 + (focusedPlanet.distance * planetZoom);
    }

    targetPos.current.x = finalTargetX;
    targetPos.current.y = finalTargetY;
    targetPos.current.z = finalTargetZ;

    // Smooth camera movement using damping
    camera.position.lerp(targetPos.current, 4 * delta);
  });

  return null;
}
