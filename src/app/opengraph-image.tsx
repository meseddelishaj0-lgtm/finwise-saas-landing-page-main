import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

// Default social card for every page (pages can still override via metadata).
// Same voice as the site: night ground, Plex Mono, one gold tape.

export const runtime = "nodejs";
export const alt = "WallStreetStocks — the market, on your terms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NIGHT = "#0D0C09";
const GOLD = "#FACC15";
const IVORY = "#F2EDE3";
const GRAY = "#9CA3AF";
const DIM = "#6B7280";

// A calm intraday-style line, rising left to right (static, decorative)
const YS = [176, 166, 182, 150, 160, 122, 138, 102, 114, 84, 96, 62, 74, 44, 54, 30];
const W = 1200;
const H = 190;
const linePath = YS.map((y, i) => `${i === 0 ? "M" : "L"}${((i / (YS.length - 1)) * W).toFixed(1)},${y}`).join(" ");
const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

export default async function Image() {
  const fontDir = path.join(process.cwd(), "public", "fonts");
  const [regular, bold] = await Promise.all([
    readFile(path.join(fontDir, "IBMPlexMono-Regular.ttf")),
    readFile(path.join(fontDir, "IBMPlexMono-SemiBold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NIGHT,
          color: IVORY,
          fontFamily: "Plex",
          position: "relative",
        }}
      >
        {/* Tape */}
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: "absolute", left: 0, bottom: 0 }}
        >
          <path d={areaPath} fill="rgba(250, 204, 21, 0.10)" />
          <path d={linePath} fill="none" stroke={GOLD} strokeWidth={3} strokeLinejoin="round" />
          <circle cx={W - 2} cy={YS[YS.length - 1]} r={7} fill={GOLD} />
        </svg>

        {/* Masthead */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "52px 64px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: GOLD }} />
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>WallStreetStocks</div>
          </div>
          <div style={{ fontSize: 15, color: DIM, letterSpacing: 3 }}>
            EQUITIES · ETFS · INDICES · CRYPTO · FOREX · COMMODITIES
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", padding: "86px 64px 0" }}>
          <div style={{ display: "flex", fontSize: 20, color: DIM, letterSpacing: 1, whiteSpace: "pre" }}>
            <span>~/wss $ </span>
            <span style={{ color: GOLD, fontWeight: 600 }}>OPEN</span>
            <span>  ·  session live  ·  real-time data</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, fontSize: 82, fontWeight: 600, lineHeight: 1.02, letterSpacing: -2 }}>
            <div style={{ display: "flex" }}>The market,</div>
            <div style={{ display: "flex" }}>
              <span>on </span>
              <span style={{ color: GOLD, marginLeft: 22, marginRight: 22 }}>your</span>
              <span>terms.</span>
            </div>
          </div>
          <div style={{ marginTop: 28, fontSize: 24, color: GRAY }}>
            Live quotes, AI research, and a pro-grade terminal.
          </div>
        </div>

        {/* Domain — sits above the tape's left start */}
        <div
          style={{
            position: "absolute",
            left: 64,
            bottom: 112,
            fontSize: 17,
            color: GOLD,
            letterSpacing: 2.5,
          }}
        >
          WALLSTREETSTOCKS.AI
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plex", data: regular, weight: 400, style: "normal" },
        { name: "Plex", data: bold, weight: 600, style: "normal" },
      ],
    }
  );
}
