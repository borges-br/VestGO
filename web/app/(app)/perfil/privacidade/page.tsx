'use client';

import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { signOut, useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  changePassword,
  confirmTwoFactorSetup,
  disableTwoFactor,
  exportMyData,
  getActiveSessions,
  getTwoFactorStatus,
  regenerateRecoveryCodes,
  requestAccountDeletion,
  revokeOtherSessions,
  revokeSession,
  startTwoFactorSetup,
  ApiError,
  type ActiveSession,
  type TwoFactorStatus,
} from '@/lib/api';
import { formatDateTimeLabel } from '@/lib/date-time';

type SetupState =
  | { stage: 'idle' }
  | { stage: 'starting' }
  | { stage: 'qr'; secret: string; otpauthUri: string; code: string; submitting: boolean; error: string | null }
  | { stage: 'codes'; recoveryCodes: string[] };

type DisableState =
  | { open: false }
  | { open: true; password: string; code: string; recoveryMode: boolean; recoveryCode: string; submitting: boolean; error: string | null };

type RegenState =
  | { open: false }
  | { open: true; password: string; code: string; recoveryMode: boolean; recoveryCode: string; submitting: boolean; error: string | null; codes: string[] | null };

type PasswordState = {
  open: boolean;
  current: string;
  next: string;
  confirm: string;
  submitting: boolean;
  error: string | null;
  success: string | null;
};

type AccountDeletionState = {
  open: boolean;
  confirmationText: string;
  submitting: boolean;
  error: string | null;
  success: string | null;
};

function formatDate(iso: string) {
  try {
    return formatDateTimeLabel(iso);
  } catch {
    return iso;
  }
}

function relativeTime(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'agora há pouco';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} d`;
  return formatDate(iso);
}

export default function PrivacidadePage() {
  const { data: session } = useSession();
  const accessToken = session?.user?.accessToken ?? '';

  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingTwoFactor, setLoadingTwoFactor] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  const [setup, setSetup] = useState<SetupState>({ stage: 'idle' });
  const [disable, setDisable] = useState<DisableState>({ open: false });
  const [regen, setRegen] = useState<RegenState>({ open: false });
  const [password, setPassword] = useState<PasswordState>({
    open: false,
    current: '',
    next: '',
    confirm: '',
    submitting: false,
    error: null,
    success: null,
  });
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [dataExportError, setDataExportError] = useState<string | null>(null);
  const [dataExportSuccess, setDataExportSuccess] = useState<string | null>(null);
  const [accountDeletion, setAccountDeletion] = useState<AccountDeletionState>({
    open: false,
    confirmationText: '',
    submitting: false,
    error: null,
    success: null,
  });

  const refreshTwoFactor = useCallback(async () => {
    if (!accessToken) return;
    setLoadingTwoFactor(true);
    setTwoFactorError(null);
    try {
      const status = await getTwoFactorStatus(accessToken);
      setTwoFactor(status);
    } catch {
      setTwoFactorError('Não foi possível carregar o status do 2FA agora.');
    } finally {
      setLoadingTwoFactor(false);
    }
  }, [accessToken]);

  const refreshSessions = useCallback(async () => {
    if (!accessToken) return;
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const response = await getActiveSessions(accessToken);
      setSessions(response.data);
    } catch {
      setSessionsError('Não foi possível carregar suas sessões agora.');
    } finally {
      setLoadingSessions(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshTwoFactor();
    void refreshSessions();
  }, [refreshTwoFactor, refreshSessions]);

  const otherSessionsCount = useMemo(
    () => sessions.filter((s) => !s.isCurrent).length,
    [sessions],
  );

  async function handleStartSetup() {
    if (!accessToken) return;
    setSetup({ stage: 'starting' });
    setTwoFactorError(null);
    try {
      const data = await startTwoFactorSetup(accessToken);
      setSetup({
        stage: 'qr',
        secret: data.secret,
        otpauthUri: data.otpauthUri,
        code: '',
        submitting: false,
        error: null,
      });
    } catch (err) {
      setSetup({ stage: 'idle' });
      setTwoFactorError(
        err instanceof ApiError && err.statusCode === 503
          ? 'A autenticação em dois fatores está temporariamente indisponível. Tente novamente mais tarde ou fale com o suporte.'
          : err instanceof Error ? err.message : 'Não foi possível iniciar o setup do 2FA.',
      );
    }
  }

  async function handleConfirmSetup() {
    if (setup.stage !== 'qr' || !accessToken) return;
    setSetup({ ...setup, submitting: true, error: null });
    try {
      const response = await confirmTwoFactorSetup({ code: setup.code }, accessToken);
      setSetup({ stage: 'codes', recoveryCodes: response.recoveryCodes });
      void refreshTwoFactor();
    } catch (err) {
      setSetup({
        ...setup,
        submitting: false,
        error: err instanceof Error ? err.message : 'Código inválido. Tente novamente.',
      });
    }
  }

  async function handleDisableSubmit() {
    if (!disable.open || !accessToken) return;
    setDisable({ ...disable, submitting: true, error: null });
    try {
      await disableTwoFactor(
        disable.recoveryMode
          ? { password: disable.password, recoveryCode: disable.recoveryCode }
          : { password: disable.password, code: disable.code },
        accessToken,
      );
      setDisable({ open: false });
      void refreshTwoFactor();
      void refreshSessions();
    } catch (err) {
      setDisable({
        ...disable,
        submitting: false,
        error: err instanceof Error ? err.message : 'Não foi possível desativar a 2FA.',
      });
    }
  }

  async function handleRegenSubmit() {
    if (!regen.open || !accessToken) return;
    setRegen({ ...regen, submitting: true, error: null });
    try {
      const response = await regenerateRecoveryCodes(
        regen.recoveryMode
          ? { password: regen.password, recoveryCode: regen.recoveryCode }
          : { password: regen.password, code: regen.code },
        accessToken,
      );
      setRegen({ ...regen, submitting: false, error: null, codes: response.recoveryCodes });
      void refreshTwoFactor();
    } catch (err) {
      setRegen({
        ...regen,
        submitting: false,
        error: err instanceof Error ? err.message : 'Não foi possível gerar novos códigos.',
      });
    }
  }

  async function handlePasswordSubmit() {
    if (!accessToken) return;
    if (password.next.length < 8) {
      setPassword({ ...password, error: 'A nova senha deve ter pelo menos 8 caracteres.' });
      return;
    }
    if (password.next !== password.confirm) {
      setPassword({ ...password, error: 'A confirmação não confere com a nova senha.' });
      return;
    }
    setPassword({ ...password, submitting: true, error: null, success: null });
    try {
      await changePassword(
        { currentPassword: password.current, newPassword: password.next },
        accessToken,
      );
      setPassword({
        open: false,
        current: '',
        next: '',
        confirm: '',
        submitting: false,
        error: null,
        success: null,
      });
      // All sessions invalidated on backend; force a clean re-login
      await signOut({ callbackUrl: '/login?sessionExpired=1' });
    } catch (err) {
      setPassword({
        ...password,
        submitting: false,
        error: err instanceof Error ? err.message : 'Não foi possível trocar sua senha agora.',
      });
    }
  }

  async function handleRevoke(id: string) {
    if (!accessToken) return;
    setRevokingId(id);
    try {
      await revokeSession(id, accessToken);
      setSessions((current) => current.filter((s) => s.id !== id));
    } catch {
      setSessionsError('Não foi possível encerrar essa sessão.');
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeOthers() {
    if (!accessToken) return;
    setRevokingOthers(true);
    try {
      await revokeOtherSessions(accessToken);
      await refreshSessions();
    } catch {
      setSessionsError('Não foi possível encerrar as outras sessões.');
    } finally {
      setRevokingOthers(false);
    }
  }

  async function handleExportData() {
    if (!accessToken) return;
    setExportingData(true);
    setDataExportError(null);
    setDataExportSuccess(null);
    try {
      const data = await exportMyData(accessToken);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vestgo-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDataExportSuccess('Arquivo JSON gerado com sucesso.');
    } catch (err) {
      setDataExportError(
        err instanceof Error ? err.message : 'Não foi possível exportar seus dados agora.',
      );
    } finally {
      setExportingData(false);
    }
  }

  async function handleAccountDeletionRequest() {
    if (!accessToken) return;
    if (accountDeletion.confirmationText !== 'ENCERRAR') {
      setAccountDeletion({
        ...accountDeletion,
        error: 'Digite ENCERRAR exatamente como mostrado.',
      });
      return;
    }

    setAccountDeletion({ ...accountDeletion, submitting: true, error: null, success: null });
    try {
      await requestAccountDeletion(accountDeletion.confirmationText, accessToken);
      setAccountDeletion({
        open: true,
        confirmationText: '',
        submitting: false,
        error: null,
        success: 'Enviamos um email de confirmação para concluir o encerramento.',
      });
    } catch (err) {
      setAccountDeletion({
        ...accountDeletion,
        submitting: false,
        error:
          err instanceof Error
            ? err.message
            : 'Não foi possível enviar o email de confirmação agora.',
        success: null,
      });
    }
  }

  return (
    <div className="pb-2">
      <section className="px-5 pt-6 pb-4">
        <Link
          href="/perfil"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-primary dark:text-gray-500 dark:hover:text-primary-muted"
        >
          <ArrowLeft size={14} />
          Voltar ao perfil
        </Link>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Configurações
        </p>
        <h1 className="text-3xl font-bold text-primary-deeper dark:text-white">Privacidade e segurança</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gerencie 2FA, sessões ativas, senha e dados pessoais.
        </p>
      </section>

      <section className="mb-5 px-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Segurança da conta
        </p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-surface-inkSoft dark:shadow-none">
          <TwoFactorRow
            status={twoFactor}
            loading={loadingTwoFactor}
            error={twoFactorError}
            onActivate={handleStartSetup}
            onDeactivate={() =>
              setDisable({
                open: true,
                password: '',
                code: '',
                recoveryMode: false,
                recoveryCode: '',
                submitting: false,
                error: null,
              })
            }
            onRegenerate={() =>
              setRegen({
                open: true,
                password: '',
                code: '',
                recoveryMode: false,
                recoveryCode: '',
                submitting: false,
                error: null,
                codes: null,
              })
            }
          />

          <button
            type="button"
            onClick={() =>
              setPassword({
                open: true,
                current: '',
                next: '',
                confirm: '',
                submitting: false,
                error: null,
                success: null,
              })
            }
            className="flex w-full items-center gap-3 border-t border-gray-100 px-5 py-4 text-left transition-colors hover:bg-surface dark:border-white/5 dark:hover:bg-white/5"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
              <Lock size={15} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">Alterar senha</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Trocar a senha encerra todas as outras sessões.
              </p>
            </div>
            <ChevronRight size={15} className="text-gray-300 dark:text-gray-600" />
          </button>
        </div>
      </section>

      <section className="mb-5 px-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Sessões ativas
          </p>
          {otherSessionsCount > 0 && (
            <button
              type="button"
              onClick={handleRevokeOthers}
              disabled={revokingOthers}
              className="text-[11px] font-semibold uppercase tracking-wide text-red-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-red-400"
            >
              {revokingOthers ? 'Encerrando...' : 'Sair de todas as outras'}
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-surface-inkSoft dark:shadow-none">
          {loadingSessions ? (
            <div className="flex items-center gap-3 px-5 py-6 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 size={16} className="animate-spin text-primary" />
              Carregando sessões...
            </div>
          ) : sessionsError ? (
            <div className="px-5 py-5 text-sm text-red-500 dark:text-red-400">{sessionsError}</div>
          ) : sessions.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">
              Nenhuma sessão ativa encontrada.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/5">
              {sessions.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
                    <Smartphone size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-on-surface dark:text-gray-100">
                        {entry.deviceLabel ?? 'Dispositivo desconhecido'}
                      </p>
                      {entry.isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary dark:bg-primary/20 dark:text-primary-muted">
                          Sessão atual
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {entry.userAgent ?? 'User agent indisponível'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                      Último uso: {relativeTime(entry.lastUsedAt)} · IP: {entry.ipAddress ?? 'desconhecido'}
                    </p>
                  </div>
                  {!entry.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(entry.id)}
                      disabled={revokingId === entry.id}
                      className="flex-shrink-0 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      {revokingId === entry.id ? '...' : 'Encerrar'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mb-5 px-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Seus dados
        </p>
        <div className="rounded-2xl bg-white p-5 shadow-card dark:bg-surface-inkSoft dark:shadow-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">
                Exportar dados pessoais
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Baixe um JSON com perfil, preferências, doações, histórico e notificações.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exportingData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {exportingData ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {exportingData ? 'Gerando...' : 'Exportar dados'}
            </button>
          </div>
          {dataExportError && (
            <p className="mt-3 text-xs text-red-500 dark:text-red-400">{dataExportError}</p>
          )}
          {dataExportSuccess && (
            <p className="mt-3 text-xs text-primary dark:text-primary-muted">{dataExportSuccess}</p>
          )}
        </div>
      </section>

      <section className="mb-8 px-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-red-400 dark:text-red-400">
          Zona de perigo
        </p>
        <button
          type="button"
          onClick={() =>
            setAccountDeletion({
              open: true,
              confirmationText: '',
              submitting: false,
              error: null,
              success: null,
            })
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-4 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 active:scale-[0.97] dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
        >
          <Trash2 size={16} />
          Excluir minha conta
        </button>
      </section>

      {(setup.stage === 'starting' || setup.stage === 'qr' || setup.stage === 'codes') && (
        <Modal onClose={() => setSetup({ stage: 'idle' })}>
          {setup.stage === 'starting' && (
            <div className="flex items-center gap-3 px-2 py-6 text-sm text-gray-600 dark:text-gray-300">
              <Loader2 size={16} className="animate-spin text-primary" />
              Gerando segredo...
            </div>
          )}

          {setup.stage === 'qr' && (
            <div>
              <ModalHeader
                icon={ShieldCheck}
                title="Configurar 2FA"
                description="Escaneie o QR Code com Google Authenticator, 1Password, Bitwarden ou similar."
              />
              <div className="mt-5 flex flex-col items-center gap-4">
                <div className="rounded-2xl bg-white p-4">
                  <QRCode value={setup.otpauthUri} size={180} />
                </div>
                <details className="w-full">
                  <summary className="cursor-pointer text-xs font-semibold text-primary">
                    Não consegue escanear? Use a chave manual
                  </summary>
                  <code className="mt-2 block break-all rounded-xl bg-surface px-3 py-2 text-xs text-on-surface dark:bg-surface-ink dark:text-gray-200">
                    {setup.secret}
                  </code>
                </details>
              </div>
              <div className="mt-5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Código de 6 dígitos do app
                </label>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={setup.code}
                  onChange={(e) =>
                    setSetup({ ...setup, code: e.target.value.replace(/\D/g, '').slice(0, 6) })
                  }
                  placeholder="000000"
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center text-lg font-semibold tracking-[0.5em] text-on-surface outline-none focus:border-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-100"
                />
                {setup.error && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400">{setup.error}</p>
                )}
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSetup({ stage: 'idle' })}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 dark:border-white/10 dark:bg-surface-ink dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSetup}
                  disabled={setup.code.length !== 6 || setup.submitting}
                  className="flex-1 rounded-2xl bg-primary-deeper py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {setup.submitting ? 'Confirmando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}

          {setup.stage === 'codes' && (
            <div>
              <ModalHeader
                icon={KeyRound}
                title="Códigos de recuperação"
                description="Guarde esses códigos em um lugar seguro. Cada um pode ser usado uma única vez se você perder acesso ao app."
              />
              <RecoveryCodesList codes={setup.recoveryCodes} />
              <button
                type="button"
                onClick={() => setSetup({ stage: 'idle' })}
                className="mt-5 w-full rounded-2xl bg-primary-deeper py-3 text-sm font-bold text-white"
              >
                Já guardei. Concluir
              </button>
            </div>
          )}
        </Modal>
      )}

      {disable.open && (
        <Modal onClose={() => setDisable({ open: false })}>
          <ModalHeader
            icon={ShieldCheck}
            title="Desativar 2FA"
            description="Confirme com sua senha e um código TOTP ou recovery code."
          />
          <div className="mt-5 space-y-3">
            <PasswordInput
              label="Senha atual"
              value={disable.password}
              onChange={(value) => setDisable({ ...disable, password: value })}
            />
            {disable.recoveryMode ? (
              <FieldRow label="Código de recuperação">
                <input
                  value={disable.recoveryCode}
                  onChange={(e) => setDisable({ ...disable, recoveryCode: e.target.value })}
                  placeholder="xxxxx-xxxxx"
                  className={modalInputClass}
                />
              </FieldRow>
            ) : (
              <FieldRow label="Código de 6 dígitos">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={disable.code}
                  onChange={(e) => setDisable({ ...disable, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="000000"
                  className={`${modalInputClass} text-center tracking-[0.4em]`}
                />
              </FieldRow>
            )}
            <button
              type="button"
              onClick={() => setDisable({ ...disable, recoveryMode: !disable.recoveryMode, error: null })}
              className="text-xs font-semibold text-primary"
            >
              {disable.recoveryMode ? 'Usar código do app' : 'Usar código de recuperação'}
            </button>
            {disable.error && (
              <p className="text-xs text-red-500 dark:text-red-400">{disable.error}</p>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setDisable({ open: false })}
              className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 dark:border-white/10 dark:bg-surface-ink dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDisableSubmit}
              disabled={disable.submitting}
              className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {disable.submitting ? 'Desativando...' : 'Desativar 2FA'}
            </button>
          </div>
        </Modal>
      )}

      {regen.open && (
        <Modal onClose={() => setRegen({ open: false })}>
          {regen.codes ? (
            <div>
              <ModalHeader
                icon={KeyRound}
                title="Novos códigos de recuperação"
                description="Os anteriores foram invalidados. Guarde estes em local seguro."
              />
              <RecoveryCodesList codes={regen.codes} />
              <button
                type="button"
                onClick={() => setRegen({ open: false })}
                className="mt-5 w-full rounded-2xl bg-primary-deeper py-3 text-sm font-bold text-white"
              >
                Concluir
              </button>
            </div>
          ) : (
            <>
              <ModalHeader
                icon={RefreshCcw}
                title="Gerar novos códigos"
                description="Confirme com senha e código atual. Os códigos antigos serão invalidados."
              />
              <div className="mt-5 space-y-3">
                <PasswordInput
                  label="Senha atual"
                  value={regen.password}
                  onChange={(value) => setRegen({ ...regen, password: value })}
                />
                {regen.recoveryMode ? (
                  <FieldRow label="Código de recuperação">
                    <input
                      value={regen.recoveryCode}
                      onChange={(e) => setRegen({ ...regen, recoveryCode: e.target.value })}
                      placeholder="xxxxx-xxxxx"
                      className={modalInputClass}
                    />
                  </FieldRow>
                ) : (
                  <FieldRow label="Código de 6 dígitos">
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={regen.code}
                      onChange={(e) =>
                        setRegen({ ...regen, code: e.target.value.replace(/\D/g, '').slice(0, 6) })
                      }
                      placeholder="000000"
                      className={`${modalInputClass} text-center tracking-[0.4em]`}
                    />
                  </FieldRow>
                )}
                <button
                  type="button"
                  onClick={() => setRegen({ ...regen, recoveryMode: !regen.recoveryMode, error: null })}
                  className="text-xs font-semibold text-primary"
                >
                  {regen.recoveryMode ? 'Usar código do app' : 'Usar código de recuperação'}
                </button>
                {regen.error && (
                  <p className="text-xs text-red-500 dark:text-red-400">{regen.error}</p>
                )}
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRegen({ open: false })}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 dark:border-white/10 dark:bg-surface-ink dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRegenSubmit}
                  disabled={regen.submitting}
                  className="flex-1 rounded-2xl bg-primary-deeper py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {regen.submitting ? 'Gerando...' : 'Gerar códigos'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {password.open && (
        <Modal onClose={() => setPassword({ ...password, open: false })}>
          <ModalHeader
            icon={Lock}
            title="Alterar senha"
            description="A troca encerra todas as outras sessões e pede um novo login aqui."
          />
          <div className="mt-5 space-y-3">
            <PasswordInput
              label="Senha atual"
              value={password.current}
              onChange={(value) => setPassword({ ...password, current: value })}
            />
            <PasswordInput
              label="Nova senha"
              value={password.next}
              onChange={(value) => setPassword({ ...password, next: value })}
              hint="Mínimo de 8 caracteres."
            />
            <PasswordInput
              label="Confirmar nova senha"
              value={password.confirm}
              onChange={(value) => setPassword({ ...password, confirm: value })}
            />
            {password.error && (
              <p className="text-xs text-red-500 dark:text-red-400">{password.error}</p>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setPassword({ ...password, open: false })}
              className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 dark:border-white/10 dark:bg-surface-ink dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePasswordSubmit}
              disabled={password.submitting}
              className="flex-1 rounded-2xl bg-primary-deeper py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {password.submitting ? 'Salvando...' : 'Trocar senha'}
            </button>
          </div>
        </Modal>
      )}

      {accountDeletion.open && (
        <Modal
          onClose={() =>
            setAccountDeletion({
              open: false,
              confirmationText: '',
              submitting: false,
              error: null,
              success: null,
            })
          }
        >
          <ModalHeader
            icon={Trash2}
            title="Encerrar conta"
            description="Esta ação exige confirmação por email. Seus dados pessoais serão anonimizados e suas sessões serão encerradas."
          />
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            Para solicitar o email de confirmação, digite <strong>ENCERRAR</strong> abaixo.
          </div>
          <div className="mt-5 space-y-3">
            <FieldRow label="Confirmação">
              <input
                value={accountDeletion.confirmationText}
                onChange={(event) =>
                  setAccountDeletion({
                    ...accountDeletion,
                    confirmationText: event.target.value,
                    error: null,
                    success: null,
                  })
                }
                placeholder="ENCERRAR"
                className={modalInputClass}
              />
            </FieldRow>
            {accountDeletion.error && (
              <p className="text-xs text-red-500 dark:text-red-400">{accountDeletion.error}</p>
            )}
            {accountDeletion.success && (
              <p className="text-xs text-primary dark:text-primary-muted">{accountDeletion.success}</p>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() =>
                setAccountDeletion({
                  open: false,
                  confirmationText: '',
                  submitting: false,
                  error: null,
                  success: null,
                })
              }
              className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 dark:border-white/10 dark:bg-surface-ink dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAccountDeletionRequest}
              disabled={accountDeletion.confirmationText !== 'ENCERRAR' || accountDeletion.submitting}
              className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {accountDeletion.submitting ? 'Enviando...' : 'Enviar email de confirmação'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const modalInputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none focus:border-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-100';

function TwoFactorRow({
  status,
  loading,
  error,
  onActivate,
  onDeactivate,
  onRegenerate,
}: {
  status: TwoFactorStatus | null;
  loading: boolean;
  error: string | null;
  onActivate: () => void;
  onDeactivate: () => void;
  onRegenerate: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 px-5 py-5 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 size={16} className="animate-spin text-primary" />
        Carregando 2FA...
      </div>
    );
  }

  if (error) {
    return <div className="px-5 py-5 text-sm text-red-500 dark:text-red-400">{error}</div>;
  }

  const enabled = status?.enabled ?? false;

  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
          <ShieldCheck size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-on-surface dark:text-gray-100">
              Autenticação em dois fatores
            </p>
            {enabled && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                Ativa
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
            {enabled
              ? `${status?.remainingRecoveryCodes ?? 0} códigos de recuperação disponíveis.`
              : 'Adicione uma camada extra usando um app autenticador (Google, 1Password, Bitwarden).'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-12">
        {enabled ? (
          <>
            <button
              type="button"
              onClick={onRegenerate}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-300"
            >
              Gerar novos códigos
            </button>
            <button
              type="button"
              onClick={onDeactivate}
              className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Desativar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onActivate}
            className="rounded-full bg-primary-deeper px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white"
          >
            Configurar 2FA
          </button>
        )}
      </div>
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-panel dark:bg-surface-inkSoft"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-surface dark:hover:bg-white/5"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-primary-deeper dark:text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <FieldRow label={label}>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${modalInputClass} pr-10`}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>}
    </FieldRow>
  );
}

function RecoveryCodesList({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(codes.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function download() {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vestgo-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <ul className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface p-4 font-mono text-xs text-on-surface dark:bg-surface-ink dark:text-gray-200">
        {codes.map((code) => (
          <li key={code} className="select-all break-all">
            {code}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-300"
        >
          <Copy size={13} />
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
        <button
          type="button"
          onClick={download}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-surface-ink dark:text-gray-300"
        >
          <Download size={13} />
          Baixar
        </button>
      </div>
    </div>
  );
}
