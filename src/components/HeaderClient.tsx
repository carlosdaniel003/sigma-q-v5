// 2. src/components/HeaderClient.tsx
"use client";
import React from "react";
import Button from "./Button";

export default function HeaderClient({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  return (
    <header className="flex items-center justify-between p-4 bg-neutral-900 text-white">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-white/5">
          ☰
        </button>
        <div>
          <div className="text-lg font-bold">SIGMA-Q</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => alert("Contato: admin@sigma-q.local")}>Contactar admin</Button>
      </div>
    </header>
  );
}