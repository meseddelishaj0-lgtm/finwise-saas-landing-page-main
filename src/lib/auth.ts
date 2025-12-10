import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
// replaced native bcrypt with bcryptjs (pure JS)
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        // bcryptjs.compare has same signature
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;
        return { id: user.id.toString(), name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      try {
        if (user) {
          token.id = (user as any).id ?? token.id;
          token.name = (user as any).name ?? token.name;
          token.email = (user as any).email ?? token.email;
        }
        return token;
      } catch (e) {
        console.error("jwt callback error", e);
        throw e;
      }
    },
    async session({ session, token }: { session: any; token: any }) {
      try {
        if (session?.user) {
          (session.user as any).id = token.id;
          session.user.name = token.name;
          session.user.email = token.email;
        }
        return session;
      } catch (e) {
        console.error("session callback error", e);
        throw e;
      }
    },
  },
  pages: { signIn: "/login" },
};

export default NextAuth(authOptions);

