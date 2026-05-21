'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';

export default function InicioError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <section className="max-w-lg rounded-[2rem] bg-white p-6 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertCircle size={22} />
        </div>
        <h1 className="mt-4 text-2xl font-black text-primary-deeper">
          Não foi possível carregar o início
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Tente novamente. Se a falha continuar, a fila operacional segue disponível em Operações.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <RotateCcw size={16} />
          Recarregar
        </button>
      </section>
    </div>
  );
}
