import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";
import { insforgeDb as db } from "@/lib/insforge";

// Module augmentation — must live here alongside the NextAuth() call
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}

const config: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid email profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/documents",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/presentations",
          ].join(" "),
          access_type: "offline",
          prompt: "consent", // REQUIRED on every login to receive refresh_token
        },
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      try {
        const now = new Date().toISOString();

        // Upsert user profile in InsForge `profiles` table
        const { data: existing } = await db
          .from("profiles")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (existing) {
          await db
            .from("profiles")
            .update({
              display_name: user.name ?? undefined,
              avatar_url: user.image ?? undefined,
              updated_at: now,
            })
            .eq("email", user.email);
        } else {
          const username = (user.email.split("@")[0] ?? "user").replace(/[^a-z0-9_]/gi, "_");
          await db.from("profiles").insert({
            email: user.email,
            display_name: user.name ?? "",
            avatar_url: user.image ?? "",
            username,
            role: "user",
            account_status: "active",
            created_at: now,
            updated_at: now,
          });
        }

        // Save OAuth tokens to connector_tokens for Workspace integrations
        if (account.provider === "google" && account.access_token) {
          await db.from("connector_tokens").upsert(
            {
              email: user.email,
              provider: "google",
              access_token: account.access_token,
              refresh_token: account.refresh_token ?? null,
              expires_at: account.expires_at
                ? new Date((account.expires_at as number) * 1000).toISOString()
                : null,
              updated_at: now,
              created_at: now,
            },
            { onConflict: "email,provider" }
          );
        }

        if (account.provider === "github" && account.access_token) {
          await db.from("connector_tokens").upsert(
            {
              email: user.email,
              provider: "github",
              access_token: account.access_token,
              refresh_token: null,
              expires_at: null,
              updated_at: now,
              created_at: now,
            },
            { onConflict: "email,provider" }
          );
        }
      } catch (err) {
        // Log but don't block login
        console.error("[auth] signIn callback error:", err);
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      // Populate userId on signIn OR if it's missing from an existing token
      const emailToLookup = (trigger === "signIn" && user?.email)
        ? user.email
        : (!token.userId && token.email) ? token.email as string : null;

      if (emailToLookup) {
        try {
          const { data } = await db
            .from("profiles")
            .select("id")
            .eq("email", emailToLookup)
            .maybeSingle();
          if (data?.id) token.userId = data.id as string;
        } catch {
          // token.userId stays undefined
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },

    async authorized({ auth }) {
      return !!auth;
    },
  },
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(config);
