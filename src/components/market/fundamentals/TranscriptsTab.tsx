"use client";

// Earnings call transcripts tab — quarter picker, speaker-parsed transcript,
// in-transcript search with highlighting.

import React, { useMemo, useState } from "react";
import {
  useDataset,
  fmtDate,
  SectionCard,
  Skeleton,
  EmptyNote,
} from "./shared";

interface TranscriptMeta {
  quarter: number;
  year: number;
  date: string;
}

interface Transcript {
  quarter: number;
  year: number;
  date: string;
  content: string;
}

interface Turn {
  speaker: string;
  text: string;
}

/** Split raw transcript content into speaker turns. Lines look like
 *  "Tim Cook: Thank you, ..." separated by newlines; continuation lines
 *  without a "Name: " prefix belong to the previous speaker. */
const parseTurns = (content: string): Turn[] => {
  const turns: Turn[] = [];
  const speakerRe = /^([A-Z][A-Za-z.'\- ]{1,48}?):\s+(.*)$/;
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(speakerRe);
    if (m) {
      turns.push({ speaker: m[1].trim(), text: m[2] });
    } else if (turns.length) {
      turns[turns.length - 1].text += `\n${line}`;
    } else {
      turns.push({ speaker: "", text: line });
    }
  }
  return turns;
};

/** Render text with case-insensitive <mark> highlights for the query. */
const Highlighted: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let i = 0;
  let idx = lower.indexOf(ql);
  let k = 0;
  while (idx !== -1 && k < 500) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={k} className="bg-yellow-400/30 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    i = idx + q.length;
    idx = lower.indexOf(ql, i);
    k += 1;
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
};

const TranscriptsTab: React.FC<{ symbol: string; quote?: any }> = ({ symbol }) => {
  const { data: dates, loading: datesLoading } = useDataset<TranscriptMeta[]>(
    symbol,
    "transcript-dates"
  );
  const [picked, setPicked] = useState<{ quarter: number; year: number } | null>(null);
  const [query, setQuery] = useState("");

  const list = useMemo(
    () =>
      (dates ?? []).filter(
        (d) => d && Number.isInteger(d.quarter) && Number.isInteger(d.year)
      ),
    [dates]
  );

  // Default to the most recent call once the list arrives.
  const active = picked ?? (list.length ? { quarter: list[0].quarter, year: list[0].year } : null);

  const { data: transcript, loading: tLoading, error: tError } = useDataset<Transcript>(
    symbol,
    active ? "transcript" : "",
    undefined,
    active ? `quarter=${active.quarter}&year=${active.year}` : undefined
  );

  const turns = useMemo(
    () => (transcript?.content ? parseTurns(transcript.content) : []),
    [transcript]
  );

  // Executives/hosts = speakers before the operator hands over to Q&A.
  // Heuristic: any speaker appearing in the first 4 turns is "company side".
  const companySpeakers = useMemo(() => {
    const s = new Set<string>();
    turns.slice(0, 4).forEach((t) => t.speaker && s.add(t.speaker));
    return s;
  }, [turns]);

  const q = query.trim().toLowerCase();
  const visibleTurns = q
    ? turns.filter(
        (t) =>
          t.text.toLowerCase().includes(q) || t.speaker.toLowerCase().includes(q)
      )
    : turns;

  const headerLabel = active ? `Q${active.quarter} ${active.year}` : "";
  const callDate = transcript?.date ? fmtDate(transcript.date.split(" ")[0]) : "";

  return (
    <SectionCard
      title="Earnings Call Transcripts"
      subtitle={
        transcript
          ? `${headerLabel} earnings call · ${callDate}`
          : "Full transcripts of quarterly earnings calls"
      }
      right={
        list.length > 0 ? (
          <div className="flex items-center gap-1 overflow-x-auto max-w-[420px] p-1 rounded-xl bg-white/[0.04] border border-white/10">
            {list.slice(0, 8).map((d) => {
              const isActive =
                active?.quarter === d.quarter && active?.year === d.year;
              return (
                <button
                  key={`${d.year}-${d.quarter}`}
                  onClick={() => {
                    setPicked({ quarter: d.quarter, year: d.year });
                    setQuery("");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                      : "text-gray-500 hover:text-gray-200 border border-transparent"
                  }`}
                >
                  Q{d.quarter} &apos;{String(d.year).slice(2)}
                </button>
              );
            })}
          </div>
        ) : undefined
      }
    >
      {datesLoading ? (
        <Skeleton rows={10} />
      ) : list.length === 0 ? (
        <EmptyNote text="No earnings call transcripts available for this symbol." />
      ) : (
        <div>
          {/* Search bar */}
          <div className="px-4 md:px-5 py-3 border-b border-white/5 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">
                ⌕
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this transcript…"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-yellow-400/40 transition-colors"
              />
            </div>
            {q && (
              <span className="text-[11px] font-mono text-gray-500 whitespace-nowrap">
                {visibleTurns.length} match{visibleTurns.length === 1 ? "" : "es"}
              </span>
            )}
          </div>

          {/* Transcript body */}
          {tLoading ? (
            <Skeleton rows={12} />
          ) : tError || !transcript?.content ? (
            <EmptyNote text="Transcript unavailable for this quarter." />
          ) : visibleTurns.length === 0 ? (
            <EmptyNote text={`No matches for "${query.trim()}" in this transcript.`} />
          ) : (
            <div className="max-h-[75vh] overflow-y-auto px-4 md:px-5 py-4 space-y-5">
              {visibleTurns.map((t, i) => (
                <div key={i}>
                  {t.speaker && (
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold ${
                          t.speaker === "Operator"
                            ? "text-gray-500"
                            : companySpeakers.has(t.speaker)
                            ? "text-yellow-300"
                            : "text-gray-200"
                        }`}
                      >
                        <Highlighted text={t.speaker} query={query} />
                      </span>
                      {companySpeakers.has(t.speaker) && t.speaker !== "Operator" && (
                        <span className="px-1.5 py-px rounded bg-yellow-400/10 text-yellow-300/80 text-[9px] uppercase tracking-wider">
                          {symbol.replace("^", "")}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    <Highlighted text={t.text} query={query} />
                  </p>
                </div>
              ))}
              <p className="text-center text-[10px] text-gray-600 pt-2 pb-1">
                End of transcript · {headerLabel} · {callDate}
              </p>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
};

export default TranscriptsTab;
