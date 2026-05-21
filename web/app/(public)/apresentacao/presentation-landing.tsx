'use client';

import {
  ArrowRight,
  Code2,
  ExternalLink,
  Github,
  Globe,
  Linkedin,
  Send,
  Smartphone,
  Star,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { VestgoMark } from '@/components/branding/vestgo-mark';
import { ProfileCard } from '@/components/ui/profile-card';
import { cn } from '@/lib/utils';

// Edite estes links antes da feira se houver URLs finais de deploy e contatos.
const LINKS = {
  app: '/login',
  github: 'https://github.com/borges-br/VestGO',
  team: '#equipe',
  feedbackWebhook: 'https://n8n.borgesti.com/webhook/mosfet-unifacens',
};

type TeamMember = {
  name: string;
  role: string;
  subrole: string | null;
  initials: string;
  photo: string;
  linkedin: string | null;
  github: string | null;
};

// Coloque os retratos em /public/images/team com nome compatível com o campo photo.
// Recomendação: .webp ou .jpg, enquadramento quadrado e 800x800 px ou maior.
const TEAM: TeamMember[] = [
  {
    name: 'Nathan Borges',
    role: 'Gestor e Dev do Projeto',
    subrole: 'Scrum Master',
    initials: 'NB',
    photo: '/images/team/nathan-borges.png',
    linkedin: 'https://www.linkedin.com/in/nathan-borges-ti/',
    github: 'https://github.com/borges-br/',
  },
  {
    name: 'Bernardo Comelli',
    role: 'Analista de Requisitos',
    subrole: 'Desenvolvedor de Sistemas da Informação',
    initials: 'BC',
    photo: '/images/team/bernardo-comelli.png',
    linkedin: 'https://www.linkedin.com/in/bernardo-comelli-dos-santos-1821b3353/',
    github: null,
  },
  {
    name: 'Julio Melendes',
    role: 'Analista de Viabilidade',
    subrole: null,
    initials: 'JM',
    photo: '/images/team/julio-melendes.png',
    linkedin: null,
    github: 'https://github.com/Melendesz',
  },
  {
    name: 'Henrique Barros',
    role: 'Arquitetura de Sistemas',
    subrole: 'Desenvolvedor de Algoritmos',
    initials: 'HB',
    photo: '/images/team/henrique-barros.png',
    linkedin: 'https://www.linkedin.com/in/henrique-barros-4751313a0/',
    github: 'https://github.com/DeathHapyness',
  },
  {
    name: 'Antônio Carlos',
    role: 'Suporte e Manutenção',
    subrole: null,
    initials: 'AC',
    photo: '/images/team/antonio-carlos.png',
    linkedin: null,
    github: null,
  },
  {
    name: 'Guilherme Carvalho',
    role: 'Consultor de Usabilidade',
    subrole: null,
    initials: 'GC',
    photo: '/images/team/guilherme-carvalho.png',
    linkedin: null,
    github: null,
  },
  {
    name: 'Francisco Comelli',
    role: 'Product Owner (P.O.)',
    subrole: null,
    initials: 'FC',
    photo: '/images/team/francisco-comelli.png',
    linkedin: null,
    github: null,
  },
];

type ActiveModal = 'rating' | null;

const quickLinks: Array<{
  label: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  disabled?: boolean;
  modal?: Exclude<ActiveModal, null>;
}> = [
  {
    label: 'App',
    description: 'Acessar a plataforma',
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
    label: 'Equipe',
    description: 'Integrantes, fotos e contatos',
    href: LINKS.team,
    icon: Users,
  },
  {
    label: 'Nos avalie',
    description: 'Avaliação anônima',
    icon: Star,
    modal: 'rating',
  },
];

const odsItems = [
  {
    number: '03',
    title: 'Saúde e bem-estar',
    text: 'Apoio direto a iniciativas sociais que fortalecem redes de cuidado e assistência.',
  },
  {
    number: '10',
    title: 'Redução das desigualdades',
    text: 'Conecta doadores, pontos de coleta e ONGs com uma operação mais acessível e transparente.',
  },
  {
    number: '12',
    title: 'Consumo e produção responsáveis',
    text: 'Estimula o reaproveitamento e uma logística mais consciente de itens doados.',
  },
  {
    number: '17',
    title: 'Parcerias e meios de implementação',
    text: 'Valoriza integração entre universidade, comunidade e organizações parceiras.',
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

type RatingKey = 'apresentacao' | 'uiux' | 'proposta' | 'justificativa' | 'clareza';

type RatingState = Record<RatingKey, number>;

const RATING_FIELDS: Array<{ key: RatingKey; label: string }> = [
  { key: 'apresentacao', label: 'Apresentação' },
  { key: 'uiux', label: 'UI/UX' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'justificativa', label: 'Justificativa' },
  { key: 'clareza', label: 'Clareza' },
];

const RATING_LABELS = {
  1: 'Não satisfatório',
  2: 'Pode melhorar',
  3: 'Razoável',
  4: 'Bom',
  5: 'Ótimo',
} as const;

type RatingValue = keyof typeof RATING_LABELS;

const RATING_FEEDBACK_STYLES: Record<RatingValue, string> = {
  1: 'border-red-200 bg-red-50 text-red-700',
  2: 'border-orange-200 bg-orange-50 text-orange-700',
  3: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  4: 'border-lime-200 bg-lime-50 text-lime-700',
  5: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const RATING_STAR_STYLES: Record<RatingValue, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-yellow-500',
  4: 'text-lime-500',
  5: 'text-emerald-500',
};

const INITIAL_RATINGS: RatingState = {
  apresentacao: 0,
  uiux: 0,
  proposta: 0,
  justificativa: 0,
  clareza: 0,
};

type AnimatedLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  icon?: LucideIcon;
  showArrow?: boolean;
  disabled?: boolean;
};

function AnimatedLink({
  href,
  children,
  className,
  ariaLabel,
  icon: Icon,
  showArrow = true,
  disabled = false,
}: AnimatedLinkProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [isLeaving, setIsLeaving] = useState(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }

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

  const sharedContent = (
    <>
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
    </>
  );

  if (disabled) {
    return (
      <motion.span
        aria-disabled="true"
        aria-label={ariaLabel}
        className={cn(
          'group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold opacity-60 grayscale transition-all',
          className,
        )}
      >
        {sharedContent}
      </motion.span>
    );
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
      {sharedContent}
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

function TeamPortrait({
  member,
  className,
}: {
  member: TeamMember;
  className: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <div className={className}>{member.initials}</div>;
  }

  return (
    <img
      src={member.photo}
      alt={`Foto de ${member.name}`}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

function TeamMemberModal({
  member,
  onClose,
}: {
  member: TeamMember | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {member ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,246,0.96))] p-5 shadow-2xl sm:p-7"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-[1.5rem] border border-white bg-primary-deeper shadow-lg sm:h-24 sm:w-24">
                  <TeamPortrait
                    member={member}
                    className="flex h-full w-full items-center justify-center object-cover text-xl font-black text-white"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                    Integrante da equipe
                  </p>
                  <h3 id="team-modal-title" className="mt-2 text-2xl font-black text-on-surface">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-gray-600">{member.role}</p>
                </div>
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

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
              {member.subrole ? (
                <div className="rounded-[1.5rem] border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                    Papel adicional
                  </p>
                  <p className="mt-2 text-sm leading-7 text-gray-700">{member.subrole}</p>
                </div>
              ) : null}

              <div className="rounded-[1.5rem] border border-gray-200 bg-surface p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                  Redes
                </p>
                <div className="mt-4 flex gap-3">
                  {[
                    { label: 'LinkedIn', href: member.linkedin, icon: Linkedin },
                    { label: 'GitHub', href: member.github, icon: Github },
                  ].map((social) => {
                    const Icon = social.icon;

                    if (!social.href) {
                      return (
                        <span
                          key={social.label}
                          aria-disabled="true"
                          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-400 grayscale"
                          title={`${social.label} não informado`}
                        >
                          <Icon aria-hidden size={20} />
                        </span>
                      );
                    }

                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-primary transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={social.label}
                        title={social.label}
                      >
                        <Icon aria-hidden size={20} />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function FeedbackModal({
  activeModal,
  onClose,
}: {
  activeModal: ActiveModal;
  onClose: () => void;
}) {
  const [ratings, setRatings] = useState<RatingState>(INITIAL_RATINGS);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (activeModal) {
      setRatings(INITIAL_RATINGS);
      setComment('');
      setStatus('idle');
      setIsSubmitting(false);
    }
  }, [activeModal]);

  function setScore(key: RatingKey, value: number) {
    setRatings((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setStatus('idle');

    const payload = {
      source: 'vestgo-presentation',
      anonymous: true,
      submittedAt: new Date().toISOString(),
      webhookTarget: LINKS.feedbackWebhook,
      ratings,
      labels: Object.fromEntries(
        Object.entries(ratings).map(([key, value]) => [key, value ? RATING_LABELS[value as keyof typeof RATING_LABELS] : ''])
      ),
      comment,
    };

    try {
      const response = await fetch(LINKS.feedbackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Webhook returned a non-OK response');
      }

      setStatus('success');
      setRatings(INITIAL_RATINGS);
      setComment('');
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {activeModal ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
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
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,246,0.97))] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-7"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Feedback</p>
                <h3 id="feedback-modal-title" className="mt-2 text-2xl font-black text-on-surface">
                  Avalie nosso projeto
                </h3>
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

            <div className="mt-6 space-y-5">
              <div className="rounded-2xl bg-primary-light p-4 text-sm leading-6 text-primary-deeper">
                A avaliação é anônima. Escolha entre 1 e 5 estrelas para cada critério e, se quiser, adicione uma opinião livre ao final.
              </div>

              <div className="grid gap-4">
                {RATING_FIELDS.map((field) => {
                  const value = ratings[field.key];

                  return (
                    <div key={field.key} className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div>
                          <p className="text-sm font-black text-on-surface">{field.label}</p>
                          {!value ? (
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                              Selecione uma nota
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {[1, 2, 3, 4, 5].map((score) => {
                            const active = score <= value;
                            const ratingValue = value as RatingValue;

                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setScore(field.key, score)}
                                className={cn(
                                  'rounded-full transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                  active && value ? RATING_STAR_STYLES[ratingValue] : 'text-gray-300',
                                )}
                                aria-label={`${field.label}: ${score} estrela${score > 1 ? 's' : ''}`}
                              >
                                <Star aria-hidden size={24} fill={active ? 'currentColor' : 'none'} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {value ? (
                        <p
                          className={cn(
                            'mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em]',
                            RATING_FEEDBACK_STYLES[value as RatingValue],
                          )}
                        >
                          {value} estrela{value > 1 ? 's' : ''} · {RATING_LABELS[value as RatingValue]}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <label className="block rounded-[1.5rem] border border-gray-200 bg-white p-5 shadow-sm">
                <span className="text-sm font-bold text-on-surface">Opinião em texto</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-white"
                  placeholder="Escreva comentários, sugestões ou observações adicionais."
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Send aria-hidden size={17} />
                  {isSubmitting ? 'Enviando...' : 'Enviar avaliação'}
                </button>
              </div>

              {status === 'success' ? (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  Avaliação enviada com sucesso.
                </div>
              ) : null}

              {status === 'error' ? (
                <div className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-900">
                  Não foi possível enviar para o webhook configurado.
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function PresentationLanding() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-surface text-on-surface">
      <FeedbackModal activeModal={activeModal} onClose={() => setActiveModal(null)} />
      <TeamMemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />

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
              Obrigado por me escanear! :)
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-3 text-4xl font-black tracking-[-0.02em] sm:text-5xl"
            >
              Links Úteis
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-base text-gray-600">
              MOSFET - Análise e Desenvolvimento de Sistemas 1º Semestre
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
              const content = (
                <>
                  <Icon aria-hidden size={18} strokeWidth={1.9} />
                  <span className="flex flex-col">
                    <span className="text-base font-black">{link.label}</span>
                    <span className="text-sm font-medium text-gray-500">{link.description}</span>
                  </span>
                </>
              );

              return (
                <motion.div key={link.label} variants={fadeUp}>
                  {link.modal ? (
                    <motion.button
                      type="button"
                      onClick={() => setActiveModal(link.modal ?? null)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="group inline-flex h-full min-h-12 w-full items-center justify-start gap-4 rounded-2xl border border-white bg-white p-5 text-left text-sm font-bold text-on-surface shadow-sm transition-all hover:-translate-y-1 hover:shadow-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      aria-label={link.label}
                    >
                      {content}
                    </motion.button>
                  ) : (
                    <AnimatedLink
                      href={link.href ?? '#'}
                      icon={Icon}
                      showArrow={false}
                      disabled={link.disabled}
                      className="h-full w-full justify-start gap-4 border border-white bg-white p-5 text-left text-on-surface shadow-sm hover:-translate-y-1 hover:shadow-card-lg"
                      ariaLabel={link.label}
                    >
                      <span className="flex flex-col">
                        <span className="text-base font-black">{link.label}</span>
                        <span className="text-sm font-medium text-gray-500">{link.description}</span>
                      </span>
                    </AnimatedLink>
                  )}
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
            title="O time por trás do projeto"
            description="Clique na foto para abrir o perfil completo."
            center
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center"
          >
            {TEAM.map((member, index) => (
              <motion.article
                key={`${member.name}-${index}`}
                variants={fadeUp}
                className="w-full max-w-[340px]"
              >
                <ProfileCard
                  name={member.name}
                  title={member.role}
                  subrole={member.subrole}
                  handle={member.name.toLowerCase().replace(/\s+/g, '')}
                  status={member.subrole || 'Colaborador'}
                  contactText="Contatar"
                  avatarUrl={member.photo}
                  showUserInfo={true}
                  enableTilt={true}
                  enableMobileTilt={true}
                  onContactClick={() => setSelectedMember(member)}
                  behindGlowEnabled={true}
                  behindGlowColor="rgba(16, 185, 129, 0.4)"
                  behindGlowSize="60%"
                  innerGradient="linear-gradient(145deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)"
                />
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="ods" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell">
          <SectionHeader
            eyebrow="ODS relacionadas"
            title="Impacto alinhado com objetivos globais"
            description="As metas abaixo reforçam o posicionamento social do VestGO e o propósito da solução apresentada."
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            {odsItems.map((item) => (
              <motion.article
                key={item.number}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,244,246,0.92))] p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                      ODS {item.number}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-on-surface">{item.title}</h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-lg font-black text-primary">
                    {item.number}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600">{item.text}</p>
                <div
                  className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-primary/10"
                  aria-hidden
                />
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-surface px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell text-center">
          <SectionHeader
            eyebrow="Feedback e sugestões"
            title="Avalie nosso projeto"
            description="Votação anônima para cinco critérios, com envio direto para o webhook configurado."
            center
          />
          <div className="mt-8 flex justify-center">
            <motion.button
              type="button"
              onClick={() => setActiveModal('rating')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-base font-black text-white shadow-xl shadow-emerald-600/20 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Star aria-hidden size={21} />
              Avalie nosso projeto
            </motion.button>
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
            <a href={LINKS.app} className="transition-colors hover:text-white">
              Aplicação
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
