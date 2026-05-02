import type { Metadata } from 'next';
import '@/styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/lib/auth';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { CookieConsentBanner } from '@/components/layout/cookie-consent-banner';

export const metadata: Metadata = {
  title: 'VestGO - Doar com proposito',
  description: 'Rastreie sua doacao do inicio ao impacto final.',
  manifest: '/favicon/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
    other: [
      { rel: 'mask-icon', url: '/favicon/safari-pinned-tab.svg', color: '#006a62' },
    ],
  },
  other: {
    'msapplication-config': '/favicon/browserconfig.xml',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Inline script to apply dark class before first paint — prevents FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('vestgo:theme-preference')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface text-on-surface dark:bg-surface-ink dark:text-gray-100">
        <SessionProvider
          session={session}
          refetchInterval={60}
          refetchOnWindowFocus
          refetchWhenOffline={false}
        >
          <ThemeProvider>
            {children}
            <CookieConsentBanner />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
