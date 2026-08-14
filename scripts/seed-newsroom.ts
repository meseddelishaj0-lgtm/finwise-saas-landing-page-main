// One-time helper: seeds a welcome article and reports which admin-list
// emails have site accounts. Run: npx tsx scripts/seed-newsroom.ts
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const existing = await prisma.newsArticle.findUnique({
    where: { slug: "welcome-to-the-wallstreetstocks-newsroom" },
  });
  if (!existing) {
    await prisma.newsArticle.create({
      data: {
        slug: "welcome-to-the-wallstreetstocks-newsroom",
        title: "Welcome to the WallStreetStocks Newsroom",
        summary:
          "Announcements, market notes, and calls from the desk — published here, alongside the wire.",
        content: [
          "This is the WallStreetStocks newsroom: the place where we publish our own stories, not just relay the wire.",
          "Expect desk notes on what we're watching, updates on new tools landing in the terminal and the iOS app, and the occasional deep dive when a name earns it.",
          "Everything here is research and commentary, not investment advice. The tape decides who's right.",
        ].join("\n\n"),
        authorEmail: "wallstreetstocks@outlook.com",
        published: true,
      },
    });
    console.log("SEEDED welcome article");
  } else {
    console.log("Welcome article already exists");
  }

  const admins = ["meseddelishaj0@gmail.com", "wallstreetstocks@outlook.com"];
  for (const email of admins) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    console.log(`ACCOUNT ${email}: ${u ? "EXISTS (id " + u.id + ")" : "not registered"}`);
  }

  const count = await prisma.newsArticle.count();
  console.log(`Total articles: ${count}`);
}

main().finally(() => process.exit(0));
