import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "~/lib/prisma";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      isClient: boolean;
      isLawyer: boolean;
      isAdmin: boolean;
    };
  }

  interface User {
    isClient: boolean;
    isLawyer: boolean;
    isAdmin: boolean;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */

export const authOptions: NextAuthOptions = {
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.user = user;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: token.user,
    }),
    async redirect({ url, baseUrl }) {
      return baseUrl + "/rerouter";
    },
  },
  pages: {
    signIn: "/",
    signOut: "/rerouter",
  },
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "Credentials",
      // `credentials` is used to generate a form on the sign in page.
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _req) {
        const { username, password } = credentials!;

        const client = await prisma.client.findFirst({
          where: {
            user: String(username),
            pass: String(password),
          },
        });

        const lawyer = await prisma.lawyer.findFirst({
          where: {
            user: String(username),
            pass: String(password),
          },
        });

        if (client) {
          const user = {
            id: String(client.ClientID),
            name: `${client.LastName}, ${client.FirstName} ${client.MiddleName}`,
            email: client.Email,
            isClient: true,
            isLawyer: false,
            isAdmin: false,
          };
          return user;
        } else if (lawyer) {
          const user = {
            id: String(lawyer.LawyerID),
            name: `${lawyer.LastName}, ${lawyer.FirstName} ${lawyer.MiddleName}`,
            email: lawyer.Email,
            isClient: false,
            isLawyer: true,
            isAdmin: lawyer.isManager ?? false,
          };
          return user;
        } else {
          return null;
        }
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
