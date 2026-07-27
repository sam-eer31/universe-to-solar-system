import { useAppStore } from "@/lib/store";
import { useEffect, useState, useRef } from "react";
import { Move } from "lucide-react";

export default function RotateGuide({ progress }: { progress: number }) {
  const focusedPlanet = useAppStore(state => state.focusedPlanet);
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    // Show when the whole solar system model has zoomed enough to cover ~70% of horizontal view
    if (progress >= 0.70 && !hasShown && !focusedPlanet) {
      setIsVisible(true);
      setHasShown(true);
      
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    }
  }, [progress, hasShown, focusedPlanet]);

  useEffect(() => {
    if (focusedPlanet) {
      setIsVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [focusedPlanet]);

  return (
    <div 
      className={`fixed bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 transition-all duration-1000 z-40 pointer-events-none ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="relative w-12 h-12 flex items-center justify-center">
        <Move 
          className="w-6 h-6 text-white/80" 
          strokeWidth={1.5}
          style={{ animation: 'move-all-dir 3s ease-in-out infinite' }}
        />
      </div>

      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 text-center -mt-2">
        {!isTouch ? (
          <>Drag to<br/>Rotate</>
        ) : (
          <>Swipe to<br/>Rotate</>
        )}
      </span>
    </div>
  );
}
