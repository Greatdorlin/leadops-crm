import { checkMfa } from "@/lib/security/mfa";
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
      code: {label:"Authenticator or recovery code",type:"text"},
    },
    async authorize(credentials) {
      if ((credentials?.code?.length ?? 0) > 32 || (credentials?.password?.length ?? 0) > 128) return null;
      const user=await verifyUserPassword(credentials?.email, credentials?.password);
      if(!user)return null;
      const factor=await checkMfa(user.id,credentials?.code?.trim()??"");
      return factor.ok ? {...user,mfaVersion:factor.version}:null;
    },
  }),
);

async function googleFactorVersion(email?: string | null) {
  if (!email) return null;
  const {getDb} = await import("@/lib/db/client");
  const {crmUsers, userCredentials} = await import("@/lib/db/schema");
  const {eq} = await import("drizzle-orm");
  const [row] = await getDb().select({enabledAt:userCredentials.mfaEnabledAt, changedAt:userCredentials.mfaChangedAt})
    .from(crmUsers).leftJoin(userCredentials,eq(userCredentials.userId,crmUsers.id))
    .where(eq(crmUsers.email,email.toLowerCase().trim())).limit(1);
  return !row || row.enabledAt ? null : row.changedAt?.toISOString() ?? "none";
}
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
    async jwt({token,user,account}) {
      if (account && user?.email) {
        const version = (user as typeof user & {mfaVersion?:string}).mfaVersion;
        if (!version) throw new Error("Authentication verification is required.");
        token.mfaVersion = version;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!isVerifiedGoogleProfile(profile) || !user.id || !(await hasAdminWorkspaceAccess(user.email))) return false;
        const version = await googleFactorVersion(user.email);
        if (version === null) return false;
        (user as typeof user & {mfaVersion?:string}).mfaVersion = version;
        return true;
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

      (session as typeof session & {mfaVersion?:string}).mfaVersion=typeof token.mfaVersion==="string"?token.mfaVersion:undefined;
      return session;
    },
  },
};
