import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";

export default function ScrollGuide({ progress }: { progress: number }) {
  const focusedPlanet = useAppStore(state => state.focusedPlanet);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (progress > 0.02 || focusedPlanet) {
      setIsVisible(false);
    } else if (progress === 0 && !focusedPlanet) {
      setIsVisible(true);
    }
  }, [progress, focusedPlanet]);

  return (
    <div 
      className={`fixed bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 transition-all duration-1000 z-40 pointer-events-none ${
        isVisible ? "opacity-70 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="relative w-6 h-10 border border-white/50 rounded-full flex justify-center p-1">
        <div className="w-1 h-2 bg-white rounded-full animate-bounce" />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 text-center">
        Scroll / Swipe<br/>to Explore
      </span>
    </div>
  );
}
