# Renders the 2x2 "day at a glance" market board PNG for newsroom desk notes.
# 1) Fetch data into DATA_DIR:  chart_GSPC.json chart_RUT.json chart_GLD.json
#    chart_BTCUSD.json (from /api/market/chart?symbol=X&range=1D) and
#    quotes.json (from /api/market/quotes?symbols=^GSPC,^RUT,GLD,BTCUSD)
# 2) DATA_DIR=/path OUT=public/newsroom/desk-note-YYYY-MM-DD.png python3 scripts/render-market-board.py
# 3) Deploy the image FIRST, then set the article imageUrl (X caches cards).

import json, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

SP = os.environ.get("DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("OUT", "/Users/mesed/Desktop/finwise-saas-landing-page-main/public/newsroom/board.png")

NIGHT = "#0D0C09"; SURFACE = "#161410"; IVORY = "#F2EDE3"
GRAY = "#9CA3AF"; FAINT = "#6B7280"; GOLD = "#FACC15"
UP = "#4ADE80"; DOWN = "#F87171"; HAIR = (1, 1, 1, 0.10)

MONO = "Menlo"; SERIF = "Georgia"

def closes(name):
    return [b["c"] for b in json.load(open(os.path.join(SP, name)))]

quotes = {q["symbol"]: q for q in json.load(open(os.path.join(SP, "quotes.json")))}

TILES = [
    dict(key="^GSPC", file="chart_GSPC.json", label="S&P 500", t0="9:30", t1="10:20", fmt="{:,.0f}"),
    dict(key="^RUT", file="chart_RUT.json", label="RUSSELL 2000", t0="9:30", t1="10:20", fmt="{:,.0f}"),
    dict(key="GLD", file="chart_GLD.json", label="GOLD · GLD", t0="9:30", t1="10:20", fmt="{:,.2f}", ref400=True),
    dict(key="BTCUSD", file="chart_BTCUSD.json", label="BITCOIN", t0="12:00A", t1="10:20", fmt="{:,.0f}"),
]

fig = plt.figure(figsize=(12, 6.3), dpi=200)
fig.patch.set_facecolor(NIGHT)

# Header
fig.text(0.045, 0.945, "FROM THE DESK — THE DAY AT A GLANCE", fontfamily=MONO,
         fontsize=9, color=GOLD, weight="bold")
fig.text(0.955, 0.9375, "WallStreetStocks", fontfamily=SERIF, fontsize=15,
         color=IVORY, ha="right")
fig.text(0.045, 0.028, "Intraday · Friday, Aug 14, 2026 · as of 10:25 AM ET",
         fontfamily=MONO, fontsize=7.5, color=FAINT)
fig.text(0.955, 0.028, "wallstreetstocks.ai · not investment advice",
         fontfamily=MONO, fontsize=7.5, color=FAINT, ha="right")

# 2x2 tile grid (figure coords)
W, H = 0.44, 0.375
X = [0.045, 0.515]
Y = [0.505, 0.085]

for i, tile in enumerate(TILES):
    x0, y0 = X[i % 2], Y[i // 2]
    q = quotes[tile["key"]]
    data = closes(tile["file"])
    prev = q.get("previousClose")
    chg = q.get("changePercent") or 0
    up = chg >= 0
    color = UP if up else DOWN

    # Rounded surface card (below the plot axes)
    fig.patches.append(FancyBboxPatch(
        (x0, y0), W, H, transform=fig.transFigure,
        boxstyle="round,pad=0.008,rounding_size=0.012",
        facecolor=SURFACE, edgecolor=HAIR, linewidth=1, zorder=0.5))

    # Plot area inside the card (leave header room)
    ax = fig.add_axes([x0 + 0.02, y0 + 0.045, W - 0.04, H - 0.155])
    ax.set_zorder(2)
    ax.patch.set_visible(False)
    ax.set_facecolor("none")
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_xticks([]); ax.set_yticks([])

    xs = list(range(len(data)))
    ax.plot(xs, data, color=color, linewidth=2, solid_capstyle="round", zorder=3)
    ax.fill_between(xs, data, min(min(data), prev or min(data)), color=color, alpha=0.13, zorder=2)

    lo = min(min(data), prev or min(data)); hi = max(max(data), prev or max(data))
    if tile.get("ref400"):
        lo = min(lo, 399.5); hi = max(hi, 400.5)
    pad = (hi - lo) * 0.12 or 1
    ax.set_ylim(lo - pad, hi + pad)
    ax.set_xlim(0, len(data) - 1)

    # Previous close reference
    if prev:
        ax.axhline(prev, color=(1, 1, 1, 0.22), linewidth=1, linestyle=(0, (4, 4)), zorder=1)
    # Gold $400 line for GLD
    if tile.get("ref400"):
        ax.axhline(400, color=GOLD, linewidth=1.1, linestyle=(0, (4, 3)), alpha=0.85, zorder=2)
        ax.annotate("400", xy=(0.005, 400), xycoords=("axes fraction", "data"),
                    fontfamily=MONO, fontsize=7.5, color=GOLD, va="bottom")

    # End-point marker
    ax.plot([xs[-1]], [data[-1]], marker="o", markersize=4.5, color=color, zorder=4)

    # Card header texts (figure coords)
    fig.text(x0 + 0.02, y0 + H - 0.052, tile["label"], fontfamily=MONO,
             fontsize=9.5, color=GRAY, weight="bold")
    fig.text(x0 + W - 0.02, y0 + H - 0.058, tile["fmt"].format(q["price"]),
             fontfamily=MONO, fontsize=16, color=IVORY, ha="right", weight="bold")
    arrow = "▲" if up else "▼"
    fig.text(x0 + 0.02, y0 + H - 0.095, f"{arrow} {chg:+.2f}%  vs prev close",
             fontfamily=MONO, fontsize=9, color=color, weight="bold")

    # Time labels
    fig.text(x0 + 0.02, y0 + 0.018, tile["t0"], fontfamily=MONO, fontsize=7, color=FAINT)
    fig.text(x0 + W - 0.02, y0 + 0.018, tile["t1"] + " ET", fontfamily=MONO,
             fontsize=7, color=FAINT, ha="right")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
fig.savefig(OUT, facecolor=NIGHT, dpi=200)
print("saved", OUT)
