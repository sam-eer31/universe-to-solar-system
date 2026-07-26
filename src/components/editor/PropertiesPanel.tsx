"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { SlidersHorizontal } from "lucide-react";

function Slider({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void }) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      <div className="flex justify-between text-[11px] text-white/60 font-mono">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  );
}

export default function PropertiesPanel() {
  const { universeData, activeSceneId, updateScene, selectedCircleId, updateCircle } = useAppStore();

  if (!universeData || !activeSceneId) return null;

  const activeScene = universeData.scenes.find(s => s.id === activeSceneId);
  if (!activeScene) return null;

  const selectedCircle = selectedCircleId ? activeScene.circles?.find(c => c.id === selectedCircleId) : null;

  return (
    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest flex items-center gap-1">
          <SlidersHorizontal size={14} /> Transform
        </h3>
      </div>

      <Slider 
        label="Opacity" 
        value={activeScene.opacity} 
        min={0} max={1} step={0.01} 
        onChange={(val) => updateScene(activeSceneId, { opacity: val })} 
      />
      <Slider 
        label="Feather Edge" 
        value={activeScene.feathering || 0} 
        min={0} max={1} step={0.01} 
        onChange={(val) => updateScene(activeSceneId, { feathering: val })} 
      />
      <Slider 
        label="Scale" 
        value={activeScene.scale} 
        min={0.1} max={100} step={0.1} 
        onChange={(val) => updateScene(activeSceneId, { scale: val })} 
      />
      <Slider 
        label="Z Depth" 
        value={activeScene.depth} 
        min={-1000} max={10} step={1} 
        onChange={(val) => updateScene(activeSceneId, { depth: val, position: { ...activeScene.position, z: val } })} 
      />
      
      <div className="grid grid-cols-2 gap-2">
        <Slider 
          label="Pos X" 
          value={activeScene.position.x} 
          min={-50} max={50} step={0.1} 
          onChange={(val) => updateScene(activeSceneId, { position: { ...activeScene.position, x: val } })} 
        />
        <Slider 
          label="Pos Y" 
          value={activeScene.position.y} 
          min={-50} max={50} step={0.1} 
          onChange={(val) => updateScene(activeSceneId, { position: { ...activeScene.position, y: val } })} 
        />
      </div>

      <Slider 
        label="Rotation" 
        value={activeScene.rotation} 
        min={-Math.PI} max={Math.PI} step={0.01} 
        onChange={(val) => updateScene(activeSceneId, { rotation: val })} 
      />

      <div className="mt-4 pt-4 border-t border-white/10">
        {!universeData.cameraSettings.finalCircle ? (
          <button 
            onClick={() => {
              useAppStore.getState().setFinalCircle({ x: 0, y: 0, radius: 2 });
            }}
            className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-500/50 rounded text-xs uppercase tracking-widest font-medium transition-colors mb-4"
          >
            + Add Final View Circle
          </button>
        ) : (
          <button 
            onClick={() => {
              useAppStore.getState().removeFinalCircle();
            }}
            className="w-full py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 rounded text-xs uppercase tracking-widest font-medium transition-colors mb-4"
          >
            - Remove Final View Circle
          </button>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-white/10">
        <button 
          onClick={() => {
            if (confirm("Are you sure you want to delete this scene?")) {
              const state = useAppStore.getState();
              state.deleteScene(activeSceneId);
              // Auto-save after delete
              setTimeout(() => {
                fetch("/api/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(useAppStore.getState().universeData)
                });
              }, 100);
            }
          }}
          className="w-full py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 rounded text-[10px] uppercase tracking-widest font-medium transition-colors"
        >
          Delete Entire Scene
        </button>
      </div>
    </div>
  );
}
