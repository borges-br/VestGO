'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Package,
  MapPin,
  Clock,
  ArrowRight,
  X,
  ExternalLink,
  ClipboardList,
  Shirt,
  Footprints,
  Apple,
  Sparkles,
  HeartHandshake,
  Home,
  CheckCircle,
  Truck,
  XCircle,
} from 'lucide-react';
import type { DonationRecord, DonationStatus, OperationalBatchRecord } from '@/lib/api';
import {
  DONATION_STATUS_CONFIG,
  formatDonationDateLabel,
  DONATION_STATUS_ORDER,
} from '@/components/donations/donation-status';

interface TrackingBoardProps {
  initialDonations: DonationRecord[];
  initialBatches?: OperationalBatchRecord[];
  viewerRole: 'DONOR' | 'NGO' | 'COLLECTION_POINT' | 'ADMIN';
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number | string }>> = {
  CLOTHING: Shirt,
  SHOES: Footprints,
  FOOD: Apple,
  ACCESSORIES: Sparkles,
  TOYS: HeartHandshake,
  BAGS: Package,
  OTHER: Package,
  BED_BATH: Home,
};

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Vestuário',
  SHOES: 'Calçados',
  FOOD: 'Alimentos',
  ACCESSORIES: 'Acessórios',
  TOYS: 'Brinquedos',
  BAGS: 'Bolsas/Mochilas',
  BED_BATH: 'Cama & Banho',
  OTHER: 'Outros',
};

const CONDITION_LABELS: Record<string, string> = {
  EXCELLENT: 'Excelente (Lacrado/Novo)',
  GOOD: 'Bom estado',
};

const STAGES: { status: DonationStatus; label: string }[] = [
  { status: 'PENDING', label: 'Registrada' },
  { status: 'AT_POINT', label: 'No Ponto' },
  { status: 'IN_TRANSIT', label: 'Em Trânsito' },
  { status: 'DELIVERED', label: 'Entregue' },
  { status: 'DISTRIBUTED', label: 'Distribuída' },
];

export function TrackingBoard({
  initialDonations,
  initialBatches = [],
  viewerRole,
}: TrackingBoardProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [batchFilter, setBatchFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setBatchFilter('ALL');
    setSortBy('NEWEST');
  };

  // Extrair lotes únicos presentes nas doações para preencher o filtro se não passados
  const availableBatches = useMemo(() => {
    if (initialBatches.length > 0) return initialBatches;
    const batchMap = new Map<string, { id: string; code: string }>();
    initialDonations.forEach((donation) => {
      if (donation.operationalBatch) {
        batchMap.set(donation.operationalBatch.id, {
          id: donation.operationalBatch.id,
          code: donation.operationalBatch.code,
        });
      }
    });
    return Array.from(batchMap.values());
  }, [initialDonations, initialBatches]);

  const filteredDonations = useMemo(() => {
    let result = [...initialDonations];

    // Busca textual
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((donation) => {
        const codeMatches = donation.code.toLowerCase().includes(query);
        const labelMatches = donation.itemLabel?.toLowerCase().includes(query);
        const itemMatches = donation.items?.some((item) =>
          item.name.toLowerCase().includes(query)
        );
        const ngoMatches =
          donation.ngo?.name?.toLowerCase().includes(query) ||
          donation.ngo?.organizationName?.toLowerCase().includes(query);
        const cpMatches =
          donation.dropOffPoint?.name?.toLowerCase().includes(query) ||
          donation.dropOffPoint?.organizationName?.toLowerCase().includes(query) ||
          donation.collectionPoint?.name?.toLowerCase().includes(query) ||
          donation.collectionPoint?.organizationName?.toLowerCase().includes(query);
        const batchMatches = donation.operationalBatch?.code?.toLowerCase().includes(query);

        return codeMatches || labelMatches || itemMatches || ngoMatches || cpMatches || batchMatches;
      });
    }

    // Filtro por status
    if (statusFilter !== 'ALL') {
      result = result.filter((donation) => donation.status === statusFilter);
    }

    // Filtro por carga/lote
    if (batchFilter !== 'ALL') {
      result = result.filter((donation) => donation.operationalBatch?.id === batchFilter);
    }

    // Ordenação
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'NEWEST' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [initialDonations, search, statusFilter, batchFilter, sortBy]);

  const hasActiveFilters = search || statusFilter !== 'ALL' || batchFilter !== 'ALL' || sortBy !== 'NEWEST';

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="rounded-[2rem] bg-white p-5 shadow-card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, item, ONG, ponto de coleta ou carga..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-gray-100 bg-surface py-3 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:bg-white"
            />
          </div>

          {/* Status */}
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-gray-100 bg-surface py-3 px-4 text-sm outline-none transition-all focus:border-primary focus:bg-white appearance-none cursor-pointer"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a0aec0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundPosition: 'right 1rem center', backgroundSize: '1em', backgroundRepeat: 'no-repeat' }}
            >
              <option value="ALL">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="AT_POINT">No Ponto de Coleta</option>
              <option value="IN_TRANSIT">Em Trânsito</option>
              <option value="DELIVERED">Entregue à ONG</option>
              <option value="DISTRIBUTED">Distribuída</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>

          {/* Lotes / Cargas */}
          {availableBatches.length > 0 && (
            <div className="w-full md:w-48">
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full rounded-2xl border border-gray-100 bg-surface py-3 px-4 text-sm outline-none transition-all focus:border-primary focus:bg-white appearance-none cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a0aec0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundPosition: 'right 1rem center', backgroundSize: '1em', backgroundRepeat: 'no-repeat' }}
              >
                <option value="ALL">Todas as cargas</option>
                {availableBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    Carga {batch.code}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ordenação */}
          <div className="w-full md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'NEWEST' | 'OLDEST')}
              className="w-full rounded-2xl border border-gray-100 bg-surface py-3 px-4 text-sm outline-none transition-all focus:border-primary focus:bg-white appearance-none cursor-pointer"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a0aec0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundPosition: 'right 1rem center', backgroundSize: '1em', backgroundRepeat: 'no-repeat' }}
            >
              <option value="NEWEST">Recentes primeiro</option>
              <option value="OLDEST">Antigas primeiro</option>
            </select>
          </div>
        </div>

        {/* Resumo e Limpar Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-sm font-medium text-gray-500">
            {filteredDonations.length === 1
              ? '1 doação encontrada'
              : `${filteredDonations.length} doações encontradas`}
          </p>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary-light/80"
            >
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Doações */}
      {filteredDonations.length === 0 ? (
        <div className="rounded-[2rem] bg-white p-12 text-center shadow-card">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-bold text-primary-deeper">Nenhuma doação encontrada</p>
          <p className="mt-1 text-sm text-gray-500">
            Experimente alterar ou limpar os filtros para encontrar o que procura.
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-4 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
            >
              Ver todas as doações
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDonations.map((donation) => {
            const statusConfig = DONATION_STATUS_CONFIG[donation.status] || {
              label: donation.status,
              color: 'text-gray-600',
              bg: 'bg-gray-50',
              icon: Package,
            };
            const StatusIcon = statusConfig.icon;
            const isExpanded = !!expanded[donation.id];

            // Obter ícone da categoria principal (ou usar Package por padrão)
            const mainCategory = donation.items?.[0]?.category || 'OTHER';
            const CategoryIcon = CATEGORY_ICONS[mainCategory] || Package;

            // Contar total de peças na doação
            const totalPieces = donation.items?.reduce((sum, item) => sum + item.quantity, 0) || donation.itemCount;

            // Determinar o progresso nas 5 etapas (se não estiver cancelado)
            const currentStageIndex = STAGES.findIndex((s) => s.status === donation.status);
            const isCancelled = donation.status === 'CANCELLED';

            const originName =
              donation.dropOffPoint?.organizationName ||
              donation.dropOffPoint?.name ||
              donation.collectionPoint?.organizationName ||
              donation.collectionPoint?.name ||
              'Ponto de Coleta não informado';

            const destinationName =
              donation.ngo?.organizationName ||
              donation.ngo?.name ||
              'ONG Destinatária (Em definição)';

            return (
              <article
                key={donation.id}
                className={`rounded-[2rem] border transition-all duration-300 bg-white shadow-sm overflow-hidden ${
                  isExpanded ? 'border-primary ring-1 ring-primary/20 shadow-card-lg' : 'border-gray-100 hover:border-gray-200 hover:shadow-card'
                }`}
              >
                {/* Cabeçalho do Card (Área clicável para expandir) */}
                <div
                  onClick={() => toggleExpand(donation.id)}
                  className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-surface/30 select-none"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                      <CategoryIcon size={22} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-400 bg-surface px-2.5 py-1 rounded-lg">
                          {donation.code}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDonationDateLabel(donation.createdAt)}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base font-bold text-primary-deeper truncate">
                        {donation.itemLabel || 'Itens diversos'}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{originName}</span>
                        <ArrowRight size={12} className="text-gray-400" />
                        <span className="text-gray-500 truncate">{destinationName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-gray-50 md:border-none">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-primary-deeper">
                        {totalPieces} {totalPieces === 1 ? 'peça' : 'peças'}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.color}`}
                      >
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                      {donation.operationalBatch && (
                        <span className="rounded-full bg-primary-light/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-deeper">
                          Lote {donation.operationalBatch.code}
                        </span>
                      )}
                    </div>

                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-gray-400 hover:text-primary transition-colors">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Conteúdo Expandido */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-surface/10 p-5 sm:p-6 lg:p-7 space-y-6">
                    {/* Linha de Progresso Visual */}
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 mb-4">
                        Evolução da entrega
                      </h4>
                      {isCancelled ? (
                        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-700 border border-red-100">
                          <XCircle className="h-5 w-5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">Esta doação foi cancelada</p>
                            <p className="text-xs text-red-600 mt-0.5">
                              Ela não segue mais as etapas logísticas tradicionais da rede VestGO.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="relative pt-2 pb-6">
                          {/* Barra de Fundo */}
                          <div className="absolute left-1/10 right-1/10 top-[26px] h-1 bg-gray-100 -translate-y-1/2 z-0 hidden sm:block" />
                          {/* Barra de Progresso Real */}
                          {currentStageIndex > 0 && (
                            <div
                              className="absolute left-1/10 top-[26px] h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-500 hidden sm:block"
                              style={{
                                width: `${(currentStageIndex / (STAGES.length - 1)) * 80}%`,
                              }}
                            />
                          )}

                          {/* Etapas */}
                          <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
                            {STAGES.map((stage, idx) => {
                              const isCompleted = idx < currentStageIndex;
                              const isActive = idx === currentStageIndex;
                              const isUpcoming = idx > currentStageIndex;

                              return (
                                <div
                                  key={stage.status}
                                  className="flex sm:flex-col items-center text-left sm:text-center flex-1 gap-3 sm:gap-2"
                                >
                                  {/* Círculo do Marcador */}
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 font-semibold text-sm ${
                                      isCompleted
                                        ? 'bg-primary text-white scale-100'
                                        : isActive
                                        ? 'bg-white border-2 border-primary text-primary ring-4 ring-primary-light scale-110 shadow-sm'
                                        : 'bg-white border-2 border-gray-200 text-gray-400 scale-95'
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle size={16} className="text-white" />
                                    ) : (
                                      idx + 1
                                    )}
                                  </div>

                                  {/* Textos da Etapa */}
                                  <div className="flex flex-col sm:items-center">
                                    <p
                                      className={`text-xs font-bold ${
                                        isActive
                                          ? 'text-primary-deeper'
                                          : isCompleted
                                          ? 'text-gray-700'
                                          : 'text-gray-400'
                                      }`}
                                    >
                                      {stage.label}
                                    </p>
                                    <span className="text-[10px] text-gray-400 sm:hidden">
                                      {isCompleted
                                        ? 'Concluída'
                                        : isActive
                                        ? 'Etapa Atual'
                                        : 'Aguardando'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detalhes de Origem/Destino e Lote */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400 flex items-center gap-1.5">
                          <MapPin size={13} className="text-primary" />
                          Origem da Entrega
                        </h4>
                        <div>
                          <p className="text-sm font-semibold text-primary-deeper">{originName}</p>
                          {(donation.dropOffPoint?.address || donation.collectionPoint?.address) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {donation.dropOffPoint?.address || donation.collectionPoint?.address}
                              {donation.dropOffPoint?.neighborhood ? `, ${donation.dropOffPoint.neighborhood}` : ''}
                              {donation.dropOffPoint?.city ? ` · ${donation.dropOffPoint.city}` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400 flex items-center gap-1.5">
                          <MapPin size={13} className="text-emerald-600" />
                          Destinatário Final
                        </h4>
                        <div>
                          <p className="text-sm font-semibold text-primary-deeper">{destinationName}</p>
                          {donation.ngo?.address && (
                            <p className="text-xs text-gray-500 mt-1">
                              {donation.ngo.address}
                              {donation.ngo.neighborhood ? `, ${donation.ngo.neighborhood}` : ''}
                              {donation.ngo.city ? ` · ${donation.ngo.city}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tabela de Itens Doados */}
                    {donation.items && donation.items.length > 0 && (
                      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="bg-surface/50 py-3 px-4 border-b border-gray-100 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
                            Itens desta doação
                          </h4>
                          <span className="text-xs text-gray-400 font-medium">
                            {donation.items.length} {donation.items.length === 1 ? 'categoria' : 'categorias'}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase bg-surface/20">
                                <th className="py-3 px-4">Item</th>
                                <th className="py-3 px-4">Categoria</th>
                                <th className="py-3 px-4">Estado/Condição</th>
                                <th className="py-3 px-4 text-right">Qtd</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {donation.items.map((item) => (
                                <tr key={item.id} className="hover:bg-surface/10">
                                  <td className="py-3 px-4 font-semibold text-primary-deeper">
                                    {item.name}
                                  </td>
                                  <td className="py-3 px-4 text-xs text-gray-500 font-medium">
                                    {CATEGORY_LABELS[item.category] || item.category}
                                  </td>
                                  <td className="py-3 px-4 text-xs">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full font-bold ${
                                        item.condition === 'EXCELLENT'
                                          ? 'text-emerald-700'
                                          : 'text-amber-700'
                                      }`}
                                    >
                                      {CONDITION_LABELS[item.condition] || item.condition}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-primary-deeper">
                                    {item.quantity}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Timeline do Evento de Coleta */}
                    {donation.timeline && donation.timeline.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400 flex items-center gap-1.5">
                          <Clock size={13} />
                          Linha do tempo de eventos
                        </h4>
                        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                          {donation.timeline.map((event) => {
                            const evConfig = DONATION_STATUS_CONFIG[event.status] || {
                              color: 'text-gray-500',
                            };
                            return (
                              <div key={event.id} className="relative flex items-start gap-3">
                                {/* Marcador */}
                                <div className="absolute -left-[22px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-gray-300 ring-2 ring-gray-100" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-700">
                                    {event.description}
                                  </p>
                                  <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                                    <span>{formatDonationDateLabel(event.createdAt)}</span>
                                    {event.location && (
                                      <>
                                        <span>·</span>
                                        <span className="inline-flex items-center gap-0.5">
                                          <MapPin size={9} />
                                          {event.location}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Rodapé de Ações */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                      <Link
                        href={`/rastreio/${donation.id}`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary shadow-sm"
                      >
                        Ver Detalhes do Rastreio
                        <ExternalLink size={14} />
                      </Link>

                      {viewerRole !== 'DONOR' && (
                        <Link
                          href={
                            donation.allowedNextStatuses.length > 0
                              ? `/operacoes?actionableOnly=true&status=${donation.status}`
                              : `/operacoes?status=${donation.status}`
                          }
                          className="inline-flex items-center gap-2 rounded-2xl bg-primary-deeper px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark shadow-sm"
                        >
                          <ClipboardList size={14} />
                          Abrir em Operações
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
