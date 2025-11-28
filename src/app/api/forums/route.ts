import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // ✅ make sure this matches your export (default)

export async function GET() {
  try {
    const forums = await prisma.forum.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(forums, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching forums:", error);
    return NextResponse.json({ error: "Failed to fetch forums" }, { status: 500 });
  }
}
