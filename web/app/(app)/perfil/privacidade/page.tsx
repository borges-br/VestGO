'use client';
import {
  ShieldCheck, Lock, Eye, EyeOff, Bell, Trash2,
  ChevronRight, ToggleLeft, ToggleRight, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className="flex-shrink-0 mt-0.5 transition-transform active:scale-90"
      >
        {value ? (
          <ToggleRight size={28} className="text-primary" />
        ) : (
          <ToggleLeft size={28} className="text-gray-300" />
        )}
      </button>
    </div>
  );
}

export default function PrivacidadePage() {
  const [shareData, setShareData] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="pb-2">
      {/* ── Header ── */}
      <section className="px-5 pt-6 pb-4">
        <Link
          href="/perfil"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-4 hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar ao perfil
        </Link>
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
          Configurações
        </p>
        <h1 className="text-3xl font-bold text-primary-deeper">Privacidade</h1>
        <p className="text-sm text-gray-400 mt-1">Gerencie seus dados e preferências de segurança.</p>
      </section>

      {/* ── Segurança da conta ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Segurança da conta
        </p>
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {/* Autenticação 2 fatores */}
            <ToggleRow
              label="Autenticação em dois fatores"
              description="Adicione uma camada extra de segurança ao seu login."
              value={twoFactor}
              onChange={setTwoFactor}
            />
          </div>

          <div className="divide-y divide-gray-100 border-t border-gray-100">
            {[
              { icon: Lock, label: 'Alterar senha', href: '#' },
              { icon: Eye, label: 'Sessões ativas', href: '#' },
            ].map(({ icon: Icon, label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 px-5 py-4 hover:bg-surface transition-colors"
              >
                <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-gray-500" />
                </div>
                <span className="flex-1 text-sm text-on-surface">{label}</span>
                <ChevronRight size={15} className="text-gray-300" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacidade de dados ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Privacidade de dados
        </p>
        <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-gray-100">
          <ToggleRow
            label="Compartilhar dados de impacto"
            description="Permite que o VestGO use seus dados agregados (anonimizados) em relatórios públicos de impacto social."
            value={shareData}
            onChange={setShareData}
          />
          <ToggleRow
            label="Comunicações de marketing"
            description="Receba novidades, campanhas de doação e promoções dos nossos parceiros."
            value={marketing}
            onChange={setMarketing}
          />
        </div>
        <p className="text-[11px] text-gray-300 mt-2 px-1">
          Seus dados pessoais são tratados conforme a{' '}
          <Link href="/suporte" className="text-primary underline">
            Política de Privacidade
          </Link>{' '}
          e a LGPD.
        </p>
      </section>

      {/* ── Notificações ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Preferências de notificação
        </p>
        <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-gray-100">
          <ToggleRow
            label="Notificações push"
            description="Atualizações de status das suas doações em tempo real."
            value={pushNotif}
            onChange={setPushNotif}
          />
          <ToggleRow
            label="E-mails informativos"
            description="Resumos semanais e confirmações de doação por e-mail."
            value={emailNotif}
            onChange={setEmailNotif}
          />
        </div>
      </section>

      {/* ── Dados pessoais ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Meus dados
        </p>
        <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-gray-100">
          {[
            { icon: ShieldCheck, label: 'Baixar meus dados', href: '#' },
            { icon: EyeOff, label: 'Ver dados coletados', href: '#' },
          ].map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 px-5 py-4 hover:bg-surface transition-colors"
            >
              <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-gray-500" />
              </div>
              <span className="flex-1 text-sm text-on-surface">{label}</span>
              <ChevronRight size={15} className="text-gray-300" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Zona de perigo ── */}
      <section className="px-5 mb-8">
        <p className="text-[11px] font-semibold tracking-widest text-red-400 uppercase mb-3">
          Zona de perigo
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 font-semibold py-4 rounded-2xl hover:bg-red-100 transition-colors text-sm active:scale-[0.97]"
          >
            <Trash2 size={16} />
            Excluir minha conta
          </button>
        ) : (
          <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 size={16} className="text-red-500" />
              <p className="font-bold text-sm text-red-600">Confirmar exclusão</p>
            </div>
            <p className="text-xs text-red-500/80 leading-relaxed mb-4">
              Esta ação é irreversível. Todos os seus dados serão removidos permanentemente após 30 dias, conforme a LGPD. Histórico de impacto anonimizado pode ser preservado.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-white text-gray-600 font-semibold py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-red-600 transition-colors active:scale-95">
                Sim, excluir
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
