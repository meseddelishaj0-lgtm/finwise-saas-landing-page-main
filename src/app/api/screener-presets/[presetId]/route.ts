// api/screener-presets/[presetId]/route.ts
// Delete a specific screener preset
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// DELETE /api/screener-presets/[presetId]?userId=123 - Delete a preset
export async function DELETE(
  req: NextRequest,
  { params }: { params: { presetId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const presetId = params.presetId;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!presetId) {
      return NextResponse.json({ error: "presetId is required" }, { status: 400 });
    }

    // First verify the preset belongs to this user
    const preset = await prisma.screenerPreset.findFirst({
      where: {
        id: parseInt(presetId, 10),
        userId: parseInt(userId, 10),
      },
    });

    if (!preset) {
      return NextResponse.json(
        { error: "Preset not found or does not belong to this user" },
        { status: 404 }
      );
    }

    // Delete the preset
    await prisma.screenerPreset.delete({
      where: { id: parseInt(presetId, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting screener preset:", error);
    return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 });
  }
}
