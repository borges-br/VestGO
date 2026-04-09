'use client';
import { Bell, Menu } from 'lucide-react';

interface TopBarProps {
  onMenuOpen: () => void;
}

export function TopBar({ onMenuOpen }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
      <button
        onClick={onMenuOpen}
        aria-label="Abrir menu"
        className="p-2 -ml-2 rounded-xl hover:bg-surface transition-colors"
      >
        <Menu size={22} className="text-on-surface" />
      </button>

      <span className="text-lg font-bold text-primary-deeper tracking-tight">VestGO</span>

      <button aria-label="Notificações" className="p-2 -mr-2 rounded-xl hover:bg-surface transition-colors relative">
        <Bell size={22} className="text-on-surface" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
      </button>
    </header>
  );
}
