// src/app/api/user/notification-prefs/route.ts
// Server-side notification preferences (Settings → Notifications).
// SOURCE OF TRUTH: User.notificationPrefs — survives reinstall / new device /
// AsyncStorage loss. The app mirrors this into OneSignal tags on launch and on
// toggle; device storage is only a cache. Same auth pattern as watchlist/sync.
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveMobileUserId } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

const MAX_CATEGORIES = 20;
const KEY_RE = /^[a-z_]{1,32}$/;

function getUserId(req: NextRequest): number | null {
  const resolved = resolveMobileUserId(req, req.headers.get('x-user-id'));
  return resolved.ok ? resolved.userId : null;
}

// GET → { prefs: { master, categories } | null }
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    return NextResponse.json({ prefs: user?.notificationPrefs ?? null });
  } catch (err) {
    console.error('notification-prefs GET error:', err);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

// POST { master?: boolean, categories?: { <key>: boolean } } → replaces stored prefs
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    // Sanitize to a strict shape — never store arbitrary client JSON.
    const master = typeof body?.master === 'boolean' ? body.master : true;
    const categories: Record<string, boolean> = {};
    if (body?.categories && typeof body.categories === 'object') {
      for (const [key, value] of Object.entries(body.categories)) {
        if (Object.keys(categories).length >= MAX_CATEGORIES) break;
        if (KEY_RE.test(key) && typeof value === 'boolean') categories[key] = value;
      }
    }

    const prefs = { master, categories };
    await prisma.user.update({ where: { id: userId }, data: { notificationPrefs: prefs } });
    return NextResponse.json({ success: true, prefs });
  } catch (err) {
    console.error('notification-prefs POST error:', err);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
