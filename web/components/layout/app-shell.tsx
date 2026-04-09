'use client';
import { useState, useEffect } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Trava o scroll do body enquanto o sidebar estiver aberto
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar onMenuOpen={() => setSidebarOpen(true)} />
      <main className="flex-1 pb-20 max-w-sm mx-auto w-full overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
