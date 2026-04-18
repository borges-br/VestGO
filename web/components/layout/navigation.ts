import {
  ClipboardList,
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

const DONOR_PRIMARY_NAV_ITEMS: NavigationItem[] = [
  {
    href: '/inicio',
    label: 'Inicio',
    mobileLabel: 'Inicio',
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
    label: 'Nova doacao',
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

const OPERATIONAL_PRIMARY_NAV_ITEMS: NavigationItem[] = [
  {
    href: '/inicio',
    label: 'Inicio',
    mobileLabel: 'Inicio',
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
    href: '/operacoes',
    label: 'Operacoes',
    mobileLabel: 'Fila',
    icon: ClipboardList,
    exact: true,
  },
  {
    href: '/rastreio',
    label: 'Rastreio',
    mobileLabel: 'Rastreio',
    icon: Truck,
  },
];

const ADMIN_PRIMARY_NAV_ITEMS: NavigationItem[] = [
  {
    href: '/inicio',
    label: 'Inicio',
    mobileLabel: 'Inicio',
    icon: Home,
    exact: true,
  },
  {
    href: '/admin/perfis',
    label: 'Governanca',
    mobileLabel: 'Governanca',
    icon: Shield,
    matchers: ['/admin/perfis'],
  },
  {
    href: '/operacoes',
    label: 'Operacoes',
    mobileLabel: 'Fila',
    icon: ClipboardList,
    exact: true,
  },
  {
    href: '/mapa',
    label: 'Mapa publico',
    mobileLabel: 'Mapa',
    icon: Map,
    matchers: ['/mapa', '/pontos'],
  },
];

export const UTILITY_NAV_ITEMS: NavigationItem[] = [
  {
    href: '/perfil',
    label: 'Perfil',
    icon: User,
    exact: true,
  },
  {
    href: '/configuracoes',
    label: 'Configuracoes',
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

export function getUtilityNavItems(role: string) {
  if (role === 'DONOR') {
    return UTILITY_NAV_ITEMS;
  }

  const items: NavigationItem[] =
    role === 'ADMIN'
      ? [...UTILITY_NAV_ITEMS]
      : [
          {
            href: '/operacoes',
            label: 'Operacoes',
            icon: ClipboardList,
            exact: true,
          },
          ...UTILITY_NAV_ITEMS,
        ];

  if (role === 'ADMIN') {
    items.unshift({
      href: '/admin/perfis',
      label: 'Governanca',
      icon: Shield,
      exact: false, // matches child routes too
    });
  }

  return items;
}

export const ROLE_LABELS: Record<string, string> = {
  DONOR: 'Doador',
  COLLECTION_POINT: 'Ponto de Coleta',
  NGO: 'ONG Parceira',
  ADMIN: 'Administrador',
};

export function getPrimaryNavItems(role: string) {
  if (role === 'ADMIN') {
    return ADMIN_PRIMARY_NAV_ITEMS;
  }

  if (role === 'COLLECTION_POINT' || role === 'NGO') {
    return OPERATIONAL_PRIMARY_NAV_ITEMS;
  }

  return DONOR_PRIMARY_NAV_ITEMS;
}

export function getMobileNavItems(role: string) {
  return getPrimaryNavItems(role);
}

export function isNavigationItemActive(pathname: string, item: NavigationItem) {
  const matchers = item.matchers ?? [item.href];

  return matchers.some((matcher) => {
    if (item.exact) {
      return pathname === matcher;
    }

    return pathname === matcher || pathname.startsWith(`${matcher}/`);
  });
}
