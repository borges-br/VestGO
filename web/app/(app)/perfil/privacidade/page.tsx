'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  MailCheck,
  ShieldCheck,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  changePassword,
  getMyProfile,
  getNotifications,
  getUserDonations,
  requestAccountDeletion,
  requestEmailVerification,
  type DonationRecord,
  type MyProfile,
  type NotificationRecord,
} from '@/lib/api';

const SHARE_DATA_KEY = 'vestgo:share-impact-data';
const MARKETING_KEY = 'vestgo:marketing-communications';

type ActiveModal = 'change-password' | 'sessions' | 'two-factor' | 'view-data' | 'danger' | null;

type CollectedDataSnapshot = {
  generatedAt: string;
  account: {
    name: string | null | undefined;
    email: string | null | undefined;
    role: string | undefined;
    emailVerifiedAt: string | null | undefined;
    createdAt: string | null;
  };
  profile: {
    phone: string | null;
    organizationName: string | null;
    description: string | null;
    city: string | null;
    state: string | null;
    publicProfileState: string | null;
    acceptedCategories: string[];
    donationInterestCategories: string[];
    profileCompletion: MyProfile['profileCompletion'] | null;
  } | null;
  preferences: {
    shareImpactData: boolean;
    marketingCommunications: boolean;
    securityEmails: 'mandatory';
  };
  donations: {
    count: number | null;
    items: ReturnType<typeof sanitizeDonationForExport>[];
  };
  notifications: {
    count: number | null;
    unreadCount: number | null;
    recent: ReturnType<typeof sanitizeNotificationForExport>[];
  };
};

function sanitizeDonationForExport(donation: DonationRecord) {
  return {
    code: donation.code,
    status: donation.status,
    createdAt: donation.createdAt,
    updatedAt: donation.updatedAt,
    itemCount: donation.itemCount,
    itemLabel: donation.itemLabel,
    pointsAwarded: donation.pointsAwarded,
    scheduledAt: donation.scheduledAt,
    collectionPointName:
      donation.collectionPoint?.organizationName ?? donation.collectionPoint?.name ?? null,
    ngoName: donation.ngo?.organizationName ?? donation.ngo?.name ?? null,
    dropOffPointName:
      donation.dropOffPoint?.organizationName ?? donation.dropOffPoint?.name ?? null,
    items: donation.items.map((item) => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      description: item.description,
      weightKg: item.weightKg,
    })),
  };
}

function sanitizeNotificationForExport(notification: NotificationRecord) {
  return {
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    read: notification.read,
    createdAt: notification.createdAt,
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Não informado';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PrivacidadePage() {
  const { data: session } = useSession();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [shareData, setShareData] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [dataSnapshot, setDataSnapshot] = useState<CollectedDataSnapshot | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deletionConfirmation, setDeletionConfirmation] = useState('');
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [deletionSuccess, setDeletionSuccess] = useState<string | null>(null);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const accessToken = session?.user?.accessToken ?? '';
  const emailVerified = Boolean(session?.user?.emailVerifiedAt);
  const canSelfDelete = session?.user?.role === 'DONOR';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedShareData = window.localStorage.getItem(SHARE_DATA_KEY);
    const storedMarketing = window.localStorage.getItem(MARKETING_KEY);

    if (storedShareData) {
      setShareData(storedShareData === 'true');
    }

    if (storedMarketing) {
      setMarketing(storedMarketing === 'true');
    }
  }, []);

  useEffect(() => {
    if (!activeModal) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveModal(null);
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeModal]);

  function persistShareData(value: boolean) {
    setShareData(value);
    window.localStorage.setItem(SHARE_DATA_KEY, String(value));
    flashStatus('Preferência de dados de impacto atualizada.');
  }

  function persistMarketing(value: boolean) {
    setMarketing(value);
    window.localStorage.setItem(MARKETING_KEY, String(value));
    flashStatus('Preferência de marketing atualizada.');
  }

  function flashStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 2200);
  }

  async function handleResendEmail() {
    if (!accessToken || emailVerified) {
      setEmailStatus('Seu e-mail já está verificado.');
      return;
    }

    setResendingEmail(true);
    setEmailStatus(null);

    try {
      const response = await requestEmailVerification(accessToken);
      if (response.alreadyVerified) {
        setEmailStatus('Seu e-mail já está verificado.');
      } else if (response.emailVerificationSent) {
        setEmailStatus('Enviamos um novo link de confirmação para seu e-mail.');
      } else {
        setEmailStatus('Não foi possível enviar agora. Tente novamente em instantes.');
      }
    } catch (error) {
      setEmailStatus(
        error instanceof Error
          ? error.message
          : 'Não foi possível reenviar o e-mail agora.',
      );
    } finally {
      setResendingEmail(false);
    }
  }

  async function buildCollectedDataSnapshot(): Promise<CollectedDataSnapshot> {
    if (!accessToken) {
      throw new Error('Sessão não encontrada.');
    }

    const [profile, donationsResponse, notificationsResponse] = await Promise.all([
      getMyProfile(accessToken).catch(() => null),
      getUserDonations(accessToken, { limit: 100 }).catch(() => null),
      getNotifications(accessToken, { limit: 20 }).catch(() => null),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      account: {
        name: session?.user?.name,
        email: session?.user?.email,
        role: session?.user?.role,
        emailVerifiedAt: session?.user?.emailVerifiedAt,
        createdAt: profile?.createdAt ?? null,
      },
      profile: profile
        ? {
            phone: profile.phone,
            organizationName: profile.organizationName,
            description: profile.description,
            city: profile.city,
            state: profile.state,
            publicProfileState: profile.publicProfileState,
            acceptedCategories: profile.acceptedCategories,
            donationInterestCategories: profile.donationInterestCategories,
            profileCompletion: profile.profileCompletion,
          }
        : null,
      preferences: {
        shareImpactData: shareData,
        marketingCommunications: marketing,
        securityEmails: 'mandatory',
      },
      donations: {
        count: donationsResponse?.meta.count ?? null,
        items: donationsResponse?.data.map(sanitizeDonationForExport) ?? [],
      },
      notifications: {
        count: notificationsResponse?.meta.count ?? null,
        unreadCount: notificationsResponse?.meta.unreadCount ?? null,
        recent: notificationsResponse?.data.map(sanitizeNotificationForExport) ?? [],
      },
    };
  }

  async function handleViewCollectedData() {
    setActiveModal('view-data');
    setDataLoading(true);
    setDataError(null);

    try {
      setDataSnapshot(await buildCollectedDataSnapshot());
    } catch {
      setDataError('Não foi possível carregar seus dados agora.');
    } finally {
      setDataLoading(false);
    }
  }

  async function handleExportData() {
    setExportingData(true);
    setDataError(null);

    try {
      const snapshot = await buildCollectedDataSnapshot();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(`vestgo-meus-dados-${date}.json`, snapshot);
      flashStatus('Arquivo de dados gerado no seu navegador.');
    } catch {
      flashStatus('Não foi possível gerar o arquivo agora.');
    } finally {
      setExportingData(false);
    }
  }

  function validatePasswordForm() {
    if (!passwordForm.currentPassword) {
      return 'Informe sua senha atual.';
    }

    if (passwordForm.newPassword.length < 8) {
      return 'A nova senha precisa ter pelo menos 8 caracteres.';
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return 'A confirmação precisa ser igual à nova senha.';
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      return 'A nova senha precisa ser diferente da senha atual.';
    }

    return null;
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const validationError = validatePasswordForm();
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    if (!accessToken) {
      setPasswordError('Sessão não encontrada. Entre novamente para alterar a senha.');
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        accessToken,
      );
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Senha alterada com sucesso. Vamos pedir um novo login por segurança.');
      window.setTimeout(() => {
        void signOut({ callbackUrl: '/login' });
      }, 1800);
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar a senha agora.',
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleRequestAccountDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeletionError(null);
    setDeletionSuccess(null);

    if (!canSelfDelete) {
      setDeletionError('Este tipo de conta precisa de revisão manual do suporte.');
      return;
    }

    if (deletionConfirmation !== 'ENCERRAR') {
      setDeletionError('Digite ENCERRAR para solicitar o e-mail de confirmação.');
      return;
    }

    if (!accessToken) {
      setDeletionError('Sessão não encontrada. Entre novamente para solicitar o encerramento.');
      return;
    }

    setRequestingDeletion(true);

    try {
      const response = await requestAccountDeletion(accessToken);
      setDeletionSuccess(response.message);
      setDeletionConfirmation('');
    } catch (error) {
      setDeletionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível solicitar o encerramento agora.',
      );
    } finally {
      setRequestingDeletion(false);
    }
  }

  return (
    <div className="pb-10">
      <section className="px-5 pt-6 pb-4">
        <Link
          href="/perfil"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-gray-300"
        >
          <ArrowLeft size={14} />
          Voltar ao perfil
        </Link>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Conta
        </p>
        <h1 className="text-3xl font-bold text-primary-deeper dark:text-white">
          Privacidade e segurança
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
          Gerencie autenticação, dados pessoais e preferências de privacidade.
        </p>
      </section>

      {statusMessage && (
        <div
          className="mx-5 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
          aria-live="polite"
        >
          {statusMessage}
        </div>
      )}

      <section className="mb-5 px-5" aria-labelledby="account-security-title">
        <SectionTitle id="account-security-title">Segurança da conta</SectionTitle>
        <div className="overflow-hidden rounded-2xl bg-white shadow-card dark:border dark:border-gray-800 dark:bg-gray-950">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface dark:text-white">
                Status do e-mail
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-300">
                E-mails de segurança continuam obrigatórios, mesmo com outras preferências
                desativadas.
              </p>
              {emailStatus && (
                <p className="mt-2 text-xs font-medium text-primary dark:text-primary-light" aria-live="polite">
                  {emailStatus}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <EmailBadge verified={emailVerified} />
              {!emailVerified && (
                <button
                  type="button"
                  onClick={() => void handleResendEmail()}
                  disabled={resendingEmail}
                  aria-busy={resendingEmail}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-primary/50 dark:text-primary-light dark:hover:bg-primary/10"
                >
                  {resendingEmail && <Loader2 size={13} className="animate-spin" />}
                  Reenviar confirmação
                </button>
              )}
            </div>
          </div>

          <ActionRow
            icon={KeyRound}
            title="Alterar senha"
            description="Atualize sua senha usando a senha atual. A renovação de sessão será invalidada."
            onClick={() => setActiveModal('change-password')}
          />
          <ActionRow
            icon={Eye}
            title="Sessões ativas"
            description="Gerenciamento avançado de sessões será adicionado em uma próxima etapa."
            onClick={() => setActiveModal('sessions')}
          />
          <ActionRow
            icon={ShieldCheck}
            title="Autenticação em dois fatores"
            description="Recurso em breve. Nenhum estado falso de 2FA será salvo agora."
            onClick={() => setActiveModal('two-factor')}
            last
          />
        </div>
      </section>

      <section className="mb-5 px-5" aria-labelledby="personal-data-title">
        <SectionTitle id="personal-data-title">Dados pessoais</SectionTitle>
        <div className="overflow-hidden rounded-2xl bg-white shadow-card dark:border dark:border-gray-800 dark:bg-gray-950">
          <ActionRow
            icon={Eye}
            title="Ver dados coletados"
            description="Veja um resumo seguro dos dados básicos usados pelo aplicativo."
            onClick={() => void handleViewCollectedData()}
          />
          <ActionRow
            icon={Download}
            title="Baixar meus dados"
            description="Gere um arquivo JSON local com conta, perfil, preferências e doações."
            onClick={() => void handleExportData()}
            loading={exportingData}
          />
          <ToggleRow
            title="Compartilhar dados de impacto"
            description="Permite uso agregado e anonimizado em relatórios de impacto social."
            checked={shareData}
            onChange={persistShareData}
            last
          />
        </div>
      </section>

      <section className="mb-5 px-5" aria-labelledby="communication-title">
        <SectionTitle id="communication-title">Comunicação e privacidade</SectionTitle>
        <div className="overflow-hidden rounded-2xl bg-white shadow-card dark:border dark:border-gray-800 dark:bg-gray-950">
          <ToggleRow
            title="Comunicações de marketing"
            description="Novidades, campanhas e conteúdos futuros. Não afeta e-mails de segurança."
            checked={marketing}
            onChange={persistMarketing}
          />
          <Link
            href="/configuracoes"
            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary dark:hover:bg-gray-900"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <MailCheck size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface dark:text-white">
                Preferências de notificações
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-300">
                Ajuste push, rastreio e e-mails informativos nas configurações gerais.
              </p>
            </div>
            <ChevronRight size={15} className="text-gray-300" />
          </Link>
        </div>
      </section>

      <section className="px-5" aria-labelledby="danger-zone-title">
        <SectionTitle id="danger-zone-title" danger>
          Zona de perigo
        </SectionTitle>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-red-700 dark:text-red-200">
                Encerrar ou excluir conta
              </p>
              <p className="mt-1 text-xs leading-relaxed text-red-600/80 dark:text-red-200/80">
                Doadores podem solicitar encerramento por e-mail. Perfis operacionais passam por
                revisão manual do suporte.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('danger')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:bg-red-950/50 dark:text-red-100 dark:hover:bg-red-900/60"
            >
              <Trash2 size={15} />
              Encerrar conta
            </button>
          </div>
        </div>
      </section>

      {activeModal === 'change-password' && (
        <Modal title="Alterar senha" titleId="change-password-title" onClose={() => setActiveModal(null)}>
          <form onSubmit={(event) => void handleChangePassword(event)} className="space-y-4">
            <PasswordField
              id="current-password"
              label="Senha atual"
              value={passwordForm.currentPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, currentPassword: value }))
              }
              invalid={Boolean(passwordError && !passwordForm.currentPassword)}
              describedBy="password-feedback"
            />
            <PasswordField
              id="new-password"
              label="Nova senha"
              value={passwordForm.newPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, newPassword: value }))
              }
              invalid={Boolean(passwordError && passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 8)}
              describedBy="password-help password-feedback"
            />
            <p id="password-help" className="text-xs text-gray-500 dark:text-gray-300">
              Use pelo menos 8 caracteres e uma senha diferente da atual.
            </p>
            <PasswordField
              id="confirm-new-password"
              label="Confirmar nova senha"
              value={passwordForm.confirmPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, confirmPassword: value }))
              }
              invalid={Boolean(
                passwordError &&
                  passwordForm.confirmPassword.length > 0 &&
                  passwordForm.confirmPassword !== passwordForm.newPassword,
              )}
              describedBy="password-feedback"
            />

            {passwordError && (
              <p
                id="password-feedback"
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
              >
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p
                id="password-feedback"
                aria-live="polite"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                {passwordSuccess}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-gray-700 dark:text-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={changingPassword}
                aria-busy={changingPassword}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-deeper px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {changingPassword && <Loader2 size={15} className="animate-spin" />}
                {changingPassword ? 'Alterando...' : 'Alterar senha'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'sessions' && (
        <Modal title="Sessões ativas" titleId="sessions-title" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <InfoBlock
              icon={Lock}
              title="Gerenciamento avançado em breve"
              description="A arquitetura atual invalida a renovação de sessão ao sair ou alterar a senha. A lista detalhada de dispositivos será uma próxima etapa."
            />
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/login' })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-900/60"
            >
              <LogOut size={15} />
              Sair desta conta
            </button>
          </div>
        </Modal>
      )}

      {activeModal === 'two-factor' && (
        <Modal title="Autenticação em dois fatores" titleId="two-factor-title" onClose={() => setActiveModal(null)}>
          <InfoBlock
            icon={ShieldCheck}
            title="Recurso em breve"
            description="A autenticação em dois fatores será adicionada em uma próxima etapa. Nenhum toggle fica ligado sem backend real."
          />
        </Modal>
      )}

      {activeModal === 'view-data' && (
        <Modal title="Dados coletados" titleId="view-data-title" onClose={() => setActiveModal(null)}>
          {dataLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300" aria-live="polite">
              <Loader2 size={16} className="animate-spin" />
              Carregando seus dados...
            </div>
          )}
          {dataError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-200">
              {dataError}
            </p>
          )}
          {dataSnapshot && !dataLoading && (
            <div className="space-y-4">
              <DataGroup title="Conta">
                <DataLine label="Nome" value={dataSnapshot.account.name ?? 'Não informado'} />
                <DataLine label="E-mail" value={dataSnapshot.account.email ?? 'Não informado'} />
                <DataLine
                  label="Status do e-mail"
                  value={dataSnapshot.account.emailVerifiedAt ? 'Verificado' : 'Não verificado'}
                />
                <DataLine label="Tipo de perfil" value={dataSnapshot.account.role ?? 'Não informado'} />
                <DataLine label="Criada em" value={formatDate(dataSnapshot.account.createdAt)} />
              </DataGroup>

              <DataGroup title="Perfil e preferências">
                <DataLine label="Telefone" value={dataSnapshot.profile?.phone ?? 'Não informado'} />
                <DataLine label="Cidade" value={dataSnapshot.profile?.city ?? 'Não informado'} />
                <DataLine label="Estado" value={dataSnapshot.profile?.state ?? 'Não informado'} />
                <DataLine
                  label="Marketing"
                  value={dataSnapshot.preferences.marketingCommunications ? 'Ativo' : 'Inativo'}
                />
                <DataLine
                  label="Dados de impacto"
                  value={dataSnapshot.preferences.shareImpactData ? 'Compartilhamento agregado ativo' : 'Inativo'}
                />
              </DataGroup>

              <DataGroup title="Atividade">
                <DataLine
                  label="Doações exportáveis"
                  value={
                    dataSnapshot.donations.count === null
                      ? 'Não disponível nesta versão'
                      : String(dataSnapshot.donations.count)
                  }
                />
                <DataLine
                  label="Notificações recentes"
                  value={
                    dataSnapshot.notifications.count === null
                      ? 'Não disponível nesta versão'
                      : String(dataSnapshot.notifications.count)
                  }
                />
              </DataGroup>
            </div>
          )}
        </Modal>
      )}

      {activeModal === 'danger' && (
        <Modal title="Encerrar conta" titleId="danger-title" onClose={() => setActiveModal(null)}>
          {canSelfDelete ? (
            <form onSubmit={(event) => void handleRequestAccountDeletion(event)} className="space-y-4">
              <InfoBlock
                icon={AlertTriangle}
                title="Confirmação por e-mail obrigatória"
                description="Ao confirmar o link enviado por e-mail, seu acesso será encerrado e seus dados pessoais serão anonimizados. Doações e rastreios podem permanecer como histórico operacional não pessoal."
                danger
              />

              <div className="space-y-2">
                <label htmlFor="account-deletion-confirmation" className="text-sm font-semibold text-on-surface dark:text-white">
                  Digite ENCERRAR para receber o link de confirmação
                </label>
                <input
                  id="account-deletion-confirmation"
                  value={deletionConfirmation}
                  onChange={(event) => {
                    setDeletionConfirmation(event.target.value);
                    setDeletionError(null);
                    setDeletionSuccess(null);
                  }}
                  aria-invalid={Boolean(deletionError)}
                  aria-describedby="account-deletion-feedback"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {deletionError && (
                <p
                  id="account-deletion-feedback"
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
                >
                  {deletionError}
                </p>
              )}
              {deletionSuccess && (
                <p
                  id="account-deletion-feedback"
                  aria-live="polite"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  {deletionSuccess}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-gray-700 dark:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={requestingDeletion || deletionConfirmation !== 'ENCERRAR'}
                  aria-busy={requestingDeletion}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                >
                  {requestingDeletion && <Loader2 size={15} className="animate-spin" />}
                  {requestingDeletion ? 'Enviando...' : 'Enviar e-mail de confirmação'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <InfoBlock
                icon={AlertTriangle}
                title="Encerramento com revisão manual"
                description="Contas de ponto de coleta, ONG e administrador podem ter vínculos operacionais, perfis públicos, parcerias e governança. Por isso, o encerramento self-service não está liberado para este perfil."
                danger
              />
              <a
                href="mailto:suporte@mosfet.com.br?subject=Solicitar%20encerramento%20de%20conta%20VestGO"
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary-deeper px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Solicitar suporte
              </a>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function SectionTitle({
  id,
  children,
  danger,
}: {
  id: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <h2
      id={id}
      className={`mb-3 text-[11px] font-semibold uppercase tracking-widest ${
        danger ? 'text-red-400' : 'text-gray-400'
      }`}
    >
      {children}
    </h2>
  );
}

function EmailBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200">
        <CheckCircle2 size={12} />
        E-mail verificado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle size={12} />
      E-mail não verificado
    </span>
  );
}

function ActionRow({
  icon: Icon,
  title,
  description,
  onClick,
  loading,
  last,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary dark:hover:bg-gray-900 ${
        last ? '' : 'border-b border-gray-100 dark:border-gray-800'
      }`}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-surface text-gray-500 dark:bg-gray-900 dark:text-gray-300">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface dark:text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-300">
          {description}
        </p>
      </div>
      <ChevronRight size={15} className="flex-shrink-0 text-gray-300" />
    </button>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  last,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-4 px-5 py-4 ${
        last ? '' : 'border-b border-gray-100 dark:border-gray-800'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface dark:text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-300">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-1 inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          checked ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function Modal({
  title,
  titleId,
  children,
  onClose,
}: {
  title: string;
  titleId: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:border dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-bold text-primary-deeper dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:bg-gray-900 dark:hover:text-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-on-surface dark:text-white">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  description,
  danger,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        danger
          ? 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200'
          : 'border-gray-100 bg-surface text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'
      }`}
    >
      <div className="flex gap-3">
        <Icon size={18} className={danger ? 'text-red-500' : 'text-primary'} />
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function DataGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
      <h3 className="text-sm font-bold text-primary-deeper dark:text-white">{title}</h3>
      <dl className="mt-3 space-y-2">{children}</dl>
    </section>
  );
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[160px_1fr]">
      <dt className="font-semibold text-gray-500 dark:text-gray-300">{label}</dt>
      <dd className="text-on-surface dark:text-white">{value}</dd>
    </div>
  );
}
