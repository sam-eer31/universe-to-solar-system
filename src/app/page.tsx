"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";
import { Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";
import ScrollGuide from "@/components/ScrollGuide";

const SceneManager = dynamic(() => import("@/components/three/SceneManager"), { ssr: false });

export default function Home() {
  const { setUniverseData, setScrollProgress, universeData, focusedPlanet } = useAppStore();
  const lenisRef = useRef<Lenis | null>(null);
  const [mounted, setMounted] = useState(false);
  const [started, setStarted] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);

  useEffect(() => {
    setMounted(true);

    // Default to false so landing page ignores dev mode checks for clicks
    useAppStore.setState({ isDevMode: false });

    fetch('/assets/data/universe.json')
      .then(res => res.json())
      .then(data => {
        setUniverseData(data);
      })
      .catch(err => console.error("Failed to load universe data", err));
  }, [setUniverseData]);

  useEffect(() => {
    if (!mounted || !universeData || universeData.scenes.length === 0) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: -1, // Inverts the mouse wheel direction for the entire website
    });
    lenisRef.current = lenis;
    lenis.stop(); // Stop scroll until user starts

    function raf(time: number) {
      if (lenisRef.current) {
        const lenis = lenisRef.current as any;
        
        const effA = 1/3 - 0.05;
        const effB = 1/3;
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const startZone = effA * maxScroll;
        const endZone = effB * maxScroll;
        
        // --- THE PERFECT SLOWMO BRICK WALL ---
        // If they flick hard into the zone from above, stop them at the entrance.
        if (lenis.animatedScroll <= startZone && lenis.targetScroll > startZone) {
           lenis.targetScroll = startZone + 1;
        } 
        // If they flick hard into the zone from below, stop them at the exit.
        else if (lenis.animatedScroll >= endZone && lenis.targetScroll < endZone) {
           lenis.targetScroll = endZone - 1;
        }
        // If they are currently inside the zone, severely cap how far their target can lead ahead.
        // This makes it physically impossible to scroll fast through this area, no matter the hardware!
        else if (lenis.animatedScroll > startZone && lenis.animatedScroll < endZone) {
           const maxLead = 4; // 4px max target lead per frame = extremely slow!
           if (lenis.targetScroll > lenis.animatedScroll + maxLead) {
              lenis.targetScroll = lenis.animatedScroll + maxLead;
           } else if (lenis.targetScroll < lenis.animatedScroll - maxLead) {
              lenis.targetScroll = lenis.animatedScroll - maxLead;
           }
        }

        lenis.raf(time);
      }
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    lenis.on('scroll', (e: any) => {
      setScrollProgress(e.progress);
      setLocalProgress(e.progress);
    });

    return () => {
      lenis.destroy();
    };
  }, [mounted, universeData, setScrollProgress]);



  useEffect(() => {
    if (lenisRef.current) {
      if (started && !focusedPlanet) {
        lenisRef.current.start();
      } else {
        lenisRef.current.stop();
      }
    }
  }, [started, focusedPlanet]);

  // Handle pinch to zoom/scroll on mobile
  useEffect(() => {
    let initialPinchDistance = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Prevent native browser zoom/scroll
        
        const currentPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        
        const distanceDelta = currentPinchDistance - initialPinchDistance;
        initialPinchDistance = currentPinchDistance;
        
        const { focusedPlanet, planetZoom } = useAppStore.getState();
        
        if (focusedPlanet) {
          // Pinch expanding -> zoom in (smaller multiplier)
          const zoomDelta = -distanceDelta * 0.005;
          let newZoom = planetZoom + zoomDelta;
          
          if (newZoom > 1.05) {
            useAppStore.getState().setFocusedPlanet(null);
            useAppStore.getState().setPlanetZoom(1.0);
          } else {
            newZoom = Math.max(0.1, newZoom);
            useAppStore.getState().setPlanetZoom(newZoom);
          }
        } else {
          // Pinch expanding -> scroll down (progress timeline)
          if (lenisRef.current) {
            const scrollDelta = distanceDelta * 4.0; 
            
            // --- PERFECT SLOWMO BRICK WALL (MOBILE PINCH) ---
            const effA = 1/3 - 0.05;
            const effB = 1/3;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            const startZone = effA * maxScroll;
            const endZone = effB * maxScroll;
            
            let targetScroll = window.scrollY + scrollDelta;
            
            if (window.scrollY <= startZone && targetScroll > startZone) {
               targetScroll = startZone + 1;
            } else if (window.scrollY >= endZone && targetScroll < endZone) {
               targetScroll = endZone - 1;
            } else if (window.scrollY > startZone && window.scrollY < endZone) {
               const maxDelta = 4; // VERY slow pinch
               if (targetScroll > window.scrollY + maxDelta) targetScroll = window.scrollY + maxDelta;
               if (targetScroll < window.scrollY - maxDelta) targetScroll = window.scrollY - maxDelta;
            }
            
            window.scrollTo(0, targetScroll);
          }
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  if (!mounted || !universeData) return null;

  const hasScenes = universeData.scenes.length > 0;
  const hasSolarSystem = universeData.cameraSettings?.hasSolarSystem;

  const scrollHeight = hasScenes
    ? (hasSolarSystem ? "1000svh" : "1000svh")
    : "100svh";

  return (
    <main className="relative w-full text-white bg-black" style={{ height: scrollHeight }}>
      {hasScenes && <LoadingScreen onStart={() => setStarted(true)} />}

      {!hasScenes && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
          <h1 className="text-4xl md:text-7xl font-light tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            Project Infinity
          </h1>
          <p className="text-white/50 font-mono text-sm mb-12 max-w-lg">
            A cinematic, scroll-based experience. The universe is currently empty.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <Link href="/editor" className="pointer-events-auto px-6 py-3 border border-white/20 hover:bg-white/10 rounded-full text-sm font-medium tracking-widest uppercase transition-colors">
              Enter Editor
            </Link>
          )}
        </div>
      )}

      {hasScenes && started && (
        <ScrollGuide progress={localProgress} />
      )}

      {/* Render canvas full screen */}
      <div className="fixed inset-0 w-full h-full pointer-events-none">
        {hasScenes ? (
          <SceneManager />
        ) : (
          <Canvas camera={{ position: [0, 0, 5], fov: 45, near: 0.0000001, far: 1000000000 }}>
            <color attach="background" args={['#020202']} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          </Canvas>
        )}
      </div>



    </main>
  );
}
