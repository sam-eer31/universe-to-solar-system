"use client";

import { useAppStore } from "@/lib/store";
import { useState } from "react";
import { Settings2, X, Plus, Save, Play, Layers } from "lucide-react";
import clsx from "clsx";
import SceneList from "./SceneList";
import PropertiesPanel from "./PropertiesPanel";
import ExportButton from "./ExportButton";

export default function EditorPanel() {
  const { toggleDevMode, universeData } = useAppStore();
  const [isOpen, setIsOpen] = useState(true);

  if (!universeData) return null;

  return (
    <div className="pointer-events-auto absolute right-0 top-0 h-full flex z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-12 top-4 p-2 bg-white/10 backdrop-blur-md rounded-l-md border border-white/20 border-r-0 hover:bg-white/20 transition-colors"
      >
        <Settings2 size={20} className="text-white" />
      </button>

      {/* Panel */}
      <div
        className={clsx(
          "h-full w-80 bg-black/40 backdrop-blur-xl border-l border-white/10 text-white/90 flex flex-col transition-transform duration-500 ease-in-out shadow-2xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-sm font-semibold tracking-widest uppercase flex items-center gap-2">
            <Settings2 size={16} /> Dev Tools
          </h2>
          <button onClick={() => toggleDevMode()} className="text-white/50 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-6 custom-scrollbar">
          
          <div className="flex gap-2">
            <ExportButton />
            <button className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/40 py-2 rounded text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-indigo-500/50 text-indigo-200">
              <Play size={14} /> Preview
            </button>
          </div>

          <SceneList />
          <PropertiesPanel />
          
        </div>
      </div>
    </div>
  );
}
