"use client";

import { useAppStore } from "@/lib/store";
import { Save } from "lucide-react";
import { useState } from "react";

export default function ExportButton() {
  const { universeData } = useAppStore();

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!universeData) return;
    setIsSaving(true);
    try {
      await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(universeData)
      });
      // Optional: add a tiny visual feedback here if wanted
    } catch (err) {
      console.error("Failed to save", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button 
      disabled={isSaving}
      onClick={handleSave}
      className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-white/10"
    >
      <Save size={14} /> {isSaving ? "Saving..." : "Save"}
    </button>
  );
}
