import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      accessToken: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: string;
    accessToken: string;
    refreshToken: string;
  }
}

type AppAuthUser = {
  id: string;
  role: string;
  accessToken: string;
  refreshToken: string;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          return {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return `${baseUrl}/inicio`;
    },
    jwt({ token, user }) {
      const mutableToken = token as typeof token & AppAuthUser;
      const appUser = user as AppAuthUser | undefined;

      if (appUser) {
        mutableToken.id = appUser.id;
        mutableToken.role = appUser.role;
        mutableToken.accessToken = appUser.accessToken;
        mutableToken.refreshToken = appUser.refreshToken;
      }

      return mutableToken;
    },
    session({ session, token }) {
      const appToken = token as typeof token & Partial<AppAuthUser>;

      session.user.id = appToken.id ?? '';
      session.user.role = appToken.role ?? 'DONOR';
      session.user.accessToken = appToken.accessToken ?? '';

      return session;
    },
  },
  events: {
    async signOut(message) {
      const accessToken =
        'token' in message
          ? ((message.token as Partial<AppAuthUser> | null | undefined)?.accessToken ?? '')
          : '';

      if (!accessToken) {
        return;
      }

      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch {
        // Best effort: local session still needs to be cleared.
      }
    },
  },
});
