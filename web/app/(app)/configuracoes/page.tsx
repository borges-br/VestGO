'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme, type ThemePref } from '@/components/layout/theme-provider';
import {
  Bell,
  ChevronRight,
  Download,
  HelpCircle,
  Mail,
  Moon,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  UserCircle2,
} from 'lucide-react';

type NotificationPrefs = {
  push: boolean;
  email: boolean;
  trackingUpdates: boolean;
  newsletters: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  push: true,
  email: true,
  trackingUpdates: true,
  newsletters: false,
};

const NOTIF_STORAGE_KEY = 'vestgo:notification-preferences';
const RADIUS_STORAGE_KEY = 'vestgo:donation-radius';

const DONOR_ONLY_LINK = {
  href: '/configuracoes/perfil',
  icon: UserCircle2,
  label: 'Perfil complementar',
  description: 'Data de nascimento, cidade e interesses de doação.',
};

const SHARED_LINKS = [
  {
    href: '/perfil/privacidade',
    icon: Shield,
    label: 'Privacidade e segurança',
    description: 'Senha, sessões ativas, 2FA e controle sobre seus dados.',
  },
  {
    href: '/suporte',
    icon: HelpCircle,
    label: 'Central de ajuda',
    description: 'FAQ, contato direto e tutoriais da plataforma.',
  },
];

export default function ConfiguracoesPage() {
  const { theme, setTheme: applyTheme } = useTheme();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const quickLinks = useMemo(
    () => (role === 'DONOR' ? [DONOR_ONLY_LINK, ...SHARED_LINKS] : SHARED_LINKS),
    [role],
  );
  const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);
  const [radius, setRadius] = useState(10);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedNotif = window.localStorage.getItem(NOTIF_STORAGE_KEY);
    if (storedNotif) {
      try {
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...JSON.parse(storedNotif) });
      } catch {
        /* noop */
      }
    }

    const storedRadius = window.localStorage.getItem(RADIUS_STORAGE_KEY);
    if (storedRadius) {
      const parsed = Number.parseInt(storedRadius, 10);
      if (Number.isFinite(parsed)) setRadius(parsed);
    }
  }, []);

  function persistTheme(next: ThemePref) {
    applyTheme(next); // ThemeProvider handles localStorage + DOM class
    flashSaved('Aparência atualizada');
  }

  function persistNotifications(next: NotificationPrefs) {
    setNotifications(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
    }
    flashSaved('Notificações atualizadas');
  }

  function persistRadius(value: number) {
    setRadius(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RADIUS_STORAGE_KEY, String(value));
    }
  }

  function flashSaved(message: string) {
    setSaved(message);
    window.setTimeout(() => setSaved(null), 1800);
  }

  return (
    <div className="pb-2">
      <section className="px-5 pb-4 pt-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Ajustes
        </p>
        <h1 className="text-3xl font-bold text-primary-deeper dark:text-white">Configurações</h1>
      </section>

      {saved && (
        <div className="mx-5 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {saved}
        </div>
      )}

      <section className="mb-6 px-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Aparência
        </h2>
        <div className="rounded-3xl bg-white p-5 shadow-card dark:bg-surface-inkSoft dark:shadow-none">
          <p className="text-sm font-semibold text-on-surface dark:text-gray-100">Tema do aplicativo</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Escolha como o VestGO deve se apresentar em seu dispositivo.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(
              [
                { id: 'light' as const, label: 'Claro', icon: Sun },
                { id: 'dark' as const, label: 'Escuro', icon: Moon },
                { id: 'system' as const, label: 'Sistema', icon: Smartphone },
              ]
            ).map(({ id, label, icon: Icon }) => {
              const active = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => persistTheme(id)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    active
                      ? 'border-primary bg-primary-light text-primary-deeper dark:bg-primary/20 dark:text-primary-muted'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-primary hover:text-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mb-6 px-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Notificações
        </h2>
        <div className="rounded-3xl bg-white shadow-card dark:bg-surface-inkSoft dark:shadow-none">
          <ToggleRow
            icon={Bell}
            title="Push no celular"
            description="Receba alertas quando o status da doação mudar."
            checked={notifications.push}
            onChange={(value) => persistNotifications({ ...notifications, push: value })}
          />
          <ToggleRow
            icon={Mail}
            title="E-mails transacionais"
            description="Confirmações de doação e lembretes importantes."
            checked={notifications.email}
            onChange={(value) => persistNotifications({ ...notifications, email: value })}
          />
          <ToggleRow
            icon={Bell}
            title="Atualizações de rastreio"
            description="Avisos em cada etapa até a entrega final."
            checked={notifications.trackingUpdates}
            onChange={(value) =>
              persistNotifications({ ...notifications, trackingUpdates: value })
            }
          />
          <ToggleRow
            icon={Mail}
            title="Novidades e campanhas"
            description="Dicas, histórias de impacto e campanhas sazonais."
            checked={notifications.newsletters}
            onChange={(value) => persistNotifications({ ...notifications, newsletters: value })}
            last
          />
        </div>
      </section>

      <section className="mb-6 px-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Preferências de doação
        </h2>
        <div className="rounded-3xl bg-white p-5 shadow-card dark:bg-surface-inkSoft dark:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">
                Raio de busca de pontos
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Distância máxima ao buscar pontos próximos no mapa.
              </p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
              {radius} km
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={radius}
            onChange={(event) => persistRadius(Number.parseInt(event.target.value, 10))}
            onMouseUp={() => flashSaved('Raio de busca salvo')}
            onTouchEnd={() => flashSaved('Raio de busca salvo')}
            className="mt-4 w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-[11px] text-gray-400">
            <span>1 km</span>
            <span>25 km</span>
            <span>50 km</span>
          </div>
        </div>
      </section>

      <section className="mb-6 px-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Dados da conta
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => flashSaved('Solicitação de exportação registrada')}
            className="flex items-start gap-3 rounded-3xl bg-white p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-lg dark:bg-surface-inkSoft dark:shadow-none"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <Download size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">Exportar meus dados</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                Receba por e-mail um arquivo com histórico de doações e pontos.
              </p>
            </div>
          </button>

          <Link
            href="/perfil/privacidade"
            className="flex items-start gap-3 rounded-3xl bg-white p-5 shadow-card dark:bg-surface-inkSoft dark:shadow-none transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Trash2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">Encerrar conta</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                Revise suas informações antes de remover permanentemente o acesso.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section className="mb-6 px-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Ajuda e privacidade
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {quickLinks.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="rounded-3xl bg-white p-5 shadow-card dark:bg-surface-inkSoft dark:shadow-none transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-on-surface dark:text-gray-100">{label}</p>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-400">{description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8 px-5">
        <p className="text-center text-[11px] uppercase tracking-widest text-gray-300">
          VestGO v1.0.0
        </p>
      </section>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  last,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-4 px-5 py-4 ${
        last ? '' : 'border-b border-gray-100 dark:border-white/5'
      }`}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface dark:text-gray-100">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-1 inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-200 dark:bg-white/15'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
