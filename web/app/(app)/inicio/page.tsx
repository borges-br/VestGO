import {
  Plus,
  Truck,
  Map,
  Clock,
  CheckCircle,
  MapPin,
  ChevronRight,
  Check,
  X,
  Navigation,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';

const quickActions = [
  { icon: Plus, label: 'Nova doação', href: '/doar', bg: 'bg-primary-light', color: 'text-primary' },
  { icon: Truck, label: 'Rastrear', href: '/rastreio', bg: 'bg-orange-50', color: 'text-orange-500' },
  { icon: Map, label: 'Ver mapa', href: '/mapa', bg: 'bg-blue-50', color: 'text-blue-500' },
  { icon: Clock, label: 'Histórico', href: '/historico', bg: 'bg-gray-100', color: 'text-gray-500' },
];

const donations = [
  {
    id: 1,
    name: 'Kit Inverno (3 Casacos)',
    ong: 'ONG Caminho da Luz',
    status: 'collected',
    statusLabel: 'Coletado',
    image: '/placeholder-clothes.jpg',
  },
  {
    id: 2,
    name: 'Tênis Esportivo Tam 42',
    ong: 'Aguardando ponto de coleta',
    status: 'bring',
    statusLabel: 'A trazer',
    image: '/placeholder-shoes.jpg',
  },
];

const tips = [
  { icon: Check, label: 'Higiene', desc: 'Lave as roupas antes de doar.', ok: true },
  { icon: Check, label: 'Estado', desc: 'Aprove o que você ainda usaria.', ok: true },
  { icon: X, label: 'O que não doar', desc: 'Íntimas, sem par ou com mofo.', ok: false },
];

const statusStyles = {
  collected: 'bg-status-collected-bg text-status-collected',
  bring: 'bg-status-bring-bg text-status-bring',
};

export default async function InicioPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'você';

  return (
    <div className="pb-2">
      {/* ── Saudação ── */}
      <section className="px-5 pt-6 pb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
          Dashboard
        </p>
        <h1 className="text-3xl font-bold text-primary-deeper">
          Olá, {firstName} 👋
        </h1>
        <p className="text-sm text-gray-400 mt-1 leading-snug">
          Bem-vindo de volta! Suas doações recentes ajudaram 12 famílias. Que tal fazer a diferença novamente hoje?
        </p>
      </section>

      {/* ── Banner de localização ── */}
      <section className="px-5 mb-5">
        <div className="bg-primary-deeper rounded-3xl p-5 text-white relative overflow-hidden min-h-[160px] flex flex-col justify-between">
          {/* Fundo decorativo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 w-48 h-48 bg-white rounded-full" />
            <div className="absolute -right-4 bottom-0 w-32 h-32 bg-white rounded-full" />
          </div>

          <div className="relative z-10">
            <h2 className="text-xl font-bold leading-tight mb-2">
              Encontre o ponto de coleta<br />mais próximo
            </h2>
            <p className="text-primary-muted text-xs leading-relaxed mb-4">
              Mapeamos centenas de ONGs verificadas prontas para receber suas doações com segurança.
            </p>
            <Link
              href="/mapa"
              className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-dark transition-colors active:scale-95"
            >
              <Navigation size={14} />
              Localizar Agora
            </Link>
          </div>
        </div>
      </section>

      {/* ── Ações rápidas ── */}
      <section className="px-5 mb-6">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Ações rápidas
        </p>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(({ icon: Icon, label, href, bg, color }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center transition-transform group-active:scale-95`}>
                <Icon size={20} className={color} />
              </div>
              <span className="text-[11px] text-gray-500 text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Doação em andamento ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Minha doação em andamento
        </p>
        <div className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface">Coletado pela ONG</p>
            <p className="text-xs text-gray-400 truncate">ONG Caminho da Luz • há 2 dias</p>
          </div>
          <Link
            href="/rastreio"
            className="text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-xl flex-shrink-0 hover:bg-primary-dark transition-colors"
          >
            Acompanhar
          </Link>
        </div>
      </section>

      {/* ── Ponto Recomendado ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
            Ponto recomendado
          </p>
          <span className="text-xs text-gray-400">Belo Horizonte, MG</span>
        </div>
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {/* Mapa placeholder */}
          <div className="h-40 bg-gradient-to-br from-primary-light to-[#c8eae7] flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23006a62\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M0 0h40v1H0zm0 20h40v1H0zm20 0V0h1v40h-1z\'/%3E%3C/g%3E%3C/svg%3E")',
              }}
            />
            <div className="bg-primary w-10 h-10 rounded-full flex items-center justify-center shadow-lg relative z-10">
              <MapPin size={18} className="text-white" />
            </div>
          </div>
          <div className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-on-surface">Centro de Coleta Sul</p>
              <p className="text-xs text-gray-400">1.8km • Aberto agora</p>
            </div>
            <Link href="/mapa" className="text-primary">
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Últimas doações ── */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
            Minhas últimas doações
          </p>
          <Link href="/doacoes" className="text-xs font-semibold text-primary">
            Ver tudo
          </Link>
        </div>
        <div className="space-y-2">
          {donations.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl p-3 shadow-card flex items-center gap-3">
              {/* Imagem placeholder */}
              <div className="w-12 h-12 bg-primary-light rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                <div className="bg-gradient-to-br from-primary-light to-primary-muted w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">{d.name}</p>
                <p className="text-xs text-gray-400 truncate">{d.ong}</p>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  statusStyles[d.status as keyof typeof statusStyles]
                }`}
              >
                {d.statusLabel}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dicas de doação ── */}
      <section className="px-5 mb-2">
        <div className="bg-primary-deeper rounded-3xl p-5 text-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_#006a62]" />
            <p className="font-bold text-base">Dicas de doação</p>
          </div>
          <div className="space-y-3">
            {tips.map(({ icon: Icon, label, desc, ok }) => (
              <div key={label} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${ok ? 'bg-primary' : 'bg-red-500'}`}>
                  <Icon size={12} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-primary-muted leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}