import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const authPages = new Set(['/login', '/cadastro']);
const protectedPrefixes = [
  '/inicio',
  '/doar',
  '/rastreio',
  '/operacoes',
  '/configuracoes',
  '/perfil',
  '/notificacoes',
  '/suporte',
];

function sanitizeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith('/')) {
    return '/inicio';
  }

  return value;
}

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => {
    if (pathname === prefix) {
      return true;
    }

    return pathname.startsWith(`${prefix}/`);
  });
}

export default auth((request) => {
  const { nextUrl } = request;
  const { pathname, search } = nextUrl;
  const isAuthenticated = Boolean(request.auth?.user?.accessToken);

  if (authPages.has(pathname) && isAuthenticated) {
    const callbackUrl = sanitizeCallbackUrl(nextUrl.searchParams.get('callbackUrl'));
    return NextResponse.redirect(new URL(callbackUrl, nextUrl));
  }

  if (!isProtectedPath(pathname) || isAuthenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', nextUrl);
  loginUrl.searchParams.set('callbackUrl', `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
