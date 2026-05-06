'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  PauseCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  createSeasonalCampaign,
  deleteSeasonalCampaign,
  getSeasonalCampaigns,
  updateSeasonalCampaign,
  type ItemCategory,
  type SeasonalCampaign,
  type SeasonalCampaignInput,
} from '@/lib/api';
import { formatDateTimeLabel } from '@/lib/date-time';

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  TOYS: 'Brinquedos',
  FOOD: 'Alimentos',
  OTHER: 'Outros',
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS) as ItemCategory[];

const PHASE_LABELS = {
  INACTIVE: 'Inativa',
  UPCOMING: 'Futura',
  RUNNING: 'Em andamento',
  ENDED: 'Encerrada',
} as const;

const PHASE_STYLES = {
  INACTIVE: 'bg-gray-100 text-gray-600',
  UPCOMING: 'bg-sky-50 text-sky-700',
  RUNNING: 'bg-primary-light text-primary',
  ENDED: 'bg-amber-50 text-amber-700',
} as const;

type CampaignPhase = keyof typeof PHASE_LABELS;

type CampaignFormState = {
  title: string;
  slug: string;
  description: string;
  startsAt: string;
  endsAt: string;
  categories: ItemCategory[];
  multiplier: string;
  active: boolean;
};

type FormErrors = Partial<Record<keyof CampaignFormState | 'period', string>>;

const EMPTY_FORM: CampaignFormState = {
  title: '',
  slug: '',
  description: '',
  startsAt: '',
  endsAt: '',
  categories: [],
  multiplier: '2',
  active: true,
};

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toBrazilianDateTime(value: string) {
  return formatDateTimeLabel(value);
}

function getCampaignPhase(campaign: SeasonalCampaign): CampaignPhase {
  if (!campaign.active) {
    return 'INACTIVE';
  }

  const now = Date.now();
  const startsAt = new Date(campaign.startsAt).getTime();
  const endsAt = new Date(campaign.endsAt).getTime();

  if (now < startsAt) {
    return 'UPCOMING';
  }

  if (now > endsAt) {
    return 'ENDED';
  }

  return 'RUNNING';
}

function campaignToForm(campaign: SeasonalCampaign): CampaignFormState {
  return {
    title: campaign.title,
    slug: campaign.slug,
    description: campaign.description ?? '',
    startsAt: toDatetimeLocal(campaign.startsAt),
    endsAt: toDatetimeLocal(campaign.endsAt),
    categories: campaign.categories,
    multiplier: String(campaign.multiplier),
    active: campaign.active,
  };
}

function validateForm(form: CampaignFormState): FormErrors {
  const errors: FormErrors = {};
  const startsAt = new Date(form.startsAt).getTime();
  const endsAt = new Date(form.endsAt).getTime();
  const multiplier = Number(form.multiplier);

  if (!form.title.trim()) {
    errors.title = 'Informe um titulo.';
  }

  if (!form.slug.trim()) {
    errors.slug = 'Informe um slug.';
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = 'Use kebab-case em minusculas, sem espacos.';
  }

  if (!form.startsAt) {
    errors.startsAt = 'Informe a data de inicio.';
  }

  if (!form.endsAt) {
    errors.endsAt = 'Informe a data final.';
  }

  if (form.startsAt && form.endsAt && endsAt <= startsAt) {
    errors.period = 'A data final precisa ser maior que a data inicial.';
  }

  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    errors.multiplier = 'O multiplicador deve ser maior que zero.';
  }

  return errors;
}

function toPayload(form: CampaignFormState): SeasonalCampaignInput {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || null,
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    categories: form.categories,
    multiplier: Number(form.multiplier),
    active: form.active,
  };
}

function StatCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-primary-deeper">
        {value.toLocaleString('pt-BR')}
      </p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>
    </div>
  );
}

function CategoryPill({ category }: { category: ItemCategory }) {
  return (
    <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-gray-600">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export default function AdminSeasonalCampaignsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const accessToken = session?.user?.accessToken;
  const role = session?.user?.role;

  const [campaigns, setCampaigns] = useState<SeasonalCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<SeasonalCampaign | null>(null);
  const [form, setForm] = useState<CampaignFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getSeasonalCampaigns(accessToken);
      setCampaigns(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nao foi possivel carregar campanhas sazonais agora.',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated' && role !== 'ADMIN') {
      router.replace('/inicio');
      return;
    }

    if (status === 'authenticated') {
      void fetchCampaigns();
    }
  }, [fetchCampaigns, role, router, status]);

  const stats = useMemo(() => {
    const phases = campaigns.map(getCampaignPhase);

    return {
      total: campaigns.length,
      active: campaigns.filter((campaign) => campaign.active).length,
      upcoming: phases.filter((phase) => phase === 'UPCOMING').length,
      ended: phases.filter((phase) => phase === 'ENDED').length,
    };
  }, [campaigns]);

  function openCreateForm() {
    setEditingCampaign(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSlugTouched(false);
    setNotice(null);
    setFormOpen(true);
  }

  function openEditForm(campaign: SeasonalCampaign) {
    setEditingCampaign(campaign);
    setForm(campaignToForm(campaign));
    setFormErrors({});
    setSlugTouched(true);
    setNotice(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (submitting) return;
    setFormOpen(false);
  }

  function updateTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: !editingCampaign && !slugTouched ? slugify(value) : current.slug,
    }));
  }

  function toggleCategory(category: ItemCategory) {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) return;

    const nextErrors = validateForm(form);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingCampaign) {
        await updateSeasonalCampaign(editingCampaign.id, toPayload(form), accessToken);
        setNotice('Campanha atualizada com sucesso.');
      } else {
        await createSeasonalCampaign(toPayload(form), accessToken);
        setNotice('Campanha criada com sucesso.');
      }

      setFormOpen(false);
      await fetchCampaigns();
    } catch (err) {
      setFormErrors({
        period:
          err instanceof Error
            ? err.message
            : 'Nao foi possivel salvar a campanha agora.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(campaign: SeasonalCampaign) {
    if (!accessToken) return;

    setActingId(campaign.id);
    setError(null);

    try {
      await updateSeasonalCampaign(campaign.id, { active: !campaign.active }, accessToken);
      setNotice(campaign.active ? 'Campanha desativada.' : 'Campanha ativada.');
      await fetchCampaigns();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nao foi possivel alterar o status da campanha.',
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleDelete(campaign: SeasonalCampaign) {
    if (!accessToken) return;

    const actionLabel = campaign.donationsCount > 0 ? 'desativar' : 'excluir';
    const confirmed = window.confirm(
      `Deseja ${actionLabel} a campanha "${campaign.title}"?`,
    );

    if (!confirmed) return;

    setActingId(campaign.id);
    setError(null);

    try {
      const response = await deleteSeasonalCampaign(campaign.id, accessToken);
      setNotice(
        response.deactivated
          ? 'Campanha possui doacoes vinculadas e foi desativada.'
          : 'Campanha excluida com sucesso.',
      );
      await fetchCampaigns();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nao foi possivel remover a campanha.',
      );
    } finally {
      setActingId(null);
    }
  }

  if (
    status === 'loading' ||
    status === 'unauthenticated' ||
    (status === 'authenticated' && role !== 'ADMIN')
  ) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <Sparkles size={13} />
            Gamificacao
          </div>
          <h1 className="text-2xl font-bold text-primary-deeper sm:text-3xl">
            Campanhas Sazonais
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Gerencie campanhas que ativam conquistas sazonais e preparam a base para
            multiplicadores futuros de impacto.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary-deeper px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary"
        >
          <Plus size={17} />
          Nova campanha
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ativas" value={stats.active} detail="Com chave ativa no backend" />
        <StatCard label="Futuras" value={stats.upcoming} detail="Ativas, mas ainda nao iniciadas" />
        <StatCard label="Encerradas" value={stats.ended} detail="Ativas com periodo finalizado" />
        <StatCard label="Total" value={stats.total} detail="Campanhas cadastradas" />
      </div>

      {notice && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary-light px-4 py-3 text-sm font-semibold text-primary-deeper">
          <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-primary" />
          <p>{notice}</p>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void fetchCampaigns()}
              className="mt-2 text-xs font-bold text-red-800 underline-offset-4 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <section className="rounded-[1.5rem] bg-white p-3 shadow-sm" aria-labelledby="campaign-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-2 pb-3">
          <div>
            <h2 id="campaign-list-title" className="font-bold text-primary-deeper">
              Lista de campanhas
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Campanhas sem categorias valem para qualquer categoria de doacao.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchCampaigns()}
            disabled={loading}
            className="rounded-xl bg-surface px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm font-semibold text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Carregando campanhas...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-primary-light text-primary">
              <CalendarDays size={24} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-primary-deeper">
              Nenhuma campanha cadastrada
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Crie a primeira campanha sazonal quando houver um evento real definido
              pela operacao.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary-deeper px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary"
            >
              <Plus size={17} />
              Nova campanha
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {campaigns.map((campaign) => {
              const phase = getCampaignPhase(campaign);
              const acting = actingId === campaign.id;

              return (
                <article
                  key={campaign.id}
                  className="grid gap-4 px-2 py-5 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,0.8fr)_minmax(260px,auto)] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${PHASE_STYLES[phase]}`}>
                        {PHASE_LABELS[phase]}
                      </span>
                      <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                        {campaign.multiplier.toLocaleString('pt-BR')}x
                      </span>
                      {campaign.donationsCount > 0 && (
                        <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                          {campaign.donationsCount} doacoes vinculadas
                        </span>
                      )}
                    </div>
                    <h3 className="truncate text-base font-extrabold text-primary-deeper">
                      {campaign.title}
                    </h3>
                    <p className="mt-1 break-all font-mono text-xs text-gray-400">
                      {campaign.slug}
                    </p>
                    {campaign.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                        {campaign.description}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-2xl bg-surface px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        Inicio
                      </p>
                      <p className="mt-1 font-semibold">{toBrazilianDateTime(campaign.startsAt)}</p>
                    </div>
                    <div className="rounded-2xl bg-surface px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        Fim
                      </p>
                      <p className="mt-1 font-semibold">{toBrazilianDateTime(campaign.endsAt)}</p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        Categorias
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {campaign.categories.length === 0 ? (
                          <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary">
                            Todas as categorias
                          </span>
                        ) : (
                          campaign.categories.map((category) => (
                            <CategoryPill key={category} category={category} />
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => openEditForm(campaign)}
                      className="inline-flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-primary-light hover:text-primary"
                    >
                      <Edit3 size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(campaign)}
                      disabled={acting}
                      className="inline-flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {campaign.active ? <PauseCircle size={14} /> : <CheckCircle2 size={14} />}
                      {campaign.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(campaign)}
                      disabled={acting}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                      {campaign.donationsCount > 0 ? 'Desativar' : 'Excluir'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {formOpen && (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seasonal-campaign-form-title"
        >
          <div className="mx-auto max-w-2xl rounded-[1.5rem] bg-white p-5 shadow-panel">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <Clock3 size={13} />
                  {editingCampaign ? 'Editar' : 'Nova'}
                </p>
                <h2 id="seasonal-campaign-form-title" className="text-xl font-extrabold text-primary-deeper">
                  {editingCampaign ? 'Editar campanha' : 'Nova campanha sazonal'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Fechar formulario"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-gray-500 transition-colors hover:bg-primary-light hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div>
                <label htmlFor="campaign-title" className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Titulo
                </label>
                <input
                  id="campaign-title"
                  value={form.title}
                  onChange={(event) => updateTitle(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm font-semibold text-primary-deeper outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  placeholder="Natal Solidario 2026"
                />
                {formErrors.title && <p className="mt-1 text-xs font-semibold text-red-600">{formErrors.title}</p>}
              </div>

              <div>
                <label htmlFor="campaign-slug" className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Slug
                </label>
                <input
                  id="campaign-slug"
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
                  }}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 font-mono text-sm text-primary-deeper outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  placeholder="natal-solidario-2026"
                />
                {formErrors.slug && <p className="mt-1 text-xs font-semibold text-red-600">{formErrors.slug}</p>}
              </div>

              <div>
                <label htmlFor="campaign-description" className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Descricao
                </label>
                <textarea
                  id="campaign-description"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm leading-6 text-primary-deeper outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  placeholder="Contexto interno da campanha sazonal."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="campaign-start" className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                    Inicio
                  </label>
                  <input
                    id="campaign-start"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm font-semibold text-primary-deeper outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  />
                  {formErrors.startsAt && <p className="mt-1 text-xs font-semibold text-red-600">{formErrors.startsAt}</p>}
                </div>

                <div>
                  <label htmlFor="campaign-end" className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                    Fim
                  </label>
                  <input
                    id="campaign-end"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm font-semibold text-primary-deeper outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  />
                  {formErrors.endsAt && <p className="mt-1 text-xs font-semibold text-red-600">{formErrors.endsAt}</p>}
                </div>
              </div>

              {formErrors.period && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  {formErrors.period}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label htmlFor="campaign-multiplier" className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                    Multiplicador
                  </label>
                  <input
                    id="campaign-multiplier"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.multiplier}
                    onChange={(event) => setForm((current) => ({ ...current, multiplier: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm font-semibold text-primary-deeper outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  />
                  {formErrors.multiplier && <p className="mt-1 text-xs font-semibold text-red-600">{formErrors.multiplier}</p>}
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm font-bold text-primary-deeper">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Campanha ativa
                </label>
              </div>

              <fieldset>
                <legend className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Categorias
                </legend>
                <p className="mt-1 text-xs text-gray-500">
                  Deixe vazio para aplicar a qualquer categoria.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((category) => {
                    const selected = form.categories.includes(category);

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                          selected
                            ? 'bg-primary text-white'
                            : 'bg-surface text-gray-600 hover:bg-primary-light hover:text-primary'
                        }`}
                      >
                        {CATEGORY_LABELS[category]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="rounded-2xl bg-surface px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                  {editingCampaign ? 'Salvar alteracoes' : 'Criar campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
