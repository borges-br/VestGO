'use client';

import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Linkedin, Github } from 'lucide-react';
import { ProfileCard } from '@/components/ui/profile-card';

type TeamMember = {
  name: string;
  role: string;
  subrole: string | null;
  initials: string;
  photo: string;
  linkedin: string | null;
  github: string | null;
};

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
    github: null,
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
                <div className="text-left">
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

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start text-left">
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

export function TeamSection() {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section id="equipe" className="relative border-t border-gray-100 bg-surface-cream px-4 py-20 sm:px-6 lg:px-8 lg:py-28 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,106,98,0.05),transparent_60%)]" />
      <div className="relative mx-auto max-w-shell text-center">
        <div className="max-w-3xl mx-auto">
          <span className="vg-eyebrow border border-primary/15 bg-white text-primary">
            Equipe
          </span>
          <h2 className="mt-5 vg-display text-primary-deeper text-4xl sm:text-5xl lg:text-[3.75rem]">
            O time por trás do impacto,
            <br />
            <span className="text-primary">construindo o amanhã.</span>
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-base leading-8 text-gray-600 sm:text-lg">
            Conheça os desenvolvedores e participantes do projeto que idealizaram e estruturaram o VestGO para tornar a solidariedade rastreável.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center"
        >
          {TEAM.map((member, index) => (
            <motion.article
              key={`${member.name}-${index}`}
              variants={itemVariants}
              className="w-full max-w-[340px]"
            >
              <ProfileCard
                name={member.name}
                title={member.role}
                subrole={member.subrole}
                initials={member.initials}
                handle={member.name.toLowerCase().replace(/\s+/g, '')}
                status={member.subrole || 'Colaborador'}
                contactText="Contatar"
                avatarUrl={member.photo}
                showUserInfo={true}
                enableTilt={true}
                enableMobileTilt={true}
                onContactClick={() => setSelectedMember(member)}
                behindGlowEnabled={true}
                behindGlowColor="rgba(0, 106, 98, 0.35)"
                behindGlowSize="60%"
                innerGradient="linear-gradient(145deg, rgba(0, 106, 98, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)"
              />
            </motion.article>
          ))}
        </motion.div>

        <TeamMemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      </div>
    </section>
  );
}
export default TeamSection;
