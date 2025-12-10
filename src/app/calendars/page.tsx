"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, RefreshCcw } from "lucide-react";

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

export default function CalendarsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarType, setCalendarType] = useState<"earnings" | "dividends" | "economy">("earnings");

  const fetchCalendar = async (type: string) => {
    try {
      setLoading(true);
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
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-yellow-50 pt-28 pb-10 px-6 flex flex-col items-center">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 flex items-center gap-2"
      >
        <Calendar className="text-yellow-400" /> Market Calendars
      </motion.h1>
      <p className="text-gray-600 mb-8 text-center max-w-2xl">
        Track upcoming earnings, dividends, and key economic events — all powered by WallStreetStocks.ai.
      </p>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {["earnings", "dividends", "economy"].map((type) => (
          <button
            key={type}
            onClick={() => {
              setCalendarType(type as any);
              fetchCalendar(type);
            }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              calendarType === type
                ? "bg-yellow-400 text-black shadow-md"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
        <button
          onClick={() => fetchCalendar(calendarType)}
          className="bg-yellow-400 text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-500 shadow-md flex items-center gap-2 transition-all"
        >
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {/* Calendar Data */}
      <div className="w-full max-w-5xl overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-xl bg-white shadow-sm">
          <thead className="bg-yellow-100 text-gray-800 font-semibold text-sm">
            <tr>
              {calendarType === "earnings" && (
                <>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">EPS Est.</th>
                  <th className="p-3 text-left">EPS Actual</th>
                </>
              )}
              {calendarType === "dividends" && (
                <>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-left">Dividend</th>
                </>
              )}
              {calendarType === "economy" && (
                <>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Event</th>
                  <th className="p-3 text-left">Actual</th>
                  <th className="p-3 text-left">Previous</th>
                  <th className="p-3 text-left">Change</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">
                  Fetching calendar data...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">
                  No upcoming events found.
                </td>
              </tr>
            ) : (
              events.map((event, i) => (
                <tr key={i} className="border-t hover:bg-yellow-50 transition">
                  {calendarType === "earnings" && (
                    <>
                      <td className="p-3 text-sm text-gray-700">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-semibold">{event.symbol}</td>
                      <td className="p-3">{event.name}</td>
                      <td className="p-3">{event.epsEstimated ?? "—"}</td>
                      <td className="p-3">{event.eps ?? "—"}</td>
                    </>
                  )}
                  {calendarType === "dividends" && (
                    <>
                      <td className="p-3 text-sm text-gray-700">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-semibold">{event.symbol}</td>
                      <td className="p-3">{event.dividend ?? "—"}</td>
                    </>
                  )}
                  {calendarType === "economy" && (
                    <>
                      <td className="p-3 text-sm text-gray-700">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-semibold">
                        {event.economicEvent ?? "—"}
                      </td>
                      <td className="p-3">{event.actual ?? "—"}</td>
                      <td className="p-3">{event.previous ?? "—"}</td>
                      <td className="p-3">{event.change ?? "—"}</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
