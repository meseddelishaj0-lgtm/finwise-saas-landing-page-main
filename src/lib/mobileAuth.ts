// src/lib/mobileAuth.ts
// Trusted identity for mobile API routes.
//
// Login/signup/google/apple all issue a JWT signed with JWT_SECRET carrying
// `{ userId }`. Historically the data routes ignored it and trusted a plaintext
// `x-user-id` header / `userId` param, which anyone could spoof to read or wipe
// another account's data. These helpers derive the caller from the signed token
// instead, while staying backward-compatible with app builds that don't yet send
// the token (see STRICT_MOBILE_AUTH below).
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// When '1', a valid Bearer token is REQUIRED — the legacy x-user-id fallback is
// refused. Leave unset during OTA rollout so older installed builds keep working;
// flip to '1' once token-sending builds have propagated to fully close IDOR.
const STRICT = process.env.STRICT_MOBILE_AUTH === '1';

/** Verify the Authorization: Bearer <jwt> header. Returns the userId or null. */
export function getTokenUserId(req: NextRequest): number | null {
  const header = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const payload = jwt.verify(m[1], secret) as { userId?: string | number };
    const id = Number(payload?.userId);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export type ResolvedUser =
  | { ok: true; userId: number }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Resolve the acting user for a mobile request.
 *
 * - Valid token present: use its userId. If a client-supplied id is also present
 *   and disagrees, reject as a spoofing attempt (403).
 * - No token: refuse in strict mode (401); otherwise fall back to the
 *   client-supplied id (legacy behavior, still spoofable — this is the migration
 *   shim, closed by setting STRICT_MOBILE_AUTH=1).
 */
export function resolveMobileUserId(req: NextRequest, claimedRaw?: string | number | null): ResolvedUser {
  const tokenUserId = getTokenUserId(req);
  const claimed = claimedRaw == null || claimedRaw === '' ? null : Number(claimedRaw);

  if (tokenUserId != null) {
    if (claimed != null && Number.isFinite(claimed) && claimed !== tokenUserId) {
      return { ok: false, status: 403, error: 'User mismatch' };
    }
    return { ok: true, userId: tokenUserId };
  }

  if (STRICT) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  if (claimed != null && Number.isFinite(claimed)) {
    return { ok: true, userId: claimed };
  }
  return { ok: false, status: 401, error: 'Missing user identity' };
}
