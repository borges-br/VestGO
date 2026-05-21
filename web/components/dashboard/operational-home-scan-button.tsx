'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, ScanLine } from 'lucide-react';
import { OperationalCodeScanner } from '@/components/operations/operational-code-scanner';
import { getOperationalDonationByCode } from '@/lib/api';
import { parseOperationalCode } from '@/lib/operational-codes';
import { cn } from '@/lib/utils';

export function OperationalHomeScanButton({
  accessToken,
  className,
}: {
  accessToken: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(code: string) {
    const parsed = parseOperationalCode(code);

    if (!parsed.valid || parsed.kind !== 'DONATION') {
      setError('Use um QR de doacao VGO para abrir o rastreio da coleta.');
      return;
    }

    setResolving(true);
    setError(null);

    try {
      const donation = await getOperationalDonationByCode(parsed.code, accessToken);
      setOpen(false);
      router.push(`/rastreio/${donation.id}`);
    } catch (resolveError) {
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : 'Nao foi possivel localizar esta doacao.',
      );
    } finally {
      setResolving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={!accessToken || resolving}
        className={cn(
          'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-primary-deeper/10 bg-white px-5 py-3 text-sm font-semibold text-primary-deeper shadow-sm transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
      >
        {resolving ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
        Escanear QR da doação
      </button>

      {error && (
        <p className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          <Camera size={13} />
          {error}
        </p>
      )}

      <OperationalCodeScanner
        open={open}
        resolving={resolving}
        onClose={() => setOpen(false)}
        onResolve={handleResolve}
      />
    </>
  );
}
