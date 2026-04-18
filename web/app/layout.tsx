import type { Metadata } from 'next';
import '@/styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/lib/auth';

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
    <html lang="pt-BR">
      <body className="min-h-screen bg-surface text-on-surface">
        <SessionProvider
          session={session}
          refetchInterval={60}
          refetchOnWindowFocus
          refetchWhenOffline={false}
        >
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
