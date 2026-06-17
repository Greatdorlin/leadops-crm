import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { hasAdminWorkspaceAccess } from "@/lib/admin-directory";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/signin",
    error: "/admin/signin",
  },
  providers:
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : [],
  callbacks: {
    async signIn({ user }) {
      return hasAdminWorkspaceAccess(user.email);
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
      }

      return session;
    },
  },
};
