"use client";

// Financial Statements tab — Income / Balance / Cash Flow, annual + quarterly,
// wide period-by-period table with sticky labels, sparkbar trends and YoY delta.

import React, { useState } from "react";
import {
  useDataset,
  fmtMoney,
  fmtCount,
  fmtNum,
  fmtPct,
  fmtDateShort,
  periodLabel,
  signClass,
  SectionCard,
  DeltaPill,
  Skeleton,
  EmptyNote,
  Sparkbars,
  SegmentedControl,
} from "./shared";

/* ------------------------------ row config ----------------------------- */

type StatementKey = "income" | "balance" | "cashflow";
type PeriodKey = "annual" | "quarter";

type RowKind = "money" | "pct" | "eps" | "shares";

type RowDef =
  | { section: string }
  | {
      label: string;
      key: string;
      kind: RowKind;
      /** color negatives red / positives normal (natural-sign rows only) */
      signed?: boolean;
      indent?: boolean;
      bold?: boolean;
    };

const INCOME_ROWS: RowDef[] = [
  { section: "Revenue" },
  { label: "Revenue", key: "revenue", kind: "money", bold: true },
  { label: "Cost of Revenue", key: "costOfRevenue", kind: "money", indent: true },
  { label: "Gross Profit", key: "grossProfit", kind: "money", signed: true, bold: true },
  { label: "Gross Margin", key: "grossProfitRatio", kind: "pct", indent: true },
  { section: "Operating Expenses" },
  { label: "R&D Expenses", key: "researchAndDevelopmentExpenses", kind: "money", indent: true },
  { label: "SG&A Expenses", key: "sellingGeneralAndAdministrativeExpenses", kind: "money", indent: true },
  { label: "Total Operating Expenses", key: "operatingExpenses", kind: "money" },
  { section: "Profitability" },
  { label: "Operating Income", key: "operatingIncome", kind: "money", signed: true, bold: true },
  { label: "Operating Margin", key: "operatingIncomeRatio", kind: "pct", indent: true },
  { label: "Pre-Tax Income", key: "incomeBeforeTax", kind: "money", signed: true },
  { label: "Income Tax Expense", key: "incomeTaxExpense", kind: "money", indent: true },
  { label: "Net Income", key: "netIncome", kind: "money", signed: true, bold: true },
  { label: "Net Margin", key: "netIncomeRatio", kind: "pct", indent: true },
  { label: "EBITDA", key: "ebitda", kind: "money", signed: true },
  { section: "Per Share" },
  { label: "EPS (Basic)", key: "eps", kind: "eps" },
  { label: "EPS (Diluted)", key: "epsdiluted", kind: "eps" },
  { label: "Diluted Shares Out.", key: "weightedAverageShsOutDil", kind: "shares" },
];

const BALANCE_ROWS: RowDef[] = [
  { section: "Assets" },
  { label: "Cash & Equivalents", key: "cashAndCashEquivalents", kind: "money", indent: true },
  { label: "Short-Term Investments", key: "shortTermInvestments", kind: "money", indent: true },
  { label: "Net Receivables", key: "netReceivables", kind: "money", indent: true },
  { label: "Inventory", key: "inventory", kind: "money", indent: true },
  { label: "Total Current Assets", key: "totalCurrentAssets", kind: "money", bold: true },
  { label: "PP&E (Net)", key: "propertyPlantEquipmentNet", kind: "money", indent: true },
  { label: "Long-Term Investments", key: "longTermInvestments", kind: "money", indent: true },
  { label: "Goodwill", key: "goodwill", kind: "money", indent: true },
  { label: "Intangible Assets", key: "intangibleAssets", kind: "money", indent: true },
  { label: "Total Assets", key: "totalAssets", kind: "money", bold: true },
  { section: "Liabilities" },
  { label: "Accounts Payable", key: "accountPayables", kind: "money", indent: true },
  { label: "Short-Term Debt", key: "shortTermDebt", kind: "money", indent: true },
  { label: "Total Current Liabilities", key: "totalCurrentLiabilities", kind: "money", bold: true },
  { label: "Long-Term Debt", key: "longTermDebt", kind: "money", indent: true },
  { label: "Total Liabilities", key: "totalLiabilities", kind: "money", bold: true },
  { section: "Equity & Debt" },
  { label: "Shareholders' Equity", key: "totalStockholdersEquity", kind: "money", signed: true, bold: true },
  { label: "Total Debt", key: "totalDebt", kind: "money" },
  { label: "Net Debt", key: "netDebt", kind: "money" },
];

const CASHFLOW_ROWS: RowDef[] = [
  { section: "Operating Activities" },
  { label: "Net Income", key: "netIncome", kind: "money", signed: true },
  { label: "Depreciation & Amortization", key: "depreciationAndAmortization", kind: "money", indent: true },
  { label: "Stock-Based Compensation", key: "stockBasedCompensation", kind: "money", indent: true },
  { label: "Change in Working Capital", key: "changeInWorkingCapital", kind: "money", signed: true, indent: true },
  { label: "Operating Cash Flow", key: "netCashProvidedByOperatingActivities", kind: "money", signed: true, bold: true },
  { section: "Investing Activities" },
  { label: "Capital Expenditure", key: "capitalExpenditure", kind: "money", signed: true, indent: true },
  { label: "Acquisitions (Net)", key: "acquisitionsNet", kind: "money", signed: true, indent: true },
  { label: "Investing Cash Flow", key: "netCashUsedForInvestingActivites", kind: "money", signed: true, bold: true },
  { section: "Financing Activities" },
  { label: "Debt Repayment", key: "debtRepayment", kind: "money", signed: true, indent: true },
  { label: "Share Buybacks", key: "commonStockRepurchased", kind: "money", signed: true, indent: true },
  { label: "Dividends Paid", key: "dividendsPaid", kind: "money", signed: true, indent: true },
  { label: "Financing Cash Flow", key: "netCashUsedProvidedByFinancingActivities", kind: "money", signed: true, bold: true },
  { section: "Summary" },
  { label: "Free Cash Flow", key: "freeCashFlow", kind: "money", signed: true, bold: true },
  { label: "Cash at End of Period", key: "cashAtEndOfPeriod", kind: "money" },
];

const ROWS_BY_STATEMENT: Record<StatementKey, RowDef[]> = {
  income: INCOME_ROWS,
  balance: BALANCE_ROWS,
  cashflow: CASHFLOW_ROWS,
};

const STATEMENT_LABEL: Record<StatementKey, string> = {
  income: "Income Statement",
  balance: "Balance Sheet",
  cashflow: "Cash Flow",
};

/* ------------------------------ helpers -------------------------------- */

const isNum = (v: any): v is number => typeof v === "number" && isFinite(v);

function formatCell(v: any, kind: RowKind): string {
  switch (kind) {
    case "money":
      return fmtMoney(isNum(v) ? v : null);
    case "pct":
      return fmtPct(isNum(v) ? v : null);
    case "eps":
      return fmtNum(isNum(v) ? v : null);
    case "shares":
      return fmtCount(isNum(v) ? v : null);
  }
}

function cellClass(v: any, kind: RowKind, signed?: boolean): string {
  if (kind === "pct") return "text-gray-400";
  if (kind === "money" && signed) return signClass(isNum(v) ? v : null);
  return "text-gray-100";
}

/** % change of newest vs comparison period (quarterly: same quarter prior year). */
function yoyChange(values: (number | null)[], period: PeriodKey): number | null {
  // values are oldest → newest
  const n = values.length;
  if (n < 2) return null;
  const newest = values[n - 1];
  if (!isNum(newest)) return null;
  let prev: number | null = null;
  if (period === "quarter" && n >= 5 && isNum(values[n - 5])) {
    prev = values[n - 5];
  } else {
    prev = values[n - 2];
  }
  if (!isNum(prev) || prev === 0) return null;
  return (newest - prev) / Math.abs(prev);
}

/* ------------------------------ component ------------------------------ */

const FinancialsTab: React.FC<{ symbol: string; quote?: any }> = ({ symbol }) => {
  const [statement, setStatement] = useState<StatementKey>("income");
  const [period, setPeriod] = useState<PeriodKey>("annual");

  const { data, loading } = useDataset<any[]>(symbol, statement, period);

  const maxCols = period === "annual" ? 6 : 8;
  // API arrays are newest-first — take most recent N, then reverse a copy.
  const cols = (Array.isArray(data) ? data : []).slice(0, maxCols).slice().reverse();
  const rows = ROWS_BY_STATEMENT[statement];

  const controls = (
    <div className="flex gap-2 flex-wrap justify-end">
      <SegmentedControl
        options={[
          { key: "income", label: "Income Statement" },
          { key: "balance", label: "Balance Sheet" },
          { key: "cashflow", label: "Cash Flow" },
        ]}
        value={statement}
        onChange={(k) => setStatement(k as StatementKey)}
      />
      <SegmentedControl
        options={[
          { key: "annual", label: "Annual" },
          { key: "quarter", label: "Quarterly" },
        ]}
        value={period}
        onChange={(k) => setPeriod(k as PeriodKey)}
      />
    </div>
  );

  return (
    <SectionCard
      title="Financial Statements"
      subtitle={`${STATEMENT_LABEL[statement]} · ${period === "annual" ? "Annual" : "Quarterly"}`}
      right={controls}
    >
      {loading ? (
        <Skeleton rows={12} />
      ) : cols.length === 0 ? (
        <EmptyNote text="Financial statements are available for stocks only." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="sticky left-0 bg-surface z-10 text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3 min-w-[180px]">
                  Line Item
                </th>
                {cols.map((row, i) => (
                  <th
                    key={i}
                    className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3 whitespace-nowrap"
                  >
                    <span className="block">{periodLabel(row)}</span>
                    <span className="block text-gray-600 normal-case tracking-normal font-mono">
                      {fmtDateShort(row?.date)}
                    </span>
                  </th>
                ))}
                <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                  Trend
                </th>
                <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                  YoY
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((def, ri) => {
                if ("section" in def) {
                  return (
                    <tr key={`s-${ri}`} className="bg-white/[0.02]">
                      <td className="sticky left-0 bg-surface z-10 text-[11px] uppercase tracking-wider text-yellow-300/80 font-medium py-2 px-3 whitespace-nowrap">
                        {def.section}
                      </td>
                      <td
                        colSpan={cols.length + 2}
                        className="text-[11px] uppercase tracking-wider text-yellow-300/80 py-2 px-3"
                      />
                    </tr>
                  );
                }
                const values = cols.map((row) =>
                  isNum(row?.[def.key]) ? (row[def.key] as number) : null
                );
                const delta = yoyChange(values, period);
                return (
                  <tr
                    key={def.key}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td
                      className={`sticky left-0 bg-surface z-10 py-2.5 px-3 whitespace-nowrap text-xs ${
                        def.bold ? "text-gray-100 font-semibold" : "text-gray-500"
                      } ${def.indent ? "pl-6" : ""}`}
                    >
                      {def.label}
                    </td>
                    {values.map((v, ci) => (
                      <td
                        key={ci}
                        className={`py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums ${
                          def.bold ? "font-semibold" : ""
                        } ${cellClass(v, def.kind, def.signed)}`}
                      >
                        {formatCell(v, def.kind)}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right">
                      <Sparkbars values={values} />
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <DeltaPill v={delta} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
};

export default FinancialsTab;
