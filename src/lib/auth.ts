import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import { prisma } from './prisma';
import { isAdminEmail } from './admin-access';
import { SUSPENSION_PROVIDER } from './user-access';

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const googleAuthConfigured = Boolean(googleClientId && googleClientSecret);

function readGoogleProfile(idToken: string | null | undefined) {
  if (!idToken) return null;
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };
  } catch {
    return null;
  }
}

const providers: NextAuthOptions['providers'] = [];

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: 'select_account',
          scope: 'openid email profile',
        },
      },
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
      const googleProfile = profile as { email?: string; email_verified?: boolean } | undefined;
      if (googleProfile?.email_verified !== true) return false;
      if (!googleProfile.email) return true;
      const existingUser = await prisma.user.findUnique({
        where: { email: googleProfile.email },
        select: {
          accounts: { where: { provider: SUSPENSION_PROVIDER }, select: { id: true } },
        },
      });
      return existingUser?.accounts.length !== 1;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        if (account?.provider === 'google') {
          const googleProfile = profile as {
            email?: string;
            name?: string;
            picture?: string;
            email_verified?: boolean;
          } | undefined;
          const upgradedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
              isGuest: false,
              email: googleProfile?.email ?? user.email,
              name: googleProfile?.name ?? user.name,
              image: googleProfile?.picture ?? user.image,
              emailVerified: googleProfile?.email_verified ? new Date() : undefined,
            },
          });
          token.userId = upgradedUser.id;
          token.isGuest = false;
          token.email = upgradedUser.email;
          token.name = upgradedUser.name;
          token.picture = upgradedUser.image;
        } else {
          token.userId = user.id;
          token.isGuest = (user as { isGuest?: boolean }).isGuest ?? false;
        }
      }

      if (!user && token.userId && token.isGuest) {
        const linkedGoogle = await prisma.account.findFirst({
          where: { userId: token.userId as string, provider: 'google' },
          select: { id_token: true },
        });
        if (linkedGoogle) {
          const googleProfile = readGoogleProfile(linkedGoogle.id_token);
          const upgradedUser = await prisma.user.update({
            where: { id: token.userId as string },
            data: {
              isGuest: false,
              email: googleProfile?.email,
              name: googleProfile?.name,
              image: googleProfile?.picture,
              emailVerified: googleProfile?.email_verified ? new Date() : undefined,
            },
          });
          token.isGuest = false;
          token.email = upgradedUser.email;
          token.name = upgradedUser.name;
          token.picture = upgradedUser.image;
        }
      }
      token.isAdmin = isAdminEmail(typeof token.email === 'string' ? token.email : null);
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        const sessionUser = session.user as { id?: string; isGuest?: boolean; isAdmin?: boolean };
        sessionUser.id = token.userId as string;
        sessionUser.isGuest = Boolean(token.isGuest);
        sessionUser.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
};
