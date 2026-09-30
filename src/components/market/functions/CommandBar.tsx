"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FUNCTIONS, FnDef, parseCommand } from "./registry";

// Bloomberg-style command line. "/" or "`" focuses it from anywhere,
// Enter = <GO>, ↑/↓ walk suggestions, Esc clears. Keeps a short history.

const HISTORY_KEY = "wss_terminal_cmd_history";

interface Props {
  symbol: string;
  onRun: (symbol: string | undefined, fn: FnDef | undefined) => void;
  onHelp: () => void;
}

const CommandBar: React.FC<Props> = ({ symbol, onRun, onHelp }) => {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  // Enter runs the typed text unless the user arrowed onto a suggestion.
  const [picked, setPicked] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(h)) setHistory(h.slice(0, 8));
    } catch {}
  }, []);

  // Global focus hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (!typing && (e.key === "/" || e.key === "`")) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const suggestions = useMemo(() => {
    const v = value.trim().toUpperCase();
    if (!v) {
      return history.map((h) => ({ kind: "history" as const, text: h, label: h, desc: "Recent" }));
    }
    const tokens = v.split(/\s+/);
    const lastTok = tokens[tokens.length - 1];
    const prefix = tokens.length > 1 ? tokens.slice(0, -1).join(" ") + " " : "";
    const fnMatches = FUNCTIONS.filter(
      (f) =>
        f.code.startsWith(lastTok) ||
        (f.aliases ?? []).some((a) => a.startsWith(lastTok)) ||
        (lastTok.length > 2 && f.name.toUpperCase().includes(lastTok))
    )
      .sort((a, b) => {
        const exact = (f: FnDef) => (f.code === lastTok || (f.aliases ?? []).includes(lastTok) ? 0 : 1);
        return exact(a) - exact(b);
      })
      .slice(0, 7);
    const out: { kind: "fn" | "sec" | "history"; text: string; label: string; desc: string }[] = [];
    if (tokens.length === 1 && /^[A-Z0-9^./-]{1,12}$/.test(lastTok)) {
      out.push({ kind: "sec", text: lastTok, label: lastTok, desc: "Load security" });
    }
    for (const f of fnMatches) {
      out.push({
        kind: "fn",
        text: `${prefix}${f.code}`,
        label: f.code,
        desc: `${f.name}${f.scope === "security" ? ` · ${prefix ? prefix.trim() : symbol.replace("^", "")}` : ""}`,
      });
    }
    return out;
  }, [value, history, symbol]);

  const run = (text: string) => {
    const cmd = parseCommand(text);
    if (cmd.kind === "empty") return;
    if (cmd.kind === "help") onHelp();
    else onRun(cmd.symbol, cmd.fn);
    const clean = text.trim().toUpperCase();
    const next = [clean, ...history.filter((h) => h !== clean)].slice(0, 8);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
    setValue("");
    setPicked(false);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPicked(true);
      setSel((s) => Math.min(s + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPicked(true);
      setSel((s) => Math.max(s - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = picked && sel >= 0 ? suggestions[sel] : undefined;
      run(pick ? pick.text : value);
    } else if (e.key === "Escape") {
      setValue("");
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Tab" && suggestions[Math.max(sel, 0)]) {
      e.preventDefault();
      setValue(suggestions[Math.max(sel, 0)].text + " ");
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center rounded-xl border border-yellow-400/30 bg-black/60 focus-within:border-yellow-400/70 focus-within:shadow-[0_0_0_3px_rgba(255,214,10,0.08)]">
        <span className="pl-3 pr-2 font-mono text-xs font-black text-yellow-400">{symbol.replace("^", "")} &gt;</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSel(0);
            setPicked(false);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          placeholder="Type a command: MSFT HP · WEI · ECO · NVDA COMP · HELP"
          aria-label="Terminal command line"
          className="flex-1 min-w-0 bg-transparent py-2.5 font-mono text-sm uppercase text-yellow-100 placeholder:normal-case placeholder:text-gray-600 focus:outline-none"
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (value.trim() ? run(value) : onHelp())}
          className="m-1 px-3 py-1.5 rounded-lg bg-yellow-400 text-black text-[11px] font-black tracking-wider hover:bg-yellow-300"
        >
          {value.trim() ? "GO" : "HELP"}
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl border border-yellow-500/25 bg-surface shadow-[0_18px_44px_rgba(0,0,0,0.75)] p-1.5">
          {suggestions.map((s, i) => (
            <button
              key={`${s.kind}-${s.text}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(s.text)}
              onMouseEnter={() => setSel(i)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left ${i === sel ? "bg-yellow-400/10" : ""}`}
            >
              <span
                className={`min-w-[52px] text-center px-1.5 py-0.5 rounded font-mono text-[11px] font-black ${
                  s.kind === "fn" ? "bg-yellow-400 text-black" : s.kind === "sec" ? "bg-white/10 text-gray-100" : "text-gray-500 border border-white/10"
                }`}
              >
                {s.kind === "history" ? "↺" : s.label}
              </span>
              <span className="text-xs text-gray-300 truncate">{s.kind === "history" ? s.text : s.desc}</span>
            </button>
          ))}
          <p className="px-2.5 pt-1.5 pb-0.5 text-[10px] text-gray-600 font-mono">↑↓ select · Tab complete · Enter GO · Esc cancel</p>
        </div>
      )}
    </div>
  );
};

export default CommandBar;
