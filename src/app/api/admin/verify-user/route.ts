import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Admin: grant or revoke the blue verified badge.
//
//   curl -X POST https://www.wallstreetstocks.ai/api/admin/verify-user \
//     -H "x-admin-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
//     -d '{"username":"someuser","verified":true}'
//
// Accepts { username } or { userId }; { verified } defaults to true.

export async function POST(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || request.headers.get('x-admin-key') !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const verified = body.verified !== false;

    let user = null;
    if (body.userId) {
      user = await prisma.user.update({
        where: { id: Number(body.userId) },
        data: { isVerified: verified },
        select: { id: true, username: true, name: true, isVerified: true },
      });
    } else if (body.username) {
      user = await prisma.user.update({
        where: { username: String(body.username) },
        data: { isVerified: verified },
        select: { id: true, username: true, name: true, isVerified: true },
      });
    } else {
      return NextResponse.json({ error: 'Provide userId or username' }, { status: 400 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.error('verify-user error:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
