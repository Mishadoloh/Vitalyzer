import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import { prisma } from './prisma';

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const googleAuthConfigured = Boolean(googleClientId && googleClientSecret);

const providers: NextAuthOptions['providers'] = [];

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

providers.push(
  // Credentials-based sign-in needs JWT sessions when an adapter is present.
  // A new isolated account is created for every guest session.
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
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true;
      return (profile as { email_verified?: boolean } | undefined)?.email_verified === true;
    },
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
