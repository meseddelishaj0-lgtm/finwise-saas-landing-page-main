"use client";

// One place that turns a function code into its panel. Used by the terminal's
// primary workspace, its extra panes, and pop-out windows.

import React from "react";
import type { Quote } from "@/components/market/useQuotes";
import TerminalChart from "@/components/market/TerminalChart";
import FinancialsTab from "@/components/market/fundamentals/FinancialsTab";
import AnalystsTab from "@/components/market/fundamentals/AnalystsTab";
import OwnershipTab from "@/components/market/fundamentals/OwnershipTab";
import EarningsTab from "@/components/market/fundamentals/EarningsTab";
import TranscriptsTab from "@/components/market/fundamentals/TranscriptsTab";
import ProfileTab from "@/components/market/fundamentals/ProfileTab";
import { FUNCTIONS } from "./registry";
import { FnPanel } from "./ui";
import HistoricalPrices from "./HistoricalPrices";
import CompareChart from "./CompareChart";
import Technicals from "./Technicals";
import RelativeValue from "./RelativeValue";
import NewsPanel from "./NewsPanel";
import FxMatrix from "./FxMatrix";
import YieldCurve from "./YieldCurve";
import { WorldIndices, FuturesBoard, MostActive, SectorBoard } from "./MarketBoards";
import { EcoCalendar, EarningsCalendar, IpoCalendar } from "./Calendars";
import GlobePanel from "./GlobePanel";
import { CryptoBoard, EconStats, InsiderFlow, CotBoard } from "./DeskBoards";
import { Seasonality, Launchpad } from "./Workbench";
import { Portfolio } from "./PortfolioPanel";
import { AskPanel, EtfPanel, FilingsPanel, DividendCalendar, SplitCalendar, DealsBoard, AlertsPanel } from "./Intel";

/** Codes that render as a panel. GP is the chart; href functions navigate away. */
export const PANEL_CODES = FUNCTIONS.filter((f) => f.code !== "GP" && !f.href).map((f) => f.code);

export interface PanelCtx {
  symbol: string;
  quote?: Quote;
  /** Load a security (keeps the current function where it applies). */
  go: (s: string) => void;
  /** Run a function, optionally on another security. */
  run: (symbol: string | undefined, fn: string) => void;
  /** A question handed over from the command line. */
  ask?: { q: string; nonce: number } | null;
}

export function renderPanel(code: string, { symbol, quote, go, run, ask }: PanelCtx): React.ReactNode {
  switch (code) {
    case "GP":
      return (
        <FnPanel code="GP" title={`Price Graph — ${symbol.replace("^", "")}`} subtitle={quote?.name}>
          <TerminalChart symbol={symbol} prevClose={quote?.previousClose} height={420} />
        </FnPanel>
      );
    case "DES": return <ProfileTab symbol={symbol} quote={quote} />;
    case "FA": return <FinancialsTab symbol={symbol} quote={quote} />;
    case "ANR": return <AnalystsTab symbol={symbol} quote={quote} />;
    case "HDS": return <OwnershipTab symbol={symbol} quote={quote} />;
    case "ERN": return <EarningsTab symbol={symbol} quote={quote} />;
    case "TRAN": return <TranscriptsTab symbol={symbol} quote={quote} />;
    case "RV": return <RelativeValue symbol={symbol} onSelect={go} />;
    case "HP": return <HistoricalPrices symbol={symbol} />;
    case "COMP": return <CompareChart symbol={symbol} onSelect={go} />;
    case "TECH": return <Technicals symbol={symbol} />;
    case "SEAG": return <Seasonality symbol={symbol} />;
    case "ETF": return <EtfPanel symbol={symbol} onSelect={go} />;
    case "FIL": return <FilingsPanel symbol={symbol} onRun={run} />;
    case "CN": return <NewsPanel symbol={symbol} onSelect={go} />;
    case "ASK": return <AskPanel symbol={symbol} onRun={run} pending={ask} />;
    case "GLOBE": return <GlobePanel onSelect={go} />;
    case "WEI": return <WorldIndices onSelect={go} />;
    case "MOST": return <MostActive onSelect={go} />;
    case "IMAP": return <SectorBoard onSelect={go} />;
    case "FXC": return <FxMatrix onSelect={go} />;
    case "CMDTY": return <FuturesBoard onSelect={go} />;
    case "COT": return <CotBoard />;
    case "CRYP": return <CryptoBoard onSelect={go} />;
    case "GC": return <YieldCurve />;
    case "ECST": return <EconStats />;
    case "ECO": return <EcoCalendar />;
    case "EVTS": return <EarningsCalendar onSelect={go} />;
    case "DVDC": return <DividendCalendar onSelect={go} />;
    case "SPLT": return <SplitCalendar onSelect={go} />;
    case "IPO": return <IpoCalendar onSelect={go} />;
    case "MNA": return <DealsBoard onSelect={go} />;
    case "INSD": return <InsiderFlow onSelect={go} />;
    case "LPAD": return <Launchpad onSelect={go} />;
    case "PORT": return <Portfolio symbol={symbol} onSelect={go} />;
    case "ALRT": return <AlertsPanel symbol={symbol} price={quote?.price} onSelect={go} />;
    case "TOP": return <NewsPanel onSelect={go} />;
    default: return null;
  }
}
