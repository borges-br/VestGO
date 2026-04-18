'use client';
import { useState, useMemo } from 'react';
import {
  HelpCircle, Search, ChevronDown, ChevronUp,
  MessageCircle, Mail, FileText, ShieldCheck, ExternalLink,
} from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  // Doações
  {
    id: 'faq-1',
    category: 'Doações',
    question: 'Quais itens posso doar?',
    answer:
      'Aceitamos roupas adultas e infantis, calçados, cobertores e acessórios. Os itens devem estar limpos, sem furos ou manchas graves, e em condições de uso imediato. Não aceitamos roupas íntimas usadas, peças com mofo ou um par incompleto de calçados.',
  },
  {
    id: 'faq-2',
    category: 'Doações',
    question: 'Preciso lavar as roupas antes de doar?',
    answer:
      'Sim! Todas as peças doadas devem estar higienizadas. Isso garante que os beneficiários recebam os itens em boas condições e facilita o trabalho de triagem das ONGs parceiras.',
  },
  {
    id: 'faq-3',
    category: 'Doações',
    question: 'Como funciona o rastreio da minha doação?',
    answer:
      'Após registrar sua doação no app, você pode acompanhar cada etapa em tempo real na seção "Rastreio". Os status são: Pendente → No ponto de coleta → Em trânsito → Entregue à ONG → Distribuído para famílias.',
  },
  {
    id: 'faq-4',
    category: 'Doações',
    question: 'Posso cancelar uma doação após registrá-la?',
    answer:
      'Sim, é possível cancelar uma doação enquanto ela ainda estiver com o status "Pendente". Após a coleta pelo ponto, o cancelamento não é mais possível. Para cancelar, acesse o detalhe da doação na seção "Rastreio".',
  },
  // Pontos de Coleta
  {
    id: 'faq-5',
    category: 'Pontos de Coleta',
    question: 'Como encontro o ponto de coleta mais próximo?',
    answer:
      'Use a seção "Mapa" ou "Pontos de Coleta" no menu. Você pode buscar por nome ou bairro, e o app mostrará automaticamente o ponto mais próximo da sua localização.',
  },
  {
    id: 'faq-6',
    category: 'Pontos de Coleta',
    question: 'Posso ir ao ponto de coleta sem registrar no app?',
    answer:
      'Sim! Você pode entregar sua doação diretamente no ponto de coleta sem registrar no app. No entanto, ao registrar pelo VestGO, você consegue acompanhar o impacto da sua doação e acumular histórico do seu engajamento.',
  },
  {
    id: 'faq-7',
    category: 'Pontos de Coleta',
    question: 'O que significa "Ponto Patrocinado"?',
    answer:
      'Pontos com o selo "Patrocinado" são parceiros verificados que passaram por uma auditoria de impacto do VestGO. Eles têm infraestrutura adequada para triagem e distribuição e costumam ter maior capacidade de recebimento.',
  },
  // Conta
  {
    id: 'faq-8',
    category: 'Conta',
    question: 'Como altero meus dados de perfil?',
    answer:
      'Acesse a seção "Perfil" no menu e toque em "Editar perfil". Você pode alterar seu nome, foto e informações de contato. O e-mail só pode ser alterado mediante confirmação por e-mail.',
  },
  {
    id: 'faq-9',
    category: 'Conta',
    question: 'Esqueci minha senha. O que faço?',
    answer:
      'Na tela de login, toque em "Esqueci minha senha" e insira o e-mail cadastrado. Você receberá um link de redefinição válido por 30 minutos.',
  },
  // Privacidade
  {
    id: 'faq-10',
    category: 'Privacidade',
    question: 'Meus dados são compartilhados com as ONGs?',
    answer:
      'Compartilhamos apenas as informações necessárias para a doação (nome do doador, itens, ponto de coleta). Dados sensíveis como e-mail e localização exata nunca são compartilhados com terceiros sem seu consentimento explícito.',
  },
  {
    id: 'faq-11',
    category: 'Privacidade',
    question: 'Como excluo minha conta?',
    answer:
      'Acesse Perfil → Privacidade e Segurança → Excluir conta. A exclusão é permanente e remove todos os seus dados após 30 dias conforme exigido pela LGPD. Histórico de doações agregado (sem identificação) pode ser mantido para fins de impacto social.',
  },
];

const CATEGORIES = ['Todas', 'Doações', 'Pontos de Coleta', 'Conta', 'Privacidade'];

function AccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start justify-between gap-3 py-4 text-left"
      >
        <p className={`text-sm leading-snug pr-2 ${open ? 'font-bold text-primary-deeper' : 'font-semibold text-on-surface'}`}>
          {item.question}
        </p>
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          open ? 'bg-primary text-white' : 'bg-surface text-gray-400'
        }`}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {open && (
        <div className="pb-4">
          <p className="text-sm text-gray-500 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function SuportePage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchCategory = activeCategory === 'Todas' || item.category === activeCategory;
      const matchSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [search, activeCategory]);

  // Agrupar por categoria para exibição
  const grouped = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="pb-2">
      {/* ── Header ── */}
      <section className="px-5 pt-6 pb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
          Ajuda
        </p>
        <h1 className="text-3xl font-bold text-primary-deeper">Suporte / FAQ</h1>
        <p className="text-sm text-gray-400 mt-1">Como podemos ajudar você hoje?</p>
      </section>

      {/* ── Busca ── */}
      <section className="px-5 mb-4">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-primary transition-colors">
          <Search size={16} className="text-gray-300 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar perguntas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none placeholder:text-gray-300 bg-transparent"
          />
        </div>
      </section>

      {/* ── Filtros de categoria ── */}
      <section className="mb-5">
        <div className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                activeCategory === cat
                  ? 'bg-primary-deeper text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ── FAQ Accordion ── */}
      <section className="px-5 mb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-400">Nenhuma pergunta encontrada</p>
            <p className="text-xs text-gray-300 mt-1">Tente outros termos ou entre em contato.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([category, items]) => (
              <div key={category}>
                {activeCategory === 'Todas' && (
                  <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
                    {category}
                  </p>
                )}
                <div className="bg-white rounded-2xl shadow-card px-4">
                  {items.map((item) => (
                    <AccordionItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Fale conosco ── */}
      <section className="px-5 mb-5">
        <div className="bg-primary-deeper rounded-3xl p-5 text-white">
          <p className="font-bold text-base mb-1">Ainda tem dúvidas?</p>
          <p className="text-xs text-primary-muted mb-4 leading-relaxed">
            Nossa equipe responde em até 24h em dias úteis.
          </p>
          <div className="flex gap-2">
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white text-xs font-bold py-3 rounded-xl hover:opacity-90 transition-opacity active:scale-95"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
            <a
              href="mailto:suporte@vestgo.com.br"
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white text-xs font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors active:scale-95"
            >
              <Mail size={14} />
              E-mail
            </a>
          </div>
        </div>
      </section>

      {/* ── Links úteis ── */}
      <section className="px-5 mb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Links úteis
        </p>
        <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-100 overflow-hidden">
          {[
            { icon: ShieldCheck, label: 'Política de Privacidade', href: '/perfil/privacidade' },
            { icon: FileText, label: 'Termos de Uso', href: '#' },
            { icon: ExternalLink, label: 'Site VestGO', href: 'https://vestgo.com.br', external: true },
          ].map(({ icon: Icon, label, href, external }) => (
            <a
              key={label}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-3 px-5 py-4 hover:bg-surface transition-colors"
            >
              <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-gray-500" />
              </div>
              <span className="flex-1 text-sm text-on-surface">{label}</span>
              <ExternalLink size={13} className="text-gray-300" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
