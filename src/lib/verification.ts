// src/lib/verification.ts
// Diamond subscribers automatically carry the blue verified badge.
// verifiedBadge records WHY someone is verified: 'diamond' (auto) or
// 'manual' (granted via /api/admin/verify-user). Tier downgrades only
// strip auto-granted badges — manual verifications are never touched.
import { prisma } from '@/lib/prisma';

export async function syncDiamondVerification(userId: number, newTier: string | null | undefined) {
  try {
    if ((newTier || '').toLowerCase() === 'diamond') {
      await prisma.user.updateMany({
        where: { id: userId, OR: [{ isVerified: false }, { verifiedBadge: null }] },
        data: { isVerified: true, verifiedBadge: 'diamond' },
      });
    } else {
      await prisma.user.updateMany({
        where: { id: userId, verifiedBadge: 'diamond' },
        data: { isVerified: false, verifiedBadge: null },
      });
    }
  } catch (err) {
    // Verification sync must never break a subscription update
    console.error('syncDiamondVerification error:', err);
  }
}
