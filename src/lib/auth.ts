import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * ✅ NextAuth configuration
 * Handles login authentication using email + password stored in Prisma
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      // ✅ Main login logic
      async authorize(
        credentials: Record<string, string> | undefined
      ): Promise<any> {
        if (!credentials?.email || !credentials.password) return null;

        // 🔍 Find user in Prisma by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.error("❌ No user found with email:", credentials.email);
          return null;
        }

        // 🔐 Compare hashed password using bcrypt
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          console.error("⚠️ Invalid password for user:", credentials.email);
          return null;
        }

        // ✅ Return user info (session payload)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],

  // ✅ Redirect to login page on auth failure
  pages: {
    signIn: "/login",
  },

  // ✅ JWT-based sessions (stateless, better for serverless)
  session: { strategy: "jwt" },

  // ✅ Encryption secret
  secret: process.env.NEXTAUTH_SECRET,
};
