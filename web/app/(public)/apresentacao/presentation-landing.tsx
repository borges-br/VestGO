'use client';

import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Code2,
  ExternalLink,
  Gift,
  Globe,
  HeartHandshake,
  MapPin,
  MessageSquare,
  PackageCheck,
  Route,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { VestgoMark } from '@/components/branding/vestgo-mark';
import { cn } from '@/lib/utils';

// Edite estes links antes da feira se houver URLs finais de deploy e contatos.
const LINKS = {
  app: '/login',
  github: 'https://github.com/borges-br/VestGO',
  docs: 'https://github.com/borges-br/VestGO#readme',
  team: '#equipe',
  contactEmail: 'contato@vestgo.com.br',
};

const TEAM = [
  { name: 'Nome do integrante', role: 'Função no projeto', link: '#', initials: 'VG' },
  { name: 'Nome do integrante', role: 'Função no projeto', link: '#', initials: 'VG' },
  { name: 'Nome do integrante', role: 'Função no projeto', link: '#', initials: 'VG' },
  { name: 'Nome do integrante', role: 'Função no projeto', link: '#', initials: 'VG' },
];

const quickLinks: Array<{
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    label: 'App',
    description: 'Acessar demo',
    href: LINKS.app,
    icon: Smartphone,
  },
  {
    label: 'GitHub',
    description: 'Repositório',
    href: LINKS.github,
    icon: Code2,
  },
  {
    label: 'Docs',
    description: 'README técnico',
    href: LINKS.docs,
    icon: ClipboardList,
  },
  {
    label: 'Equipe',
    description: 'Integrantes e contatos',
    href: LINKS.team,
    icon: Users,
  },
];

const problemCards = [
  {
    title: 'Falta de rastreabilidade',
    text: 'Depois da entrega, o doador quase nunca acompanha o caminho real da doação.',
    icon: Route,
  },
  {
    title: 'Comunicação manual',
    text: 'Planilhas, mensagens soltas e confirmações informais atrasam a operação.',
    icon: MessageSquare,
  },
  {
    title: 'Controle limitado',
    text: 'Pontos de coleta lidam com volume, capacidade e triagem sem visão integrada.',
    icon: PackageCheck,
  },
  {
    title: 'Pouca transparência',
    text: 'O impacto final raramente volta para quem começou a corrente solidária.',
    icon: ShieldCheck,
  },
];

const solutionCards = [
  {
    title: 'Plataforma unificada',
    text: 'Doadores, pontos de coleta e ONGs no mesmo fluxo operacional.',
    icon: HeartHandshake,
  },
  {
    title: 'Jornada verificável',
    text: 'Cada doação ganha status, responsável e histórico de movimentação.',
    icon: BadgeCheck,
  },
  {
    title: 'Dados para operar melhor',
    text: 'A rede consegue organizar retiradas, capacidade e impacto com menos ruído.',
    icon: BarChart3,
  },
];

const journeySteps: Array<{
  title: string;
  text: string;
  icon: LucideIcon;
}> = [
  {
    title: 'Doador',
    text: 'Registra a doação e inicia uma trilha rastreável pelo app.',
    icon: Gift,
  },
  {
    title: 'Ponto de Coleta',
    text: 'Recebe, valida e organiza o volume com visibilidade operacional.',
    icon: MapPin,
  },
  {
    title: 'ONG',
    text: 'Planeja retiradas, consolida lotes e registra entregas.',
    icon: Building2,
  },
  {
    title: 'Impacto',
    text: 'Fecha o ciclo com transparência e retorno para quem doou.',
    icon: CheckCircle2,
  },
];

const features: Array<{
  title: string;
  text: string;
  icon: LucideIcon;
  className: string;
}> = [
  {
    title: 'Rastreamento de doações',
    text: 'Linha do tempo para acompanhar registro, coleta, retirada e entrega.',
    icon: Route,
    className: 'md:col-span-2 md:row-span-2 bg-[#f2f4f6]',
  },
  {
    title: 'Gestão de pontos',
    text: 'Recebimentos, capacidade e parcerias em uma tela operacional.',
    icon: MapPin,
    className: 'md:col-span-2 bg-emerald-50',
  },
  {
    title: 'Apoio para ONGs',
    text: 'Retiradas, lotes e entregas com mais previsibilidade.',
    icon: Building2,
    className: 'md:col-span-2 bg-slate-100',
  },
  {
    title: 'Gamificação',
    text: 'Níveis e conquistas para engajar sem perder o propósito.',
    icon: Trophy,
    className: 'md:col-span-2 bg-white',
  },
  {
    title: 'Impacto mensurável',
    text: 'Transparência para tornar a solidariedade mais confiável.',
    icon: BarChart3,
    className: 'md:col-span-2 bg-primary-deeper text-white',
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

type ActiveModal = 'opinion' | 'rating' | null;

type AnimatedLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  icon?: LucideIcon;
  showArrow?: boolean;
};

function AnimatedLink({
  href,
  children,
  className,
  ariaLabel,
  icon: Icon,
  showArrow = true,
}: AnimatedLinkProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [isLeaving, setIsLeaving] = useState(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    setIsLeaving(true);

    const delay = shouldReduceMotion ? 0 : 160;

    window.setTimeout(() => {
      if (!href || href === '#') {
        setIsLeaving(false);
        return;
      }

      if (href.startsWith('#')) {
        document.querySelector(href)?.scrollIntoView({
          behavior: shouldReduceMotion ? 'auto' : 'smooth',
          block: 'start',
        });
        window.history.pushState(null, '', href);
        setIsLeaving(false);
        return;
      }

      if (/^https?:\/\//.test(href)) {
        window.location.assign(href);
        return;
      }

      router.push(href);
    }, delay);
  }

  return (
    <motion.a
      href={href}
      aria-label={ariaLabel}
      onClick={handleClick}
      className={cn(
        'group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
      animate={isLeaving ? { scale: 0.97, opacity: 0.72 } : { scale: 1, opacity: 1 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
    >
      {Icon ? <Icon aria-hidden size={18} strokeWidth={1.9} /> : null}
      {children}
      {showArrow ? (
        <ArrowRight
          aria-hidden
          size={16}
          className="transition-transform duration-200 group-hover:translate-x-1"
          strokeWidth={2}
        />
      ) : null}
    </motion.a>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  center = false,
  invert = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  center?: boolean;
  invert?: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      className={cn('max-w-3xl', center && 'mx-auto text-center')}
    >
      <span
        className={cn(
          'text-xs font-black uppercase tracking-[0.2em]',
          invert ? 'text-primary-muted' : 'text-primary',
        )}
      >
        {eyebrow}
      </span>
      <h2
        className={cn(
          'mt-3 text-3xl font-black leading-tight tracking-[-0.01em] sm:text-4xl lg:text-5xl',
          invert ? 'text-white' : 'text-on-surface',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            'mt-4 text-base leading-7 sm:text-lg',
            invert ? 'text-white/70' : 'text-gray-600',
          )}
        >
          {description}
        </p>
      ) : null}
    </motion.div>
  );
}

function FeedbackModal({
  activeModal,
  onClose,
}: {
  activeModal: ActiveModal;
  onClose: () => void;
}) {
  const isOpinion = activeModal === 'opinion';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subject = isOpinion ? 'Opinião sobre o VestGO' : 'Avaliação da apresentação VestGO';
    const lines = Array.from(formData.entries()).map(([key, value]) => `${key}: ${value}`);
    const mailto = `mailto:${LINKS.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = mailto;
  }

  return (
    <AnimatePresence>
      {activeModal ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="w-full max-w-xl rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  Feedback
                </p>
                <h3 id="feedback-modal-title" className="mt-2 text-2xl font-black text-on-surface">
                  {isOpinion ? 'Dê sua opinião' : 'Avalie nossa apresentação'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isOpinion
                    ? 'Compartilhe uma sugestão, dúvida ou ideia para evoluir o produto.'
                    : 'Ajude a equipe a entender clareza, impacto visual e potencial do projeto.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Fechar modal"
              >
                <X aria-hidden size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {isOpinion ? (
                <>
                  <label className="block">
                    <span className="text-sm font-bold text-on-surface">Nome ou identificação</span>
                    <input
                      name="Nome"
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-white"
                      placeholder="Opcional"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-on-surface">Sua opinião</span>
                    <textarea
                      name="Opinião"
                      required
                      rows={5}
                      className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-white"
                      placeholder="O que chamou atenção? O que poderia melhorar?"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="text-sm font-bold text-on-surface">Perfil</span>
                    <select
                      name="Perfil"
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-white"
                    >
                      <option>Avaliador júnior</option>
                      <option>Avaliador pleno</option>
                      <option>Avaliador sênior</option>
                      <option>Professor</option>
                      <option>Aluno</option>
                      <option>Empresa</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-on-surface">Nota geral</span>
                    <select
                      name="Nota"
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-white"
                    >
                      <option>5 - Excelente</option>
                      <option>4 - Muito bom</option>
                      <option>3 - Bom</option>
                      <option>2 - Pode melhorar</option>
                      <option>1 - Precisa rever</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-on-surface">Comentário</span>
                    <textarea
                      name="Comentário"
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-white"
                      placeholder="Clareza, inovação, execução, impacto..."
                    />
                  </label>
                </>
              )}

              <div className="rounded-2xl bg-primary-light p-4 text-sm leading-6 text-primary-deeper">
                O envio abre um e-mail pré-preenchido. Para usar outro destino, altere
                `LINKS.contactEmail` no topo do arquivo.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-transform active:scale-[0.98]"
                >
                  <Send aria-hidden size={17} />
                  Enviar por e-mail
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AppPreview() {
  return (
    <div className="relative mx-auto mt-12 max-w-5xl rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-2xl backdrop-blur lg:p-6">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] bg-primary-deeper p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-muted">
                Rastreio ativo
              </p>
              <p className="mt-2 text-2xl font-black">Doação VG-2048</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <Route aria-hidden size={24} />
            </div>
          </div>
          <div className="mt-7 space-y-4">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const active = index < 3;

              return (
                <div key={step.title} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                      active
                        ? 'border-primary-glow bg-primary-glow text-primary-deeper'
                        : 'border-white/20 bg-white/10 text-white/70',
                    )}
                  >
                    <Icon aria-hidden size={18} />
                  </div>
                  <div>
                    <p className="font-bold">{step.title}</p>
                    <p className="text-sm leading-6 text-white/60">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.5rem] bg-surface p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
              Operação
            </p>
            <p className="mt-2 text-3xl font-black text-on-surface">86%</p>
            <p className="mt-1 text-sm text-gray-600">lotes com status atualizado</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
              <div className="h-full w-[86%] rounded-full bg-primary" />
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-primary p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
              Impacto
            </p>
            <p className="mt-2 text-3xl font-black">+124</p>
            <p className="mt-1 text-sm text-white/75">doações rastreadas na rede</p>
            <div className="mt-5 flex -space-x-2">
              {['D', 'P', 'O', 'I'].map((item) => (
                <span
                  key={item}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-white text-xs font-black text-primary"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-on-surface">Ponto parceiro mais próximo</p>
                <p className="mt-1 text-sm text-gray-600">Hub Solidário FACENS · Sorocaba</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <MapPin aria-hidden size={22} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PresentationLanding() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-surface text-on-surface">
      <FeedbackModal activeModal={activeModal} onClose={() => setActiveModal(null)} />

      <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-surface/90 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#links" className="flex items-center gap-3" aria-label="VestGO apresentação">
            <VestgoMark className="h-10 w-10" />
            <div>
              <p className="text-lg font-black leading-none text-primary">VestGO</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                FACENS
              </p>
            </div>
          </a>

          <AnimatedLink
            href={LINKS.app}
            icon={Globe}
            showArrow={false}
            className="bg-primary px-5 py-2.5 text-white shadow-lg shadow-emerald-600/20 hover:brightness-110"
          >
            Acessar app
          </AnimatedLink>
        </div>
      </header>

      <section id="links" className="bg-gradient-to-b from-primary/10 to-surface px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell">
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-black uppercase tracking-[0.22em] text-primary"
            >
              Acesso rápido - feira
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-3 text-4xl font-black tracking-[-0.02em] sm:text-5xl"
            >
              Links do Projeto
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-base text-gray-600">
              O essencial para avaliadores, professores, alunos e empresas em um QR Code.
            </motion.p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {quickLinks.map((link) => {
              const Icon = link.icon;

              return (
                <motion.div key={link.label} variants={fadeUp}>
                  <AnimatedLink
                    href={link.href}
                    icon={Icon}
                    showArrow={false}
                    className="h-full w-full justify-start gap-4 border border-white bg-white p-5 text-left text-on-surface shadow-sm hover:-translate-y-1 hover:shadow-card-lg"
                    ariaLabel={link.label}
                  >
                    <span className="flex flex-col">
                      <span className="text-base font-black">{link.label}</span>
                      <span className="text-sm font-medium text-gray-500">{link.description}</span>
                    </span>
                  </AnimatedLink>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="equipe" className="border-b border-gray-100 bg-surface px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell">
          <SectionHeader
            eyebrow="Equipe"
            title="O time por trás do impacto"
            description="Estrutura pronta para inserir nomes reais, papéis e links de LinkedIn ou contato."
            center
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4"
          >
            {TEAM.map((member, index) => (
              <motion.a
                key={`${member.name}-${index}`}
                variants={fadeUp}
                whileHover={{ y: -5 }}
                href={member.link}
                className="group text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Contato de ${member.name}`}
              >
                <div className="relative mx-auto mb-4 h-28 w-28 md:h-32 md:w-32">
                  <div className="absolute inset-0 rounded-2xl bg-primary transition-transform group-hover:rotate-6" />
                  <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white bg-primary-deeper text-2xl font-black text-white shadow-xl">
                    {member.initials}
                  </div>
                </div>
                <h3 className="text-lg font-black text-on-surface">{member.name}</h3>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                  {member.role}
                </p>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-surface px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell text-center">
          <SectionHeader
            eyebrow="Feedback e sugestões"
            title="Ajude o VestGO a evoluir"
            description="As respostas abrem em e-mail pré-preenchido, sem depender de backend ou banco de dados."
            center
          />
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <motion.button
              type="button"
              onClick={() => setActiveModal('opinion')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-base font-black text-white shadow-xl shadow-emerald-600/20 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MessageSquare aria-hidden size={21} />
              Dê sua opinião
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setActiveModal('rating')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-base font-black text-white shadow-xl shadow-emerald-600/20 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Star aria-hidden size={21} />
              Avalie nossa apresentação
            </motion.button>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-surface px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_0%,rgba(16,185,129,0.16),transparent_65%)]" />
        <div className="relative mx-auto max-w-shell text-center">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            <motion.p variants={fadeUp} className="text-xs font-black uppercase tracking-[0.22em] text-primary">
              VestGO
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[-0.02em] sm:text-5xl lg:text-6xl"
            >
              Doe com <span className="bg-gradient-to-br from-primary to-primary-dark bg-clip-text text-transparent">propósito</span>, acompanhe com transparência.
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Doações rastreáveis com tecnologia, transparência e impacto social, conectando
              doadores, pontos de coleta e ONGs em uma jornada mensurável.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <AnimatedLink
                href={LINKS.app}
                icon={Smartphone}
                className="bg-primary text-white shadow-xl shadow-emerald-600/20 hover:brightness-110"
              >
                Acessar aplicação
              </AnimatedLink>
              <AnimatedLink
                href={LINKS.github}
                icon={Code2}
                className="border border-gray-300 bg-white text-on-surface hover:bg-surface"
              >
                Ver repositório
              </AnimatedLink>
            </motion.div>
          </motion.div>

          <AppPreview />

          <div className="mt-12 flex flex-col items-center gap-2 text-gray-500">
            <span className="text-[10px] font-black uppercase tracking-[0.22em]">
              Saiba mais sobre o projeto
            </span>
            <ChevronDown aria-hidden className="animate-bounce text-primary" size={32} />
          </div>
        </div>
      </section>

      <section id="problema" className="bg-primary-deeper px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-shell gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <SectionHeader
            eyebrow="O problema"
            title="Por que o sistema atual falha?"
            description="Muitas doações sofrem com falta de rastreabilidade, comunicação manual, perda de controle e pouca transparência sobre o destino final."
            invert
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-4"
          >
            {problemCards.map((card) => {
              const Icon = card.icon;

              return (
                <motion.article
                  key={card.title}
                  variants={fadeUp}
                  whileHover={{ y: -3 }}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5"
                >
                  <Icon aria-hidden className="mt-1 shrink-0 text-primary-glow" size={24} />
                  <div>
                    <h3 className="text-xl font-black text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{card.text}</p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="solucao" className="bg-primary/5 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell">
          <SectionHeader
            eyebrow="A solução"
            title="A ponte entre intenção, operação e impacto"
            description="O VestGO acompanha a jornada da doação do registro até a entrega final, com status claros para cada ator da rede."
            center
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-10 grid gap-5 md:grid-cols-3"
          >
            {solutionCards.map((card) => {
              const Icon = card.icon;

              return (
                <motion.article
                  key={card.title}
                  variants={fadeUp}
                  whileHover={{ y: -5 }}
                  className="rounded-[2rem] border border-white bg-white/80 p-7 text-center shadow-lg backdrop-blur"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon aria-hidden size={30} />
                  </div>
                  <h3 className="mt-6 text-xl font-black text-on-surface">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{card.text}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="fluxo" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Fluxo visual"
          title="O ciclo da transparência"
          description="Doador → Ponto de Coleta → ONG → Impacto, sem caixa preta entre as etapas."
          center
        />

        <div className="relative mt-14">
          <div className="absolute bottom-0 left-6 top-0 w-px bg-gradient-to-b from-primary via-primary to-gray-300" />
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="relative space-y-12"
          >
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === journeySteps.length - 1;

              return (
                <motion.article key={step.title} variants={fadeUp} className="group flex gap-6">
                  <div
                    className={cn(
                      'z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-transform group-hover:scale-110',
                      isLast ? 'bg-primary-deeper' : 'bg-primary',
                    )}
                  >
                    <Icon aria-hidden size={22} />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-2xl font-black text-primary">{step.title}</h3>
                    <p className="mt-2 text-base leading-7 text-gray-600">{step.text}</p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="recursos" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell">
          <SectionHeader
            eyebrow="Recursos principais"
            title="Produto social com base técnica de produto real"
            description="Rastreio, gestão, operação, gamificação e visão de produto escalável em uma experiência clara para cada perfil."
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.18 }}
            className="mt-10 grid gap-4 md:grid-cols-4"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              const dark = feature.className.includes('text-white');

              return (
                <motion.article
                  key={feature.title}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  className={cn(
                    'relative overflow-hidden rounded-[2rem] border border-gray-200 p-7 shadow-sm',
                    feature.className,
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn('mb-5', dark ? 'text-primary-glow' : 'text-primary')}
                    size={36}
                  />
                  <h3 className={cn('text-2xl font-black', dark ? 'text-white' : 'text-on-surface')}>
                    {feature.title}
                  </h3>
                  <p className={cn('mt-3 text-sm leading-6', dark ? 'text-white/70' : 'text-gray-600')}>
                    {feature.text}
                  </p>
                  <div
                    className={cn(
                      'absolute -bottom-16 -right-16 h-44 w-44 rounded-full',
                      dark ? 'bg-white/10' : 'bg-primary/10',
                    )}
                    aria-hidden
                  />
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="bg-surface px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] bg-primary p-8 text-center text-white shadow-2xl shadow-emerald-700/20 sm:p-12">
          <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15 blur-3xl" />
          <div className="relative z-10">
            <VestgoMark className="mx-auto h-14 w-14" />
            <h2 className="mt-6 text-3xl font-black leading-tight sm:text-5xl">
              VestGO — tecnologia aplicada para tornar a solidariedade mais transparente,
              organizada e mensurável.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/80">
              Uma apresentação feita para ser escaneada rápido, mas lembrada depois.
            </p>
            <div className="mt-8 flex justify-center">
              <AnimatedLink
                href={LINKS.app}
                icon={Globe}
                className="bg-white text-primary hover:bg-surface"
              >
                Começar agora
              </AnimatedLink>
            </div>
          </div>
        </div>
      </section>

      <footer className="rounded-t-xl bg-primary-deeper px-4 py-10 text-center text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-shell flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <VestgoMark className="h-10 w-10" />
            <span className="text-xl font-black text-primary-glow">VestGO</span>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-sm font-bold text-white/65">
            <a href="#problema" className="transition-colors hover:text-white">
              Problema
            </a>
            <a href="#solucao" className="transition-colors hover:text-white">
              Solução
            </a>
            <a href="#fluxo" className="transition-colors hover:text-white">
              Jornada
            </a>
            <a href={LINKS.github} className="inline-flex items-center gap-1 transition-colors hover:text-white">
              GitHub
              <ExternalLink aria-hidden size={13} />
            </a>
          </div>
          <p className="text-sm text-white/45">© {new Date().getFullYear()} VestGO. Doações rastreáveis com propósito.</p>
        </div>
      </footer>
    </main>
  );
}
