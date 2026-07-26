import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";

export default function ScrollGuide({ progress }: { progress: number }) {
  const focusedPlanet = useAppStore(state => state.focusedPlanet);
  const [isVisible, setIsVisible] = useState(true);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    if (progress > 0.02 || focusedPlanet) {
      setIsVisible(false);
    } else if (progress === 0 && !focusedPlanet) {
      setIsVisible(true);
    }
  }, [progress, focusedPlanet]);

  return (
    <div 
      className={`fixed bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 transition-all duration-1000 z-40 pointer-events-none ${
        isVisible ? "opacity-70 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {!isTouch ? (
        <>
          <div className="relative w-6 h-10 border border-white/50 rounded-full flex justify-center overflow-hidden">
            <div className="w-1 h-2 bg-white rounded-full mt-2" style={{ animation: 'wheel-up 1.5s infinite ease-in-out' }} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 text-center">
            Scroll Up<br/>to Explore
          </span>
        </>
      ) : (
        <>
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute w-2.5 h-2.5 bg-white/80 rounded-full" style={{ animation: 'pinch-top 2s infinite ease-in-out' }} />
            <div className="absolute w-2.5 h-2.5 bg-white/80 rounded-full" style={{ animation: 'pinch-bottom 2s infinite ease-in-out' }} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 text-center">
            Pinch Outward<br/>to Explore
          </span>
        </>
      )}
    </div>
  );
}
