import type { Metadata } from 'next';
import '@/styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'VestGO — Doar com propósito',
  description: 'Rastreie sua doação do início ao impacto final.',
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
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
