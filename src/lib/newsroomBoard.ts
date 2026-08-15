// Serverless "day at a glance" board for auto-published desk notes.
// Builds the ReactElement tree consumed by next/og ImageResponse (satori) —
// no JSX so this stays a plain .ts module.
import { createElement as h, type ReactElement } from "react";

const NIGHT = "#0D0C09";
const SURFACE = "#161410";
const IVORY = "#F2EDE3";
const GRAY = "#9CA3AF";
const FAINT = "#6B7280";
const GOLD = "#FACC15";
const UP = "#4ADE80";
const DOWN = "#F87171";
const HAIR = "rgba(255,255,255,0.10)";

export interface BoardTile {
  label: string;
  price: string;
  changePercent: number;
  closes: number[];
  prevClose?: number | null;
  t0: string;
  t1: string;
}

const TILE_W = 548;
const SVG_W = 508;
const SVG_H = 132;

function sparkSvg(tile: BoardTile): ReactElement {
  const closes = tile.closes;
  const all = [...closes];
  if (tile.prevClose) all.push(tile.prevClose);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.1 || 1;
  const y = (v: number) =>
    SVG_H - 4 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (SVG_H - 8);
  const x = (i: number) => 4 + (i / (closes.length - 1)) * (SVG_W - 8);
  const pts = closes.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const color = tile.changePercent >= 0 ? UP : DOWN;
  const area = `${pts} ${x(closes.length - 1).toFixed(1)},${SVG_H} ${x(0).toFixed(1)},${SVG_H}`;

  const children: ReactElement[] = [
    h("polygon", { key: "a", points: area, fill: color, fillOpacity: 0.13 }),
    h("polyline", {
      key: "l",
      points: pts,
      fill: "none",
      stroke: color,
      strokeWidth: 3,
      strokeLinejoin: "round",
      strokeLinecap: "round",
    }),
    h("circle", {
      key: "c",
      cx: x(closes.length - 1),
      cy: y(closes[closes.length - 1]),
      r: 4.5,
      fill: color,
    }),
  ];
  if (tile.prevClose && tile.prevClose > lo - pad && tile.prevClose < hi + pad) {
    children.unshift(
      h("line", {
        key: "p",
        x1: 4,
        x2: SVG_W - 4,
        y1: y(tile.prevClose),
        y2: y(tile.prevClose),
        stroke: "rgba(255,255,255,0.22)",
        strokeWidth: 1.5,
        strokeDasharray: "6 6",
      })
    );
  }
  return h("svg", { width: SVG_W, height: SVG_H, viewBox: `0 0 ${SVG_W} ${SVG_H}` }, children);
}

function arrow(up: boolean): ReactElement {
  return h(
    "svg",
    { width: 12, height: 12, viewBox: "0 0 12 12", style: { marginRight: 6 } },
    h("polygon", {
      points: up ? "6,2 11,10 1,10" : "6,10 11,2 1,2",
      fill: up ? UP : DOWN,
    })
  );
}

function tileEl(tile: BoardTile): ReactElement {
  const up = tile.changePercent >= 0;
  const color = up ? UP : DOWN;
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: TILE_W,
        backgroundColor: SURFACE,
        border: `1px solid ${HAIR}`,
        borderRadius: 14,
        padding: "18px 20px 12px 20px",
      },
    },
    [
      h(
        "div",
        {
          key: "head",
          style: { display: "flex", justifyContent: "space-between", alignItems: "center" },
        },
        [
          h(
            "span",
            { key: "l", style: { fontSize: 17, fontWeight: 600, color: GRAY, letterSpacing: 1 } },
            tile.label
          ),
          h(
            "span",
            { key: "p", style: { fontSize: 28, fontWeight: 600, color: IVORY } },
            tile.price
          ),
        ]
      ),
      h(
        "div",
        { key: "chip", style: { display: "flex", alignItems: "center", marginTop: 2 } },
        [
          arrow(up),
          h(
            "span",
            { key: "pct", style: { fontSize: 15, fontWeight: 600, color } },
            `${up ? "+" : ""}${tile.changePercent.toFixed(2)}%  vs prev close`
          ),
        ]
      ),
      h("div", { key: "spark", style: { display: "flex", marginTop: 8 } }, sparkSvg(tile)),
      h(
        "div",
        {
          key: "times",
          style: {
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            fontSize: 12,
            color: FAINT,
          },
        },
        [h("span", { key: "a" }, tile.t0), h("span", { key: "b" }, tile.t1)]
      ),
    ]
  );
}

export function buildBoardElement(opts: {
  heading: string;
  footerLeft: string;
  tiles: BoardTile[];
}): ReactElement {
  const rows = [opts.tiles.slice(0, 2), opts.tiles.slice(2, 4)];
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: 1200,
        height: 630,
        backgroundColor: NIGHT,
        padding: "28px 40px",
        fontFamily: "Plex",
      },
    },
    [
      h(
        "div",
        {
          key: "hdr",
          style: { display: "flex", justifyContent: "space-between", alignItems: "center" },
        },
        [
          h(
            "span",
            { key: "t", style: { fontSize: 15, fontWeight: 600, color: GOLD, letterSpacing: 1.5 } },
            opts.heading
          ),
          h(
            "span",
            { key: "w", style: { fontSize: 17, fontWeight: 600, color: IVORY, letterSpacing: 2 } },
            "WALLSTREETSTOCKS"
          ),
        ]
      ),
      ...rows.map((row, ri) =>
        h(
          "div",
          {
            key: `r${ri}`,
            style: { display: "flex", justifyContent: "space-between", marginTop: ri === 0 ? 20 : 16 },
          },
          row.map((t, i) => h("div", { key: i, style: { display: "flex" } }, tileEl(t)))
        )
      ),
      h(
        "div",
        {
          key: "ftr",
          style: {
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
            fontSize: 12.5,
            color: FAINT,
          },
        },
        [
          h("span", { key: "a" }, opts.footerLeft),
          h("span", { key: "b" }, "wallstreetstocks.ai · not investment advice"),
        ]
      ),
    ]
  );
}
