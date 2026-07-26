"use client";
import { useProgress } from "@react-three/drei";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function LoadingScreen({ onStart }: { onStart: () => void }) {
  const { progress, total, active } = useProgress();
  const [fakeProgress, setFakeProgress] = useState(0);
  const [showEnter, setShowEnter] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [fading, setFading] = useState(false);

  // Check if underlying engine is truly loaded
  const isWebsiteLoaded = progress === 100 && total > 0 && !active;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWebsiteLoaded) {
      // If the website is loaded, rapidly animate the fake loader to 100%
      interval = setInterval(() => {
        setFakeProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2; 
        });
      }, 20);
    } else {
      // If still loading, smoothly approach 95%, then hold
      interval = setInterval(() => {
        setFakeProgress(prev => {
          if (prev >= 95) {
            return 95;
          }
          const increment = Math.max(0.05, (95 - prev) * 0.05);
          return Math.min(95, prev + increment);
        });
      }, 30);
    }

    return () => clearInterval(interval);
  }, [isWebsiteLoaded]);

  useEffect(() => {
    // Only show button when the fake loader physically hits 100 after being informed
    if (Math.floor(fakeProgress) === 100) {
      const t = setTimeout(() => setShowEnter(true), 200); 
      return () => clearTimeout(t);
    } else {
      setShowEnter(false);
    }
  }, [fakeProgress]);

  if (hidden) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex flex-col items-center max-w-md w-full px-6 text-center">
        <div className="flex justify-center mb-8">
          <Image 
            src="/logo-main.png" 
            alt="Universe Logo" 
            width={300} 
            height={100} 
            className="w-48 md:w-64 h-auto object-contain"
            priority
          />
        </div>
        
        <div className="w-full h-[2px] bg-white/10 rounded-full mb-6 overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 h-full bg-white" 
            style={{ width: `${fakeProgress}%` }} 
          />
        </div>
        
        <div className="flex justify-between w-full text-xs font-mono text-white/50 tracking-widest uppercase mb-12">
          <span>Loading Assets</span>
          <span>{Math.floor(fakeProgress)}%</span>
        </div>

        <button
          onClick={() => {
            setFading(true);
            onStart();
            setTimeout(() => setHidden(true), 1000);
          }}
          disabled={!showEnter}
          className={`px-10 py-4 border border-white/30 rounded-full uppercase tracking-[0.3em] text-xs font-semibold text-white hover:bg-white hover:text-black transition-all duration-700 transform ${showEnter ? 'translate-y-0 opacity-100 cursor-pointer' : 'translate-y-4 opacity-0 pointer-events-none'}`}
        >
          Begin Journey
        </button>
      </div>
    </div>
  );
}
