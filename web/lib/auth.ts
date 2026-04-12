import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';

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
      accessTokenExpiresAt: number;
    } & DefaultSession['user'];
    error?: 'RefreshAccessTokenError';
  }

  interface User {
    id: string;
    role: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
  }
}

type AppAuthUser = {
  id: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
};

type AppAuthToken = JWT &
  Partial<AppAuthUser> & {
    error?: 'RefreshAccessTokenError';
  };

const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60_000;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof atob === 'function') {
    return atob(padded);
  }

  return Buffer.from(padded, 'base64').toString('utf-8');
}

function getAccessTokenExpiresAt(accessToken: string) {
  try {
    const [, payload] = accessToken.split('.');

    if (!payload) {
      return Date.now();
    }

    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: number };

    if (typeof parsed.exp === 'number') {
      return parsed.exp * 1000;
    }
  } catch {
    // Falls back to immediate refresh if the token payload cannot be decoded.
  }

  return Date.now();
}

function shouldRefreshAccessToken(expiresAt?: number) {
  if (!expiresAt) {
    return true;
  }

  return Date.now() >= expiresAt - ACCESS_TOKEN_REFRESH_WINDOW_MS;
}

async function refreshAccessToken(token: AppAuthToken): Promise<AppAuthToken> {
  if (!token.refreshToken) {
    return {
      ...token,
      accessToken: '',
      refreshToken: '',
      accessTokenExpiresAt: 0,
      error: 'RefreshAccessTokenError',
    };
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Refresh token rejected');
    }

    const data = await response.json();

    return {
      ...token,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpiresAt: getAccessTokenExpiresAt(data.accessToken),
      error: undefined,
    };
  } catch {
    return {
      ...token,
      accessToken: '',
      refreshToken: '',
      accessTokenExpiresAt: 0,
      error: 'RefreshAccessTokenError',
    };
  }
}

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
            accessTokenExpiresAt: getAccessTokenExpiresAt(data.accessToken),
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
    async jwt({ token, user }) {
      const mutableToken = token as AppAuthToken;
      const appUser = user as AppAuthUser | undefined;

      if (appUser) {
        mutableToken.id = appUser.id;
        mutableToken.role = appUser.role;
        mutableToken.accessToken = appUser.accessToken;
        mutableToken.refreshToken = appUser.refreshToken;
        mutableToken.accessTokenExpiresAt = appUser.accessTokenExpiresAt;
        mutableToken.error = undefined;
        return mutableToken;
      }

      if (!mutableToken.accessToken) {
        return mutableToken;
      }

      if (shouldRefreshAccessToken(mutableToken.accessTokenExpiresAt)) {
        return refreshAccessToken(mutableToken);
      }

      return mutableToken;
    },
    session({ session, token }) {
      const appToken = token as AppAuthToken;

      session.user.id = appToken.id ?? '';
      session.user.role = appToken.role ?? 'DONOR';
      session.user.accessToken = appToken.accessToken ?? '';
      session.user.accessTokenExpiresAt = appToken.accessTokenExpiresAt ?? 0;
      session.error = appToken.error;

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
