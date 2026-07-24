// api/screener-presets/route.ts
// User saved screener filter presets
import { NextRequest, NextResponse } from "next/server";
import { resolveMobileUserId } from '@/lib/mobileAuth';
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/screener-presets?userId=123 - Get user's saved presets
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Resolve identity from the signed token (falls back to the param until
    // strict mode) — previously this endpoint trusted ?userId= with no auth,
    // letting anyone read any user's presets.
    const auth = resolveMobileUserId(req, userId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const presets = await prisma.screenerPreset.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        filters: true,
        createdAt: true,
      },
    });

    // Transform id to string for consistency with frontend
    const transformedPresets = presets.map(preset => ({
      ...preset,
      id: preset.id.toString(),
    }));

    return NextResponse.json({ presets: transformedPresets });
  } catch (error) {
    console.error("Error fetching screener presets:", error);
    return NextResponse.json({ error: "Failed to fetch presets" }, { status: 500 });
  }
}

// POST /api/screener-presets - Save a new preset
export async function POST(req: NextRequest) {
  try {
    const { userId, name, filters } = await req.json();
    const _auth = resolveMobileUserId(req, userId);
    if (!_auth.ok) return NextResponse.json({ error: _auth.error }, { status: _auth.status });

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Preset name is required" }, { status: 400 });
    }

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ error: "Filters are required" }, { status: 400 });
    }

    // Check if user already has a preset with this name — all DB ops use the
    // token-resolved id, never the raw client-supplied one.
    const existing = await prisma.screenerPreset.findFirst({
      where: {
        userId: _auth.userId,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A preset with this name already exists" },
        { status: 409 }
      );
    }

    // Limit to 20 presets per user
    const count = await prisma.screenerPreset.count({
      where: { userId: _auth.userId },
    });

    if (count >= 20) {
      return NextResponse.json(
        { error: "Maximum of 20 presets allowed. Please delete some to add more." },
        { status: 400 }
      );
    }

    const preset = await prisma.screenerPreset.create({
      data: {
        userId: _auth.userId,
        name: name.trim(),
        filters: filters,
      },
      select: {
        id: true,
        name: true,
        filters: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      preset: {
        ...preset,
        id: preset.id.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating screener preset:", error);
    return NextResponse.json({ error: "Failed to create preset" }, { status: 500 });
  }
}
