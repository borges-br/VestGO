import {
  CheckCircle, Clock, Truck, Package, XCircle, ChevronRight, Plus
} from 'lucide-react';
import Link from 'next/link';

type StatusKey = 'PENDING' | 'AT_POINT' | 'IN_TRANSIT' | 'DELIVERED' | 'DISTRIBUTED' | 'CANCELLED';

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  PENDING:     { label: 'Pendente',     color: 'text-amber-600',  bg: 'bg-amber-50',   icon: Clock },
  AT_POINT:    { label: 'No ponto',     color: 'text-blue-600',   bg: 'bg-blue-50',    icon: Package },
  IN_TRANSIT:  { label: 'Em trânsito',  color: 'text-indigo-600', bg: 'bg-indigo-50',  icon: Truck },
  DELIVERED:   { label: 'Entregue',     color: 'text-primary',    bg: 'bg-primary-light', icon: CheckCircle },
  DISTRIBUTED: { label: 'Distribuído',  color: 'text-primary',    bg: 'bg-primary-light', icon: CheckCircle },
  CANCELLED:   { label: 'Cancelado',    color: 'text-red-500',    bg: 'bg-red-50',     icon: XCircle },
};

// Placeholder até o endpoint GET /donations existir (Milestone 3)
const mockDonations = [
  {
    id: '1',
    code: 'VGO-001',
    status: 'DELIVERED' as StatusKey,
    items: [{ name: 'Kit Inverno (3 Casacos)', category: 'CLOTHING' }],
    collectionPointName: 'ONG Caminho da Luz',
    createdAt: '2026-04-06',
  },
  {
    id: '2',
    code: 'VGO-002',
    status: 'PENDING' as StatusKey,
    items: [{ name: 'Tênis Esportivo Tam 42', category: 'SHOES' }],
    collectionPointName: 'Aguardando ponto de coleta',
    createdAt: '2026-04-07',
  },
];

export default function RastreioPage() {
  return (
    <div className="pb-2">
      {/* ── Header ── */}
      <section className="px-5 pt-6 pb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
          Rastreio
        </p>
        <h1 className="text-3xl font-bold text-primary-deeper">Minhas doações</h1>
        <p className="text-sm text-gray-400 mt-1">Acompanhe o status de cada doação.</p>
      </section>

      {/* ── Resumo rápido ── */}
      <section className="px-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: mockDonations.length, color: 'text-on-surface' },
            { label: 'Em andamento', value: mockDonations.filter(d => !['DELIVERED','DISTRIBUTED','CANCELLED'].includes(d.status)).length, color: 'text-blue-600' },
            { label: 'Concluídas', value: mockDonations.filter(d => ['DELIVERED','DISTRIBUTED'].includes(d.status)).length, color: 'text-primary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl p-3 shadow-card text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Lista de doações ── */}
      <section className="px-5 mb-5">
        {mockDonations.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="text-gray-200 mx-auto mb-4" />
            <p className="text-base font-semibold text-gray-400">Nenhuma doação ainda</p>
            <p className="text-sm text-gray-300 mt-1 mb-6">Comece sua primeira doação agora!</p>
            <Link
              href="/doar"
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-2xl"
            >
              <Plus size={16} />
              Nova doação
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {mockDonations.map((donation) => {
              const cfg = STATUS_CONFIG[donation.status];
              const Icon = cfg.icon;
              return (
                <Link
                  key={donation.id}
                  href={`/rastreio/${donation.id}`}
                  className="block bg-white rounded-2xl p-4 shadow-card hover:shadow-card-lg transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-on-surface truncate">
                            {donation.items[0].name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {donation.collectionPointName}
                          </p>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Mini timeline */}
                      <div className="flex items-center gap-1 mt-3">
                        {(['PENDING', 'AT_POINT', 'IN_TRANSIT', 'DELIVERED'] as StatusKey[]).map((s, i) => {
                          const statuses: StatusKey[] = ['PENDING', 'AT_POINT', 'IN_TRANSIT', 'DELIVERED', 'DISTRIBUTED'];
                          const currentIdx = statuses.indexOf(donation.status);
                          const stepIdx = statuses.indexOf(s);
                          const done = stepIdx <= currentIdx;
                          return (
                            <div key={s} className="flex items-center flex-1">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-primary' : 'bg-gray-200'}`} />
                              {i < 3 && <div className={`flex-1 h-px ${done && stepIdx < currentIdx ? 'bg-primary' : 'bg-gray-200'}`} />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-gray-400">Cod: {donation.code}</p>
                        <p className="text-[10px] text-gray-400">{donation.createdAt}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Botão nova doação ── */}
      <section className="px-5">
        <Link
          href="/doar"
          className="flex items-center justify-center gap-2 w-full bg-primary-deeper text-white font-semibold py-4 rounded-2xl hover:bg-primary-dark transition-colors active:scale-[0.97]"
        >
          <Plus size={18} />
          Registrar nova doação
        </Link>
      </section>
    </div>
  );
}
