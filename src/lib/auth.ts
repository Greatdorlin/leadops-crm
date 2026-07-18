import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { hasAdminWorkspaceAccess } from "@/lib/admin-directory";
import { isVerifiedGoogleProfile } from "@/lib/auth-policy";
import { isGoogleAuthConfigured } from "@/lib/admin-access";
import { verifyUserPassword } from "@/lib/auth-credentials";

const providers: NextAuthOptions["providers"] = [];

if (isGoogleAuthConfigured()) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  );
}

providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      return verifyUserPassword(credentials?.email, credentials?.password);
    },
  }),
);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        return isVerifiedGoogleProfile(profile) && hasAdminWorkspaceAccess(user.email);
      }

      if (account?.provider !== "credentials") {
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
