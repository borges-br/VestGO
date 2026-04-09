import {
  HelpCircle,
  Home,
  Map,
  Plus,
  Settings,
  Shield,
  Truck,
  User,
  type LucideIcon,
} from 'lucide-react';

export type NavigationItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  matchers?: string[];
  exact?: boolean;
};

export const PRIMARY_NAV_ITEMS: NavigationItem[] = [
  {
    href: '/inicio',
    label: 'Início',
    mobileLabel: 'Início',
    icon: Home,
    exact: true,
  },
  {
    href: '/mapa',
    label: 'Explorar pontos',
    mobileLabel: 'Explorar',
    icon: Map,
    matchers: ['/mapa', '/pontos'],
  },
  {
    href: '/doar',
    label: 'Nova doação',
    mobileLabel: 'Doar',
    icon: Plus,
    exact: true,
  },
  {
    href: '/rastreio',
    label: 'Rastreio',
    mobileLabel: 'Rastreio',
    icon: Truck,
  },
];

export const MOBILE_NAV_ITEMS = PRIMARY_NAV_ITEMS;

export const UTILITY_NAV_ITEMS: NavigationItem[] = [
  {
    href: '/perfil',
    label: 'Perfil',
    icon: User,
    exact: true,
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    exact: true,
  },
  {
    href: '/perfil/privacidade',
    label: 'Privacidade',
    icon: Shield,
  },
  {
    href: '/suporte',
    label: 'Suporte',
    icon: HelpCircle,
  },
];

export const ROLE_LABELS: Record<string, string> = {
  DONOR: 'Doador',
  COLLECTION_POINT: 'Ponto de Coleta',
  NGO: 'ONG Parceira',
  ADMIN: 'Administrador',
};

export function isNavigationItemActive(pathname: string, item: NavigationItem) {
  const matchers = item.matchers ?? [item.href];

  return matchers.some((matcher) => {
    if (item.exact) {
      return pathname === matcher;
    }

    return pathname === matcher || pathname.startsWith(`${matcher}/`);
  });
}
