import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { hasAdminWorkspaceAccess } from "@/lib/admin-directory";
import { isVerifiedGoogleProfile } from "@/lib/auth-policy";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
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
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !isVerifiedGoogleProfile(profile)) {
        return false;
      }
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
