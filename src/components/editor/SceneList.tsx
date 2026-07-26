"use client";

import { useAppStore } from "@/lib/store";
import { Layers, Eye, EyeOff, Plus, GripVertical, ImagePlus } from "lucide-react";
import clsx from "clsx";
import { useRef, useState } from "react";
import { SceneLayer } from "@/types/universe";

export default function SceneList() {
  const { universeData, activeSceneId, setActiveSceneId, setUniverseData } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!universeData) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (data.success) {
        const newSceneId = `scene_${Date.now()}`;
        // Keep new scenes on the same base depth plane, or slightly offset by a tiny amount to avoid z-fighting if depthTest was on.
        // But since we will disable depthTest, they can be on the exact same plane!
        const depth = universeData.scenes.length === 0 ? 0 : universeData.scenes[universeData.scenes.length - 1].depth;
        
        const newScene: SceneLayer = {
          id: newSceneId,
          title: file.name.split('.')[0],
          image: data.imageUrl,
          depth: depth,
          scale: 10,
          rotation: 0,
          position: { x: 0, y: 0, z: depth },
          opacity: 1,
          transitionSpeed: 1,
          circles: universeData.scenes.length === 0 ? [{
            id: `circle_${Date.now()}`,
            centerX: 0.5,
            centerY: 0.5,
            radius: 0.1,
            targetSceneId: "none",
            cameraOffset: { x: 0, y: 0, z: 0 },
            transitionDuration: 1,
            zoomMultiplier: 10,
            optionalRotation: 0,
          }] : []
        };

        const updatedData = {
          ...universeData,
          scenes: [...universeData.scenes, newScene]
        };

        setUniverseData(updatedData);
        setActiveSceneId(newSceneId);

        // Auto-save
        await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData)
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest flex items-center gap-1">
          <Layers size={14} /> Scenes Layering
        </h3>
        
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleUpload}
        />
        
        <button 
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="text-white/50 hover:text-white flex items-center gap-1 text-[10px] uppercase border border-white/10 px-2 py-1 rounded"
        >
          {isUploading ? "..." : <><ImagePlus size={12} /> Upload</>}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {[...universeData.scenes].reverse().map((scene) => {
          const isActive = activeSceneId === scene.id;
          return (
            <div
              key={scene.id}
              onClick={() => setActiveSceneId(scene.id)}
              className={clsx(
                "group flex items-center justify-between p-2 rounded text-sm cursor-pointer border transition-colors",
                isActive 
                  ? "bg-white/10 border-white/20 text-white" 
                  : "bg-black/20 border-transparent text-white/70 hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="truncate max-w-[150px]">{scene.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 font-mono text-right w-10 text-nowrap">
                  Z: {scene.depth}
                </span>
                <button className="text-white/30 hover:text-white">
                  {scene.opacity > 0 ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            </div>
          );
        })}
        {universeData.scenes.length === 0 && (
          <div className="text-center p-4 border border-dashed border-white/10 rounded text-xs text-white/30">
            No scenes. Upload an image to start.
          </div>
        )}
      </div>
    </div>
  );
}
