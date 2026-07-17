// api/screener-presets/[presetId]/route.ts
// Delete a specific screener preset
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveMobileUserId } from "@/lib/mobileAuth";

export const dynamic = 'force-dynamic';

// DELETE /api/screener-presets/[presetId]?userId=123 - Delete a preset
export async function DELETE(
  req: NextRequest,
  { params }: { params: { presetId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const presetId = params.presetId;

    // Verify the caller owns the id so a spoofed ?userId can't delete another
    // user's preset (the query below is already scoped to this id).
    const auth = resolveMobileUserId(req, searchParams.get("userId"));
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!presetId) {
      return NextResponse.json({ error: "presetId is required" }, { status: 400 });
    }

    // First verify the preset belongs to this user
    const preset = await prisma.screenerPreset.findFirst({
      where: {
        id: parseInt(presetId, 10),
        userId: auth.userId,
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
