'use client';
import { useState } from 'react';
import { MapPin, Camera, Check, ChevronRight, Info } from 'lucide-react';
import Link from 'next/link';

type Category = 'Roupas adultas' | 'Roupas infantis' | 'Calçados' | 'Cobertores' | 'Outros';
type Condition = 'otimo' | 'bom';

const categories: Category[] = ['Roupas adultas', 'Roupas infantis', 'Calçados', 'Cobertores', 'Outros'];

export default function DoarPage() {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(['Roupas adultas']);
  const [condition, setCondition] = useState<Condition>('otimo');
  const [quantity, setQuantity] = useState('');
  const [volume, setVolume] = useState('1 sacola grande');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSubmit = async () => {
    if (!confirmed) return;
    setLoading(true);
    // TODO: chamar POST /donations quando o endpoint existir (Milestone 4)
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    // Por ora redireciona para rastreio
    window.location.href = '/rastreio';
  };

  return (
    <div className="pb-2">
      {/* ── Cabeçalho ── */}
      <section className="px-5 pt-6 pb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
          Nova doação
        </p>
        <h1 className="text-2xl font-bold text-primary-deeper leading-tight">
          Cadastrar nova doação
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Registre os itens que você pretende levar para facilitar a triagem na ONG.
        </p>
      </section>

      {/* ── Ponto escolhido ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
          Ponto de coleta escolhido
        </p>
        <Link
          href="/mapa"
          className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-card"
        >
          <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-on-surface">Hub Central Pinheiros</p>
            <p className="text-xs text-gray-400 mt-0.5">Rua dos Pinheiros, 1234 • Aberto até 20:00</p>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
        </Link>
      </section>

      {/* ── Categorias ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          O que você está doando?
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const selected = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  selected
                    ? 'bg-primary-deeper text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Quantidade e Volume ── */}
      <section className="px-5 mb-5">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
              Qtd. estimada
            </label>
            <input
              type="text"
              placeholder="Ex: 10 itens"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
              Volume
            </label>
            <select
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary appearance-none"
            >
              <option>1 sacola grande</option>
              <option>2 sacolas</option>
              <option>1 caixa</option>
              <option>Mais de 1 caixa</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Condição ── */}
      <section className="px-5 mb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Condição das peças
        </p>
        <div className="flex gap-3">
          {([
            { id: 'otimo', label: 'Em ótimo estado' },
            { id: 'bom', label: 'Usado mas conservado' },
          ] as { id: Condition; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCondition(id)}
              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                condition === id
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {condition === id && <Check size={14} />}
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Observações ── */}
      <section className="px-5 mb-5">
        <label className="block text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
          Observações (opcional)
        </label>
        <textarea
          rows={3}
          placeholder="Ex: Contém agasalhos de lã pesados para o inverno."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary resize-none"
        />
      </section>

      {/* ── Foto ── */}
      <section className="px-5 mb-5">
        <label className="block text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
          Fotos da doação (opcional)
        </label>
        <button className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-primary transition-colors active:scale-[0.98]">
          <Camera size={28} />
          <span className="text-sm">Tirar foto ou anexar</span>
        </button>
      </section>

      {/* ── Confirmação ── */}
      <section className="px-5 mb-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => setConfirmed(!confirmed)}
            className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
              confirmed ? 'bg-primary border-primary' : 'border-gray-300 bg-white'
            }`}
          >
            {confirmed && <Check size={11} className="text-white" strokeWidth={3} />}
          </div>
          <span className="text-sm text-gray-600 leading-snug">
            Confirmo que as roupas estão limpas, higienizadas e em bom estado para uso imediato.
          </span>
        </label>
      </section>

      {/* ── Dicas ── */}
      <section className="px-5 mb-6">
        <div className="bg-primary-deeper rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-primary-muted" />
            <p className="font-bold text-sm">Dicas de Triagem</p>
          </div>
          <ul className="space-y-2 text-xs text-primary-muted leading-relaxed">
            <li>• Separe por tipo (ex: infantil de um lado, adulto de outro) para agilizar o trabalho dos voluntários.</li>
            <li>• Verifique se não há itens pessoais nos bolsos antes de embalar.</li>
          </ul>
        </div>
      </section>

      {/* ── Botões ── */}
      <section className="px-5 mb-2 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={!confirmed || loading}
          className="w-full bg-primary-deeper text-white font-bold py-4 rounded-2xl hover:bg-primary-dark transition-all active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? 'Registrando…' : 'Registrar doação'}
        </button>
        <button className="w-full bg-white border border-gray-200 text-gray-600 font-semibold py-4 rounded-2xl hover:bg-surface transition-colors">
          Salvar para depois
        </button>
      </section>
    </div>
  );
}
