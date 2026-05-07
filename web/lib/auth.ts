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
      emailVerifiedAt: string | null;
      organizationName: string | null;
    } & DefaultSession['user'];
    error?: 'RefreshAccessTokenError';
  }

  interface User {
    id: string;
    role: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    emailVerifiedAt: string | null;
    image?: string | null;
  }
}

type AppAuthUser = {
  id: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  emailVerifiedAt: string | null;
  image?: string | null;
  organizationName?: string | null;
  name?: string | null;
  email?: string | null;
};

type AppAuthToken = JWT &
  Partial<AppAuthUser> & {
    error?: 'RefreshAccessTokenError';
  };

const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60_000;

type SessionUpdateUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerifiedAt?: string | null;
  organizationName?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolveSessionUpdateUser(value: unknown): SessionUpdateUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = isRecord(value.user) ? value.user : value;
  const update: SessionUpdateUser = {};
  let hasKnownField = false;

  if ('name' in candidate && (typeof candidate.name === 'string' || candidate.name === null)) {
    update.name = candidate.name;
    hasKnownField = true;
  }

  if ('email' in candidate && (typeof candidate.email === 'string' || candidate.email === null)) {
    update.email = candidate.email;
    hasKnownField = true;
  }

  if ('image' in candidate && (typeof candidate.image === 'string' || candidate.image === null)) {
    update.image = candidate.image;
    hasKnownField = true;
  }

  if (
    'emailVerifiedAt' in candidate &&
    (typeof candidate.emailVerifiedAt === 'string' || candidate.emailVerifiedAt === null)
  ) {
    update.emailVerifiedAt = candidate.emailVerifiedAt;
    hasKnownField = true;
  }

  if (
    'organizationName' in candidate &&
    (typeof candidate.organizationName === 'string' || candidate.organizationName === null)
  ) {
    update.organizationName = candidate.organizationName;
    hasKnownField = true;
  }

  return hasKnownField ? update : null;
}

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

type RemoteUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  emailVerifiedAt?: string | null;
  organizationName?: string | null;
};

async function fetchRemoteUser(accessToken: string): Promise<RemoteUser | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { user: RemoteUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}

async function authorizeWithPassword(
  email: string,
  password: string,
): Promise<AppAuthUser | null> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.requiresTwoFactor) {
      // Login page handles the 2FA challenge before re-calling signIn with tokens.
      return null;
    }

    if (!data.accessToken || !data.refreshToken || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      image: data.user.avatarUrl ?? null,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpiresAt: getAccessTokenExpiresAt(data.accessToken),
      emailVerifiedAt: data.user.emailVerifiedAt ?? null,
      organizationName: data.user.organizationName ?? null,
    };
  } catch {
    return null;
  }
}

async function authorizeWithTokens(
  accessToken: string,
  refreshToken: string,
): Promise<AppAuthUser | null> {
  const remote = await fetchRemoteUser(accessToken);
  if (!remote) return null;

  return {
    id: remote.id,
    name: remote.name,
    email: remote.email,
    role: remote.role,
    image: remote.avatarUrl ?? null,
    accessToken,
    refreshToken,
    accessTokenExpiresAt: getAccessTokenExpiresAt(accessToken),
    emailVerifiedAt: remote.emailVerifiedAt ?? null,
    organizationName: remote.organizationName ?? null,
  };
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
        accessToken: { label: 'Access Token', type: 'text' },
        refreshToken: { label: 'Refresh Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const accessToken = typeof credentials.accessToken === 'string' ? credentials.accessToken : '';
        const refreshToken = typeof credentials.refreshToken === 'string' ? credentials.refreshToken : '';

        if (accessToken && refreshToken) {
          return authorizeWithTokens(accessToken, refreshToken);
        }

        const email = typeof credentials.email === 'string' ? credentials.email : '';
        const password = typeof credentials.password === 'string' ? credentials.password : '';

        if (email && password) {
          return authorizeWithPassword(email, password);
        }

        return null;
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
    async jwt({ token, user, trigger, session }) {
      const mutableToken = token as AppAuthToken;
      const appUser = user as AppAuthUser | undefined;
      const sessionUpdate = trigger === 'update' ? resolveSessionUpdateUser(session) : null;

      if (appUser) {
        mutableToken.id = appUser.id;
        mutableToken.name = appUser.name ?? mutableToken.name;
        mutableToken.email = appUser.email ?? mutableToken.email;
        mutableToken.picture = appUser.image ?? null;
        mutableToken.role = appUser.role;
        mutableToken.accessToken = appUser.accessToken;
        mutableToken.refreshToken = appUser.refreshToken;
        mutableToken.accessTokenExpiresAt = appUser.accessTokenExpiresAt;
        mutableToken.emailVerifiedAt = appUser.emailVerifiedAt;
        mutableToken.organizationName = appUser.organizationName ?? null;
        mutableToken.error = undefined;
        return mutableToken;
      }

      if (sessionUpdate) {
        if (typeof sessionUpdate.name === 'string') {
          mutableToken.name = sessionUpdate.name;
        }

        if (typeof sessionUpdate.email === 'string') {
          mutableToken.email = sessionUpdate.email;
        }

        if ('image' in sessionUpdate) {
          mutableToken.picture = sessionUpdate.image ?? null;
        }

        if ('emailVerifiedAt' in sessionUpdate) {
          mutableToken.emailVerifiedAt = sessionUpdate.emailVerifiedAt ?? null;
        }

        if ('organizationName' in sessionUpdate) {
          mutableToken.organizationName = sessionUpdate.organizationName ?? null;
        }
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
      session.user.name = typeof appToken.name === 'string' ? appToken.name : session.user.name;
      session.user.email =
        typeof appToken.email === 'string' ? appToken.email : session.user.email;
      session.user.image =
        typeof appToken.picture === 'string' || appToken.picture === null
          ? appToken.picture
          : session.user.image ?? null;
      session.user.role = appToken.role ?? 'DONOR';
      session.user.accessToken = appToken.accessToken ?? '';
      session.user.accessTokenExpiresAt = appToken.accessTokenExpiresAt ?? 0;
      session.user.emailVerifiedAt = (appToken.emailVerifiedAt as string | null | undefined) ?? null;
      session.user.organizationName =
        (appToken.organizationName as string | null | undefined) ?? null;
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
