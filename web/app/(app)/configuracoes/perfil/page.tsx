'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { getMyProfile, updateMyProfile, type MyProfile } from '@/lib/api';
import { BRAZIL_STATES, fetchBrazilCities } from '@/lib/brazil-locations';
import { formatCpfInput, isValidCpf, normalizeCpfInput } from '@/lib/cpf';

const DONATION_INTEREST_OPTIONS = [
  { value: 'CLOTHING', label: 'Roupas' },
  { value: 'SHOES', label: 'Calçados' },
  { value: 'ACCESSORIES', label: 'Acessórios' },
  { value: 'BAGS', label: 'Bolsas' },
  { value: 'OTHER', label: 'Outros' },
] as const;

export default function ConfiguracoesPerfilPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [form, setForm] = useState({
    birthDate: '',
    cpf: '',
    city: '',
    state: '',
    donationInterestCategories: [] as string[],
  });

  const accessToken = session?.user?.accessToken ?? '';
  const role = session?.user?.role;
  const isDonor = role === 'DONOR';

  // Guard: this page holds DONOR-only fields. Operational roles use /perfil/operacional.
  useEffect(() => {
    if (status === 'authenticated' && role && !isDonor) {
      router.replace('/configuracoes');
    }
  }, [status, role, isDonor, router]);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMyProfile(accessToken);
      const normalizedState =
        BRAZIL_STATES.find(
          (state) => state.uf === data.state?.toUpperCase() || state.name === data.state,
        )?.uf ?? data.state ?? '';
      setProfile(data);
      setForm({
        birthDate: data.birthDate ?? '',
        cpf: data.cpf ? formatCpfInput(data.cpf) : '',
        city: data.city ?? '',
        state: normalizedState,
        donationInterestCategories: data.donationInterestCategories ?? [],
      });
    } catch {
      setError('Não foi possível carregar seu perfil agora.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (status === 'authenticated' && isDonor) {
      void reload();
    }
  }, [status, isDonor, reload]);

  useEffect(() => {
    if (!form.state) {
      setCities([]);
      return;
    }

    let cancelled = false;
    setCitiesLoading(true);

    fetchBrazilCities(form.state)
      .then((nextCities) => {
        if (!cancelled) {
          setCities(nextCities);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCities([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.state]);

  if (status === 'authenticated' && role && !isDonor) {
    // Render-time guard while redirect effect runs.
    return (
      <div className="px-5 pt-12 pb-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Esta área é exclusiva de doadores. Redirecionando…
        </p>
      </div>
    );
  }

  function toggleInterest(value: string) {
    setForm((current) => {
      const exists = current.donationInterestCategories.includes(value);
      return {
        ...current,
        donationInterestCategories: exists
          ? current.donationInterestCategories.filter((item) => item !== value)
          : [...current.donationInterestCategories, value],
      };
    });
    setSuccess(null);
  }

  async function handleSave() {
    if (!accessToken || !profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const normalizedCpf = normalizeCpfInput(form.cpf);
    if (normalizedCpf && !isValidCpf(normalizedCpf)) {
      setSaving(false);
      setError('Informe um CPF válido.');
      return;
    }

    if (form.state && form.city && cities.length > 0 && !cities.includes(form.city)) {
      setSaving(false);
      setError('Selecione uma cidade da lista.');
      return;
    }

    try {
      const updated = await updateMyProfile(
        {
          name: profile.name,
          email: profile.email,
          birthDate: form.birthDate || undefined,
          cpf: normalizedCpf || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          donationInterestCategories: form.donationInterestCategories,
        },
        accessToken,
      );
      setProfile(updated);
      setForm((current) => ({
        ...current,
        cpf: updated.cpf ? formatCpfInput(updated.cpf) : current.cpf,
        city: updated.city ?? current.city,
        state: updated.state ?? current.state,
      }));
      setSuccess('Configurações de cadastro salvas.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar suas informações de cadastro agora.',
      );
    } finally {
      setSaving(false);
    }
  }

  const completion = profile?.profileCompletion;
  const isComplete = (completion?.missingFields?.length ?? 1) === 0;

  return (
    <div className="px-5 pb-12 pt-6">
      <Link
        href="/configuracoes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-primary dark:text-gray-500 dark:hover:text-primary-muted"
      >
        <ArrowLeft size={14} />
        Voltar para configurações
      </Link>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Configurações
      </p>
      <h1 className="text-3xl font-bold text-primary-deeper dark:text-white">Configurações de cadastro</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Revise seus dados pessoais, sua cidade e suas preferências de doação.
      </p>

      {loading ? (
        <div className="mt-8 flex items-center gap-3 rounded-3xl bg-white p-6 shadow-card dark:bg-surface-inkSoft dark:shadow-none">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Carregando perfil...</span>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <div className="rounded-3xl bg-white p-5 shadow-card dark:bg-surface-inkSoft dark:shadow-none">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${isComplete ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted'}`}>
                {isComplete ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface dark:text-gray-100">
                  {isComplete ? 'Informações de cadastro em dia' : 'Faltam alguns detalhes'}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {completion ? `${completion.completedItems} de ${completion.totalItems} itens preenchidos.` : ''}
                </p>
                {!isComplete && completion?.missingFields?.length ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Faltando: {completion.missingFields.join(', ')}.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-card dark:bg-surface-inkSoft dark:shadow-none">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-on-surface dark:text-gray-100">Data de nascimento</span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, birthDate: event.target.value }));
                    setSuccess(null);
                  }}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-100"
                />
              </label>

              <label className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-on-surface dark:text-gray-100">CPF</span>
                <input
                  inputMode="numeric"
                  value={form.cpf}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, cpf: formatCpfInput(event.target.value) }));
                    setSuccess(null);
                  }}
                  placeholder="000.000.000-00"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </label>

              <label className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-on-surface dark:text-gray-100">Estado</span>
                <select
                  value={form.state}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, state: event.target.value, city: '' }));
                    setSuccess(null);
                  }}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-100"
                >
                  <option value="">Selecione</option>
                  {BRAZIL_STATES.map((state) => (
                    <option key={state.uf} value={state.uf}>
                      {state.name} ({state.uf})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-on-surface dark:text-gray-100">Cidade</span>
                <input
                  value={form.city}
                  list="vestgo-brazil-cities"
                  disabled={!form.state}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, city: event.target.value }));
                    setSuccess(null);
                  }}
                  placeholder={form.state ? 'Digite para buscar' : 'Escolha o estado primeiro'}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-white/10 dark:bg-surface-ink dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-white/5"
                />
                <datalist id="vestgo-brazil-cities">
                  {cities.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                {citiesLoading && (
                  <span className="block text-xs text-gray-400 dark:text-gray-500">Carregando cidades...</span>
                )}
              </label>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-primary-deeper dark:text-white">
                Interesses de doação
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Escolha as categorias que fazem sentido para o seu momento solidário.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {DONATION_INTEREST_OPTIONS.map((option) => {
                  const selected = form.donationInterestCategories.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleInterest(option.value)}
                      className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                        selected
                          ? 'border-primary bg-primary-light text-primary-deeper dark:bg-primary/20 dark:text-primary-muted'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                {success}
              </p>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar configurações de cadastro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
