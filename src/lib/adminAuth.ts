import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Accounts allowed to publish in the newsroom. Override with the
// ADMIN_EMAILS env var (comma-separated) without touching code.
const DEFAULT_ADMINS = ["meseddelishaj0@gmail.com", "wallstreetstocks@outlook.com"];

export function adminEmailList(): string[] {
  const env = process.env.ADMIN_EMAILS;
  if (env && env.trim()) {
    return env
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_ADMINS;
}

/** Returns the signed-in admin's email, or null when not an admin. */
export async function getAdminEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) return null;
  return adminEmailList().includes(email) ? email : null;
}
