import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// create handler and export only allowed route exports.
// Do NOT export authOptions or other named symbols from this file.
const handler = NextAuth(authOptions);
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as DELETE,
  handler as PATCH,
  handler as OPTIONS,
  handler as HEAD,
};
