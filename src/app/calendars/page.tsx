"use client";

import React, { useEffect, useState } from "react";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

interface CalendarEvent {
  date: string;
  symbol?: string;
  name?: string;
  eps?: number;
  epsEstimated?: number;
  dividend?: number;
  economicEvent?: string;
  change?: string;
  actual?: string;
  previous?: string;
}

type CalendarType = "earnings" | "dividends" | "economy";
const TYPES: CalendarType[] = ["earnings", "dividends", "economy"];

// The earnings feed alone returns ~25k rows; render them in pages so the table stays usable.
const PAGE_SIZE = 100;

const th = "px-4 py-3 text-left font-monodata text-[11px] uppercase tracking-widest text-gray-500 font-medium whitespace-nowrap";
const thNum = `${th} text-right`;
const td = "px-4 py-3 text-sm text-gray-300 align-top";
const tdMono = `${td} font-monodata tabular-nums whitespace-nowrap`;
const tdNum = `${tdMono} text-right`;

const pillClass = (active: boolean) =>
  `px-3.5 py-1.5 rounded-md font-monodata text-[11px] uppercase tracking-wider border transition-colors ${
    active
      ? "bg-gold/10 text-gold border-gold/30"
      : "text-gray-500 hover:text-gray-200 border-transparent"
  }`;

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function CalendarsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarType, setCalendarType] = useState<CalendarType>("earnings");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const fetchCalendar = async (type: string) => {
    try {
      setLoading(true);
      setLimit(PAGE_SIZE);
      const res = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const { data } = await res.json();
      setEvents(data || []);
    } catch (err) {
      console.error("Error fetching calendar:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar(calendarType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colCount = calendarType === "dividends" ? 3 : 5;
  const visible = events.slice(0, limit);
  const remaining = events.length - visible.length;

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="CAL" note="earnings, dividends, economic events" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
            Market <em className="italic text-gold-soft">calendar</em>.
          </h1>
          <p className="mt-5 text-lg text-gray-300 max-w-2xl">
            Upcoming earnings, dividend dates, and the economic prints that move
            the tape, in one table.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={calendarType === type}
                  onClick={() => {
                    setCalendarType(type);
                    fetchCalendar(type);
                  }}
                  className={pillClass(calendarType === type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              {!loading && (
                <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  {events.length} events
                </span>
              )}
              <button
                type="button"
                onClick={() => fetchCalendar(calendarType)}
                disabled={loading}
                className="btn-ghost-gold px-4 py-2 text-sm disabled:opacity-60 disabled:pointer-events-none"
              >
                Refresh
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="mt-6">
          <div className="card-night overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white/[0.02]">
                  <tr>
                    {calendarType === "earnings" && (
                      <>
                        <th className={th}>Date</th>
                        <th className={th}>Symbol</th>
                        <th className={th}>Name</th>
                        <th className={thNum}>EPS est.</th>
                        <th className={thNum}>EPS actual</th>
                      </>
                    )}
                    {calendarType === "dividends" && (
                      <>
                        <th className={th}>Date</th>
                        <th className={th}>Symbol</th>
                        <th className={thNum}>Dividend</th>
                      </>
                    )}
                    {calendarType === "economy" && (
                      <>
                        <th className={th}>Date</th>
                        <th className={th}>Event</th>
                        <th className={thNum}>Actual</th>
                        <th className={thNum}>Previous</th>
                        <th className={thNum}>Change</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="border-t border-white/5">
                      <td colSpan={colCount} className="px-4 py-10 text-center text-sm text-gray-500">
                        Fetching calendar data.
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr className="border-t border-white/5">
                      <td colSpan={colCount} className="px-4 py-10 text-center text-sm text-gray-500">
                        No upcoming events found.
                      </td>
                    </tr>
                  ) : (
                    visible.map((event, i) => (
                      <tr
                        key={i}
                        className="border-t border-white/5 hover:bg-white/[0.03] transition-colors"
                      >
                        {calendarType === "earnings" && (
                          <>
                            <td className={`${tdMono} text-gray-400`}>{formatDate(event.date)}</td>
                            <td className={`${tdMono} font-semibold text-ivory`}>{event.symbol}</td>
                            <td className={td}>{event.name ?? "—"}</td>
                            <td className={tdNum}>{event.epsEstimated ?? "—"}</td>
                            <td className={tdNum}>{event.eps ?? "—"}</td>
                          </>
                        )}
                        {calendarType === "dividends" && (
                          <>
                            <td className={`${tdMono} text-gray-400`}>{formatDate(event.date)}</td>
                            <td className={`${tdMono} font-semibold text-ivory`}>{event.symbol}</td>
                            <td className={tdNum}>{event.dividend ?? "—"}</td>
                          </>
                        )}
                        {calendarType === "economy" && (
                          <>
                            <td className={`${tdMono} text-gray-400`}>{formatDate(event.date)}</td>
                            <td className={`${td} font-medium text-ivory`}>
                              {event.economicEvent ?? "—"}
                            </td>
                            <td className={tdNum}>{event.actual ?? "—"}</td>
                            <td className={tdNum}>{event.previous ?? "—"}</td>
                            <td className={tdNum}>{event.change ?? "—"}</td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && remaining > 0 && (
              <div className="flex items-center justify-between gap-4 border-t border-white/10 bg-white/[0.02] px-4 py-3">
                <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  Showing {visible.length.toLocaleString()} of {events.length.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  className="btn-ghost-gold px-4 py-2 text-sm"
                >
                  Show {Math.min(PAGE_SIZE, remaining)} more
                </button>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </main>
  );
}
