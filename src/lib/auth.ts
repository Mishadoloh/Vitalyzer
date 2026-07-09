import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    // "Продовжити як гість" — creates a fresh anonymous account on every use.
    // Credentials-based sign-in only works with JWT sessions (NextAuth doesn't
    // persist Credentials sessions via the adapter), which is why the whole
    // app uses `session.strategy: 'jwt'` below instead of database sessions.
    CredentialsProvider({
      id: 'guest',
      name: 'Гість',
      credentials: {},
      async authorize() {
        const user = await prisma.user.create({
          data: { name: 'Гість', isGuest: true },
        });
        return { id: user.id, name: user.name, email: null, isGuest: true };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.isGuest = (user as { isGuest?: boolean }).isGuest ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as { id?: string; isGuest?: boolean }).id = token.userId as string;
        (session.user as { id?: string; isGuest?: boolean }).isGuest = Boolean(token.isGuest);
      }
      return session;
    },
  },
};
