// web/app/(app)/mapa/page.tsx
// Rota /mapa dentro do grupo (app) — recebe TopBar + Sidebar + BottomNav do AppShell.
// Acessível por usuários autenticados E não autenticados (sem proteção de middleware).
import { MapaPageContent } from '@/components/map/mapa-page-content';

export default function MapaAppPage() {
  return <MapaPageContent />;
}
