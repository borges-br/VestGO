'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function OperacoesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="vg-dark-fix px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell">
        <div className="rounded-[14px] border border-red-100 bg-white px-6 py-12 text-center shadow-sm">
          <AlertTriangle size={34} className="mx-auto text-red-500" aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-primary-deeper">
            Nao foi possivel carregar as operacoes
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
            Verifique sua conexao e tente novamente. Se o problema persistir, fale com o suporte.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-deeper px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RefreshCw size={14} aria-hidden />
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

