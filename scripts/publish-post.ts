// Publish a newsroom post directly (owner-run helper).
// Run: npx tsx scripts/publish-post.ts
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const post = {
  slug: "desk-note-aug-14-quiet-open-small-caps-lead-gold-clears-400",
  title: "Desk note: a quiet open, small caps lead, gold clears $400",
  summary:
    "The S&P holds near 7,800 early Friday while the Russell 2000 outperforms. Tesla pushes 3% higher, gold's GLD trades through $400, and bitcoin cools off.",
  symbol: "^GSPC",
  content: [
    "An hour into Friday's session the tape is quiet. As of about 10:20 a.m. ET the S&P 500 sits at 7,800, unchanged on the day, the Nasdaq Composite is off 0.1% at 26,769, and the Dow is flat at 53,835. After Thursday's session closed green across the board, the market is catching its breath.",
    "The one index with a pulse this morning is the Russell 2000, up 0.3% at 3,063 — small caps are doing the leading while the large-cap benchmarks idle. The VIX at 14.6 says nobody is bracing for trouble into the weekend.",
    "Mega caps are mixed-to-higher. Tesla is the standout, up 3% at $350. Meta is adding 0.7%, while Microsoft, Nvidia, and Apple are each up around a quarter of a percent. Nothing in the leadership group is red.",
    "Elsewhere on the desk: gold is the quiet headline — GLD is up 0.8% at $402, trading through the $400 mark after closing Thursday just below it. Oil is steady, with USO a tenth higher. Long Treasuries are a touch softer, TLT off 0.4%. Bitcoin is the laggard of the morning, down 1.4% near $62,500.",
    "On the movers board, the usual small-cap fireworks: MDxHealth, MindForge, and Onfolio are each up 65–70%, while MicroVision and Innventure have been cut roughly in half. Names moving that fast trade thin — ranges are wide and fills are unforgiving.",
    "Into the weekend we're watching two things: whether small-cap leadership holds once the morning settles, and whether GLD can close above $400. Follow it live in the Terminal.",
  ].join("\n\n"),
  authorEmail: "wallstreetstocks@outlook.com",
  published: true,
};

async function main() {
  try {
    const created = await prisma.newsArticle.upsert({
      where: { slug: post.slug },
      create: post,
      update: post,
    });
    console.log("PUBLISHED:", created.slug, "id", created.id);
  } catch (e) {
    console.error("ERR", e);
  }
  process.exit(0);
}
main();
