"use client";

import React, { useEffect } from "react";
import { FUNCTIONS, FnDef } from "./registry";

// Function directory (HELP / MENU).

const HelpOverlay: React.FC<{ onClose: () => void; onPick: (fn: FnDef) => void }> = ({ onClose, onPick }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const section = (scope: "security" | "market", title: string) => (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300 mb-2">{title}</p>
      <div className="grid gap-1">
        {FUNCTIONS.filter((f) => f.scope === scope).map((f) => (
          <button key={f.code} onClick={() => onPick(f)} className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.05] text-left">
            <span className="min-w-[54px] text-center px-1.5 py-0.5 rounded bg-yellow-400 text-black font-mono text-[11px] font-black">{f.code}</span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-gray-100">
                {f.name}
                {f.aliases?.length ? <span className="ml-2 font-mono font-normal text-[10px] text-gray-600">{f.aliases.slice(0, 3).join(" · ")}</span> : null}
              </span>
              <span className="block text-[11px] text-gray-500">{f.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="w-full max-w-4xl mt-10 rounded-2xl border border-yellow-500/25 bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Terminal functions"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="text-base font-black text-gray-100">Terminal Functions</h2>
            <p className="text-[11px] text-gray-500">
              Type <span className="font-mono text-yellow-300">&lt;TICKER&gt; &lt;FUNC&gt;</span> then Enter — e.g.{" "}
              <span className="font-mono text-yellow-300">AAPL FA</span>, <span className="font-mono text-yellow-300">TSLA COMP</span>,{" "}
              <span className="font-mono text-yellow-300">WEI</span>
            </p>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-yellow-300 text-xs">
            Esc
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 p-5">
          {section("security", "Security functions")}
          {section("market", "Market functions")}
        </div>
        <div className="px-5 py-3 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-gray-500 font-mono">
          <span><span className="text-yellow-300">/</span> or <span className="text-yellow-300">`</span> focus command line</span>
          <span><span className="text-yellow-300">Alt+←/→</span> previous / next function</span>
          <span><span className="text-yellow-300">?</span> this directory</span>
          <span><span className="text-yellow-300">Esc</span> close</span>
        </div>
      </div>
    </div>
  );
};

export default HelpOverlay;
