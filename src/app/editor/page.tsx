"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SceneManager = dynamic(() => import("@/components/three/SceneManager"), { ssr: false });
const EditorPanel = dynamic(() => import("@/components/editor/EditorPanel"), { ssr: false });

export default function EditorPage() {
  const { setUniverseData, toggleDevMode } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    useAppStore.setState({ isDevMode: true });

    fetch('/assets/data/universe.json')
      .then(res => res.json())
      .then(data => {
        setUniverseData(data);
      })
      .catch(err => console.error("Failed to load universe data", err));
      
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if they are typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          useAppStore.temporal.getState().undo();
        } else if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) {
          e.preventDefault();
          useAppStore.temporal.getState().redo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      useAppStore.setState({ isDevMode: false });
    };
  }, [setUniverseData]);

  if (!mounted) return null;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black text-white">
      
      <Link href="/" className="absolute top-4 left-4 z-50 flex items-center gap-2 text-white/50 hover:text-white transition-colors bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-xs uppercase tracking-widest border border-white/10">
        <ArrowLeft size={14} /> Back to Site
      </Link>

      <div className="absolute inset-0 w-full h-full pointer-events-auto">
        <SceneManager />
      </div>
      
      <div className="absolute inset-0 z-40 pointer-events-none">
        <EditorPanel />
      </div>

    </main>
  );
}
