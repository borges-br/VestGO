'use client';

import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Globe,
  MapPin,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { VestgoMark } from '@/components/branding/vestgo-mark';
import { cn } from '@/lib/utils';

// Edite estes links antes da feira se houver URLs finais de deploy, pitch e contatos.
const LINKS = {
  app: '/login',
  github: 'https://github.com/borges-br/VestGO',
  docs: 'https://github.com/borges-br/VestGO#readme',
  pitch: '#pitch',
  team: '#equipe',
};

const TEAM = [
  { name: 'Nome do integrante', role: 'Função no projeto', link: '#' },
  { name: 'Nome do integrante', role: 'Função no projeto', link: '#' },
  { name: 'Nome do integrante', role: 'Função no projeto', link: '#' },
  { name: 'Nome do integrante', role: 'Função no projeto', link: '#' },
];

const problemCards = [
  {
    title: 'Rastreio perdido',
    text: 'Depois da entrega, o doador raramente acompanha o caminho da doação.',
  },
  {
    title: 'Comunicação manual',
    text: 'Planilhas, mensagens soltas e confirmações informais dificultam a operação.',
  },
  {
    title: 'Controle limitado',
    text: 'Pontos de coleta lidam com volume, capacidade e triagem sem visão integrada.',
  },
  {
    title: 'Pouca transparência',
    text: 'ONGs recebem e distribuem, mas o impacto final quase nunca volta ao doador.',
  },
];

const solutionPoints = [
  'Registro digital da doação',
  'Status por etapa da jornada',
  'Operação conectada entre ponto e ONG',
  'Impacto mais claro para quem doa',
];

const journeySteps: Array<{
  title: string;
  text: string;
  icon: LucideIcon;
  tone: string;
}> = [
  {
    title: 'Doador',
    text: 'Registra a doação e gera uma trilha rastreável.',
    icon: Users,
    tone: 'bg-[#e6f4f3] text-primary',
  },
  {
    title: 'Ponto de Coleta',
    text: 'Confirma recebimento, organiza volume e capacidade.',
    icon: MapPin,
    tone: 'bg-[#fbe7c2] text-[#9a5a0b]',
  },
  {
    title: 'ONG',
    text: 'Planeja retiradas, consolida lotes e registra entregas.',
    icon: Package,
    tone: 'bg-[#e8f0df] text-[#4d6b3f]',
  },
  {
    title: 'Impacto',
    text: 'Fecha o ciclo com transparência e mensuração.',
    icon: Trophy,
    tone: 'bg-[#ecf7ff] text-[#155e75]',
  },
];

const features: Array<{
  title: string;
  text: string;
  icon: LucideIcon;
}> = [
  {
    title: 'Rastreamento de doações',
    text: 'Linha do tempo para acompanhar registro, coleta, retirada e entrega.',
    icon: Route,
  },
  {
    title: 'Gestão de pontos de coleta',
    text: 'Recebimentos, capacidade, parcerias e organização operacional em um só fluxo.',
    icon: MapPin,
  },
  {
    title: 'Apoio operacional para ONGs',
    text: 'Retiradas, lotes e entregas com mais previsibilidade e menos ruído.',
    icon: Users,
  },
  {
    title: 'Gamificação e engajamento',
    text: 'Níveis e conquistas incentivam recorrência sem perder o propósito social.',
    icon: Trophy,
  },
  {
    title: 'Transparência de impacto',
    text: 'O doador entende para onde a doação foi e por que aquilo importa.',
    icon: ShieldCheck,
  },
  {
    title: 'Produto escalável',
    text: 'Arquitetura full-stack pronta para crescer com novas redes e parceiros.',
    icon: Target,
  },
];

const linkCards: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}> = [
  {
    label: 'Aplicação web',
    href: LINKS.app,
    icon: Globe,
    description: 'Entrar no VestGO',
  },
  {
    label: 'Repositório GitHub',
    href: LINKS.github,
    icon: Route,
    description: 'Código-fonte',
  },
  {
    label: 'README/documentação',
    href: LINKS.docs,
    icon: ClipboardList,
    description: 'Visão técnica',
  },
  {
    label: 'Pitch/apresentação',
    href: LINKS.pitch,
    icon: Sparkles,
    description: 'Resumo do projeto',
  },
  {
    label: 'Equipe e contatos',
    href: LINKS.team,
    icon: Users,
    description: 'Integrantes',
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

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

    const delay = shouldReduceMotion ? 0 : 170;

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
        'group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        className,
      )}
      animate={isLeaving ? { scale: 0.97, opacity: 0.78 } : { scale: 1, opacity: 1 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
    >
      {Icon ? <Icon aria-hidden size={17} strokeWidth={1.8} /> : null}
      {children}
      {showArrow ? (
        <ArrowRight
          aria-hidden
          size={16}
          className="transition-transform duration-200 group-hover:translate-x-1"
          strokeWidth={1.8}
        />
      ) : null}
    </motion.a>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  invert = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  invert?: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      className="max-w-3xl"
    >
      <p
        className={cn(
          'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
          invert
            ? 'border-white/20 bg-white/10 text-primary-muted'
            : 'border-primary/20 bg-white text-primary',
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          'mt-5 text-3xl font-black leading-none sm:text-4xl lg:text-5xl',
          invert ? 'text-white' : 'text-primary-deeper',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            'mt-4 max-w-2xl text-base leading-7 sm:text-lg',
            invert ? 'text-white/70' : 'text-gray-600',
          )}
        >
          {description}
        </p>
      ) : null}
    </motion.div>
  );
}

function HeroScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#071a1d_0%,#00333c_52%,#0a1f22_100%)]" />
      <div className="absolute inset-0 bg-grid-dark opacity-60" />
      <div className="absolute inset-0 bg-noise opacity-20" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,rgba(7,26,29,0),#f8faf9)]" />

      <motion.div
        className="absolute left-[52%] top-[16%] hidden h-[28rem] w-[42%] rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-sm lg:block"
        initial={{ opacity: 0, y: 28, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        className="absolute left-[56%] top-[46%] hidden h-px w-[34%] origin-left bg-primary-glow/50 lg:block"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 1.1, delay: 0.25 }}
      />

      {journeySteps.map((step, index) => {
        const Icon = step.icon;
        const positions = [
          'left-[53%] top-[24%]',
          'left-[61%] top-[54%]',
          'left-[73%] top-[30%]',
          'left-[81%] top-[56%]',
        ];

        return (
          <motion.div
            key={step.title}
            className={cn(
              'absolute hidden w-36 rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-ring backdrop-blur-md lg:block xl:w-40',
              positions[index],
            )}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.75,
              delay: 0.35 + index * 0.11,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Icon size={18} strokeWidth={1.8} />
            </div>
            <p className="mt-3 text-sm font-bold">{step.title}</p>
            <p className="mt-1 text-xs leading-5 text-white/60">{step.text}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

export function PresentationLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8faf9] text-on-surface">
      <section className="relative isolate flex min-h-[92svh] flex-col overflow-hidden text-white">
        <HeroScene />

        <header className="relative z-10 mx-auto flex w-full max-w-shell items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <a href="#topo" className="flex items-center gap-3" aria-label="VestGO no topo">
            <VestgoMark className="h-10 w-10" />
            <div>
              <p className="text-base font-black leading-none">VestGO</p>
              <p className="mt-1 text-xs text-white/50">FACENS</p>
            </div>
          </a>
          <AnimatedLink
            href={LINKS.github}
            icon={Route}
            showArrow={false}
            className="hidden border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:inline-flex"
          >
            Repositório
          </AnimatedLink>
        </header>

        <div
          id="topo"
          className="relative z-10 mx-auto flex w-full max-w-shell flex-1 items-center px-4 pb-16 pt-6 sm:px-6 lg:px-8"
        >
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="max-w-4xl"
          >
            <motion.p
              variants={fadeUp}
              className="inline-flex rounded-full border border-primary-glow/30 bg-primary-glow/10 px-3 py-1 text-xs font-semibold text-primary-muted backdrop-blur"
            >
              Feira acadêmica FACENS
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-6 text-5xl font-black leading-none xs:text-6xl sm:text-7xl lg:text-8xl"
            >
              VestGO
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-3xl text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl"
            >
              Doações rastreáveis com tecnologia, transparência e impacto social.
            </motion.p>
            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg"
            >
              Uma plataforma que conecta doadores, pontos de coleta e ONGs para tornar a
              jornada da doação mais organizada, visível e mensurável.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <AnimatedLink
                href={LINKS.app}
                icon={Globe}
                className="bg-white text-primary-deeper shadow-hero hover:bg-primary-light"
              >
                Acessar aplicação
              </AnimatedLink>
              <AnimatedLink
                href={LINKS.github}
                icon={Route}
                className="border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
              >
                Ver repositório
              </AnimatedLink>
              <AnimatedLink
                href={LINKS.team}
                icon={Users}
                className="border border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                Conhecer equipe
              </AnimatedLink>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-8 grid max-w-2xl grid-cols-2 gap-3 text-sm text-white/70 sm:grid-cols-4"
            >
              {['Doador', 'Coleta', 'ONG', 'Impacto'].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur"
                >
                  <CheckCircle2 aria-hidden size={15} className="mb-2 text-primary-glow" />
                  {item}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="problema" className="bg-[#f8faf9]">
        <div className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeader
            eyebrow="O problema"
            title="Doar ainda é fácil. Provar o caminho da doação, não."
            description="Muitas iniciativas dependem de boa vontade, mas operam com pouca rastreabilidade, comunicação manual e baixa visibilidade do destino final."
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {problemCards.map((card) => (
              <motion.article
                key={card.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-primary-deeper/10 bg-white p-5 shadow-card transition-shadow hover:shadow-card-lg"
              >
                <p className="text-lg font-black text-primary-deeper">{card.title}</p>
                <p className="mt-3 text-sm leading-6 text-gray-600">{card.text}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="pitch" className="bg-primary-deeper text-white">
        <div className="mx-auto grid max-w-shell gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <SectionHeader
            eyebrow="A solução"
            title="Uma plataforma para acompanhar a jornada do registro à entrega final."
            description="O VestGO transforma a doação em um fluxo operacional claro: cada etapa tem contexto, responsável e status."
            invert
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="grid gap-3 sm:grid-cols-2"
          >
            {solutionPoints.map((point) => (
              <motion.div
                key={point}
                variants={fadeUp}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur"
              >
                <CheckCircle2 aria-hidden className="text-primary-glow" size={20} />
                <p className="mt-4 text-base font-bold">{point}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="fluxo" className="bg-white">
        <div className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeader
            eyebrow="Fluxo visual"
            title="Doador, ponto de coleta, ONG e impacto no mesmo mapa de operação."
            description="A jornada deixa de ser uma caixa preta e vira um caminho simples de entender em segundos."
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="relative mt-12 grid gap-4 lg:grid-cols-4"
          >
            <div className="absolute left-8 right-8 top-16 hidden h-px bg-primary/20 lg:block" />
            {journeySteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.article
                  key={step.title}
                  variants={fadeUp}
                  whileHover={{ y: -5 }}
                  className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-lg"
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl',
                      step.tone,
                    )}
                  >
                    <Icon aria-hidden size={21} strokeWidth={1.8} />
                  </div>
                  <p className="mt-5 text-lg font-black text-primary-deeper">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{step.text}</p>
                  {index < journeySteps.length - 1 ? (
                    <div className="mt-5 flex items-center gap-2 text-xs font-bold text-primary lg:hidden">
                      Próxima etapa
                      <ArrowRight aria-hidden size={14} />
                    </div>
                  ) : null}
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="recursos" className="bg-[#eef6f4]">
        <div className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeader
            eyebrow="Recursos principais"
            title="Produto social com base técnica de produto real."
            description="O foco é reduzir improviso, aumentar confiança e deixar a operação pronta para evoluir."
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.18 }}
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <motion.article
                  key={feature.title}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-primary-deeper/10 bg-white/80 p-5 shadow-card backdrop-blur transition-shadow hover:shadow-card-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
                    <Icon aria-hidden size={20} strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-5 text-lg font-black text-primary-deeper">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{feature.text}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="links" className="bg-white">
        <div className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeader
            eyebrow="Links rápidos"
            title="Tudo que o avaliador precisa acessar em um toque."
            description="Aplicação, código, documentação, pitch e contatos reunidos para a leitura por QR Code."
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            {linkCards.map((link) => {
              const Icon = link.icon;

              return (
                <motion.div key={link.label} variants={fadeUp}>
                  <AnimatedLink
                    href={link.href}
                    icon={Icon}
                    showArrow={false}
                    className="h-full w-full flex-col items-start border border-gray-100 bg-[#f8faf9] text-left text-primary-deeper shadow-card hover:bg-primary-light hover:text-primary"
                    ariaLabel={link.label}
                  >
                    <span className="text-base font-black">{link.label}</span>
                    <span className="text-sm font-medium text-gray-500">{link.description}</span>
                  </AnimatedLink>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="equipe" className="bg-primary-deeper text-white">
        <div className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeader
            eyebrow="Equipe"
            title="Pessoas construindo tecnologia para impacto social mensurável."
            description="Os cards abaixo estão prontos para receber nomes, funções e links de LinkedIn ou contato dos integrantes."
            invert
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {TEAM.map((member, index) => (
              <motion.a
                key={`${member.name}-${index}`}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                href={member.link}
                className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 text-white backdrop-blur transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-glow"
                aria-label={`Contato de ${member.name}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-glow/20 text-primary-glow">
                  <Users aria-hidden size={20} strokeWidth={1.8} />
                </div>
                <p className="mt-5 text-lg font-black">{member.name}</p>
                <p className="mt-2 text-sm leading-6 text-white/60">{member.role}</p>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#071a1d] text-white">
        <div className="absolute inset-0 bg-grid-dark opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-shell px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <VestgoMark className="mx-auto h-14 w-14" />
            <p className="mx-auto mt-6 max-w-3xl text-2xl font-black leading-tight sm:text-4xl">
              VestGO — tecnologia aplicada para tornar a solidariedade mais transparente,
              organizada e mensurável.
            </p>
            <div className="mt-8 flex justify-center">
              <AnimatedLink
                href={LINKS.app}
                icon={Globe}
                className="bg-white text-primary-deeper hover:bg-primary-light"
              >
                Acessar aplicação
              </AnimatedLink>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
