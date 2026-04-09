import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import {
  MapPin, Navigation, ChevronRight,
  Package, Star, ArrowRight,
} from 'lucide-react';

export default async function LandingPage() {
  // Redireciona para o dashboard caso o usuário já esteja logado
  const session = await auth();
  if (session) redirect('/inicio');

  return (
    <div className="min-h-screen bg-surface font-sans">
      <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <span className="text-lg font-bold text-primary-deeper">VestGO</span>
        <Link
          href="/login"
          className="text-sm font-semibold text-primary bg-primary-light px-4 py-2 rounded-xl hover:bg-primary-muted transition-colors"
        >
          Entrar
        </Link>
      </header>

      <div className="max-w-sm mx-auto">
        {/* ── Hero ── */}
        <section className="bg-primary-deeper text-white px-5 pt-10 pb-14">
          <p className="text-xs font-semibold tracking-widest text-primary-muted uppercase mb-3">
            Doações rastreáveis
          </p>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Sua roupa usada<br />tem uma nova<br />história.
          </h1>
          <p className="text-primary-muted text-sm leading-relaxed mb-8">
            Conectamos sua roupa às ONGs verificadas e às famílias que precisam dela com segurança.
          </p>
          <div className="bg-[#004957] rounded-2xl p-1 flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Digite o seu CEP"
              className="flex-1 bg-transparent text-white placeholder:text-primary-muted text-sm px-4 py-3 outline-none"
            />
          </div>
          <Link
            href="/login?callbackUrl=%2Fmapa"
            className="flex items-center justify-center gap-2 bg-primary text-white rounded-2xl py-4 font-semibold text-sm w-full hover:bg-primary-dark transition-colors active:scale-[0.97]"
          >
            <Navigation size={16} />
            Usar minha localização
          </Link>
        </section>

        {/* ── Impacto Social ── */}
        <section className="px-5 py-7">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">
            Nossa Pegada Social
          </p>
          <div className="space-y-3">
            {[
              { icon: Package, value: '45.8t', label: 'roupas coletadas' },
              { icon: Star, value: '12.4k', label: 'vidas em transição' },
              { icon: MapPin, value: '890', label: 'pontos de coleta' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-card">
                <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-deeper leading-none">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pontos Próximos ── */}
        <section className="px-5 pb-7">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
              Pontos de Coleta Próximos
            </p>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Espaço Amparo Social', tag: 'SOCIAL HUB', address: '2.1km • Aceita roupas' },
              { name: 'Eco Store', tag: 'ECO STORE', address: '3.4km • Roupas e calçados' },
            ].map((point) => (
              <div key={point.name} className="bg-white rounded-2xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold bg-primary-light text-primary px-2 py-0.5 rounded-full tracking-wider">
                      {point.tag}
                    </span>
                    <p className="font-semibold text-sm text-on-surface mt-1">{point.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{point.address}</p>
                  </div>
                  <Link href="/login?callbackUrl=%2Fmapa" className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-xl whitespace-nowrap">
                    Ver mais
                  </Link>
                </div>
              </div>
            ))}
            <Link href="/login?callbackUrl=%2Fmapa" className="w-full text-sm text-primary font-semibold flex items-center justify-center gap-1 py-3">
              Ver mais pontos <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* ── Como funciona ── */}
        <section className="px-5 pb-7">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-5">
            Como funciona
          </p>
          <div className="space-y-5">
            {[
              { n: '1', title: 'Separe suas roupas', desc: 'Selecione as peças que não usa mais e fotografe cada uma.' },
              { n: '2', title: 'Escolha um ponto', desc: 'Encontre o ponto de coleta parceiro mais próximo da sua localização.' },
              { n: '3', title: 'Acompanhe online', desc: 'Receba notificações sobre sua doação até chegar na ONG.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <div className="w-8 h-8 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{n}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-on-surface">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mx-5 mb-8 bg-primary-deeper rounded-3xl px-6 py-8 text-white text-center">
          <div className="w-3 h-3 bg-primary rounded-full mx-auto mb-4 shadow-[0_0_12px_#006a62]" />
          <h2 className="text-2xl font-bold mb-2 leading-tight">Pronto para fazer a<br />diferença?</h2>
          <p className="text-primary-muted text-sm mb-6">Junte-se a milhares de doadores e comece a transformar vidas.</p>
          <Link
            href="/cadastro"
            className="block bg-primary text-white text-sm font-semibold py-4 rounded-2xl hover:bg-primary-dark transition-colors active:scale-[0.97] mb-3"
          >
            Começar minha doação
          </Link>
          <Link href="/login" className="block text-sm text-primary-muted font-medium">
            Já tenho conta
          </Link>
        </section>

        <footer className="text-center py-6 px-5 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-300 tracking-widest uppercase mb-3">VestGO</p>
          <div className="flex justify-center gap-5 text-xs text-gray-400">
            <a href="#" className="hover:text-primary">Termos</a>
            <a href="#" className="hover:text-primary">Privacidade</a>
            <a href="#" className="hover:text-primary">Contato</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
