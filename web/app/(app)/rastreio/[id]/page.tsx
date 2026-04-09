'use client';
import {
  CheckCircle, Clock, Package, Truck, XCircle,
  ArrowLeft, MapPin, Info, Undo2,
} from 'lucide-react';
import Link from 'next/link';

type StatusKey = 'PENDING' | 'AT_POINT' | 'IN_TRANSIT' | 'DELIVERED' | 'DISTRIBUTED' | 'CANCELLED';

const STATUS_ORDER: StatusKey[] = ['PENDING', 'AT_POINT', 'IN_TRANSIT', 'DELIVERED', 'DISTRIBUTED'];

const STATUS_CONFIG: Record<StatusKey, {
  label: string;
  description: string;
  color: string;
  bg: string;
  icon: typeof CheckCircle;
}> = {
  PENDING:     { label: 'Pendente',     description: 'Doação registrada. Aguardando entrega no ponto de coleta.', color: 'text-amber-600',  bg: 'bg-amber-50',      icon: Clock },
  AT_POINT:    { label: 'No ponto',     description: 'Item recebido pelo ponto de coleta e aguardando triagem.',  color: 'text-blue-600',   bg: 'bg-blue-50',       icon: Package },
  IN_TRANSIT:  { label: 'Em trânsito',  description: 'A doação está sendo transportada para a ONG parceira.',   color: 'text-indigo-600', bg: 'bg-indigo-50',     icon: Truck },
  DELIVERED:   { label: 'Entregue',     description: 'Chegou à ONG! A distribuição será feita em breve.',       color: 'text-primary',    bg: 'bg-primary-light', icon: CheckCircle },
  DISTRIBUTED: { label: 'Distribuído',  description: 'Doação distribuída para famílias em situação de vulnerabilidade. Obrigado!', color: 'text-primary', bg: 'bg-primary-light', icon: CheckCircle },
  CANCELLED:   { label: 'Cancelado',    description: 'Esta doação foi cancelada.',                              color: 'text-red-500',    bg: 'bg-red-50',        icon: XCircle },
};

// Mock — será substituído por fetch GET /donations/:id (Milestone 3)
const MOCK_DONATIONS: Record<string, {
  id: string;
  code: string;
  status: StatusKey;
  items: { name: string; category: string; quantity: string; condition: string }[];
  collectionPoint: { name: string; address: string };
  timeline: { status: StatusKey; timestamp: string; note?: string }[];
  createdAt: string;
}> = {
  '1': {
    id: '1',
    code: 'VGO-001',
    status: 'DELIVERED',
    items: [{ name: 'Kit Inverno (3 Casacos)', category: 'Roupas adultas', quantity: '3 peças', condition: 'Em ótimo estado' }],
    collectionPoint: { name: 'ONG Caminho da Luz', address: 'Av. Paulista, 900 — Bela Vista' },
    timeline: [
      { status: 'PENDING',    timestamp: '06 Abr, 10:32', note: 'Doação registrada pelo doador.' },
      { status: 'AT_POINT',   timestamp: '06 Abr, 14:10', note: 'Recebido pelo voluntário João S.' },
      { status: 'IN_TRANSIT', timestamp: '07 Abr, 09:00', note: 'Saiu para entrega com ONG Caminho da Luz.' },
      { status: 'DELIVERED',  timestamp: '07 Abr, 16:45', note: 'Entregue e triagem realizada com sucesso.' },
    ],
    createdAt: '06 Abr 2026',
  },
  '2': {
    id: '2',
    code: 'VGO-002',
    status: 'PENDING',
    items: [{ name: 'Tênis Esportivo Tam 42', category: 'Calçados', quantity: '1 par', condition: 'Usado mas conservado' }],
    collectionPoint: { name: 'Hub Central Pinheiros', address: 'Rua dos Pinheiros, 1234 — Pinheiros' },
    timeline: [
      { status: 'PENDING', timestamp: '07 Abr, 18:05', note: 'Doação registrada. Aguardando entrega.' },
    ],
    createdAt: '07 Abr 2026',
  },
};

export default function RastreioDetalhePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const donation = MOCK_DONATIONS[id];

  if (!donation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
        <Package size={40} className="text-gray-200 mb-4" />
        <p className="font-semibold text-gray-400">Doação não encontrada</p>
        <Link href="/rastreio" className="mt-4 text-sm font-semibold text-primary hover:underline">
          ← Voltar ao rastreio
        </Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[donation.status];
  const StatusIcon = cfg.icon;
  const currentIdx = STATUS_ORDER.indexOf(donation.status);
  const isCancelled = donation.status === 'CANCELLED';

  return (
    <div className="pb-2">
      {/* ── Header ── */}
      <section className="px-5 pt-6 pb-4">
        <Link
          href="/rastreio"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-4 hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar ao rastreio
        </Link>
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
          Detalhes
        </p>
        <h1 className="text-2xl font-bold text-primary-deeper">{donation.code}</h1>
        <p className="text-xs text-gray-400 mt-0.5">Registrada em {donation.createdAt}</p>
      </section>

      {/* ── Status atual ── */}
      <section className="px-5 mb-5">
        <div className={`rounded-3xl p-5 ${cfg.bg} flex items-start gap-4`}>
          <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <StatusIcon size={26} className={cfg.color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-lg ${cfg.color}`}>{cfg.label}</p>
            <p className="text-sm text-gray-500 mt-0.5 leading-snug">{cfg.description}</p>
          </div>
        </div>
      </section>

      {/* ── Barra de progresso (apenas se não cancelado) ── */}
      {!isCancelled && (
        <section className="px-5 mb-5">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
            Progresso
          </p>
          <div className="bg-white rounded-2xl shadow-card p-4">
            {STATUS_ORDER.map((s, i) => {
              const stepCfg = STATUS_CONFIG[s];
              const StepIcon = stepCfg.icon;
              const done = i <= currentIdx;
              const isCurrentStep = i === currentIdx;
              const isLast = i === STATUS_ORDER.length - 1;
              return (
                <div key={s} className="flex gap-3">
                  {/* Linha vertical + círculo */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      done
                        ? isCurrentStep
                          ? 'bg-primary ring-4 ring-primary/20'
                          : 'bg-primary'
                        : 'bg-gray-100'
                    }`}>
                      <StepIcon size={15} className={done ? 'text-white' : 'text-gray-300'} />
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 ${i < currentIdx ? 'bg-primary' : 'bg-gray-100'}`} style={{ minHeight: 24 }} />
                    )}
                  </div>

                  {/* Texto */}
                  <div className={`pb-4 ${isLast ? '' : ''}`}>
                    <p className={`text-sm font-bold ${done ? 'text-on-surface' : 'text-gray-300'}`}>
                      {stepCfg.label}
                    </p>
                    {isCurrentStep && (
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{stepCfg.description}</p>
                    )}
                    {/* Timestamp do step na timeline */}
                    {donation.timeline.find((t) => t.status === s) && (
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        {donation.timeline.find((t) => t.status === s)?.timestamp}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Timeline de eventos ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Histórico de eventos
        </p>
        <div className="space-y-2">
          {[...donation.timeline].reverse().map((event, i) => {
            const evCfg = STATUS_CONFIG[event.status];
            const EvIcon = evCfg.icon;
            return (
              <div key={i} className="bg-white rounded-2xl shadow-card p-4 flex items-start gap-3">
                <div className={`w-8 h-8 ${evCfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <EvIcon size={15} className={evCfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface">{evCfg.label}</p>
                  {event.note && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{event.note}</p>}
                  <p className="text-[10px] text-gray-300 mt-1">{event.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Ponto de coleta ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Ponto de coleta
        </p>
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {/* Mini mapa placeholder */}
          <div className="h-28 bg-gradient-to-br from-primary-light to-[#c8eae7] flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23006a62\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M0 0h40v1H0zm0 20h40v1H0zm20 0V0h1v40h-1z\'/%3E%3C/g%3E%3C/svg%3E")',
              }}
            />
            <div className="bg-primary w-9 h-9 rounded-full flex items-center justify-center shadow-lg relative z-10">
              <MapPin size={16} className="text-white" />
            </div>
          </div>
          <div className="p-4">
            <p className="font-semibold text-sm text-on-surface">{donation.collectionPoint.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{donation.collectionPoint.address}</p>
            <Link
              href="/mapa"
              className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            >
              <MapPin size={12} />
              Ver no mapa
            </Link>
          </div>
        </div>
      </section>

      {/* ── Itens doados ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Itens doados
        </p>
        <div className="space-y-2">
          {donation.items.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.category} • {item.quantity}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Info size={11} className="text-gray-300" />
                  <p className="text-[11px] text-gray-400">{item.condition}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cancelar (apenas se PENDING) ── */}
      {donation.status === 'PENDING' && (
        <section className="px-5 mb-4">
          <button className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 font-semibold py-4 rounded-2xl hover:bg-red-100 transition-colors text-sm active:scale-[0.97]">
            <Undo2 size={16} />
            Cancelar esta doação
          </button>
        </section>
      )}
    </div>
  );
}
