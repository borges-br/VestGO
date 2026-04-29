'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  BrowserCodeReader,
  BrowserQRCodeReader,
  type IScannerControls,
} from '@zxing/browser';
import { Camera, Keyboard, Loader2, ScanLine, X } from 'lucide-react';
import { normalizeOperationalCode, parseOperationalCode } from '@/lib/operational-codes';

interface OperationalCodeScannerProps {
  open: boolean;
  resolving?: boolean;
  onClose: () => void;
  onResolve: (code: string) => Promise<void> | void;
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Permissao de camera negada. Digite o codigo manualmente para continuar.';
    }

    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'Nenhuma camera foi encontrada neste dispositivo. Use a entrada manual.';
    }
  }

  return 'Nao foi possivel iniciar a camera. Use a entrada manual.';
}

export function OperationalCodeScanner({
  open,
  resolving = false,
  onClose,
  onResolve,
}: OperationalCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lockedRef = useRef(false);
  const unlockTimerRef = useRef<number | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraStatus, setCameraStatus] = useState('Aguardando abertura do scanner.');
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;

    const video = videoRef.current;
    const stream = video?.srcObject;

    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (video) {
      video.srcObject = null;
    }

    BrowserCodeReader.releaseAllStreams();
  }, []);

  const processCandidate = useCallback(
    async (rawValue: string) => {
      if (lockedRef.current) {
        return;
      }

      const parsed = parseOperationalCode(rawValue);

      if (!parsed.valid) {
        lockedRef.current = true;
        setManualCode(normalizeOperationalCode(rawValue));
        setError('Codigo nao reconhecido. Tente escanear novamente ou digite o codigo manualmente.');
        setCameraStatus('Leitura ignorada.');

        unlockTimerRef.current = window.setTimeout(() => {
          lockedRef.current = false;
        }, 1400);
        return;
      }

      lockedRef.current = true;
      setManualCode(parsed.code);
      setError(null);
      setCameraStatus('Codigo lido. Localizando registro...');
      stopCamera();

      try {
        await onResolve(parsed.code);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel localizar o codigo.');
        lockedRef.current = false;
      }
    },
    [onResolve, stopCamera],
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      return undefined;
    }

    lockedRef.current = false;
    setError(null);
    setCameraStatus('Solicitando camera...');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('Camera indisponivel.');
      setError('Este navegador nao disponibilizou camera. Use a entrada manual.');
      return undefined;
    }

    let cancelled = false;
    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 350,
      delayBetweenScanSuccess: 700,
      tryPlayVideoTimeout: 5000,
    });

    reader
      .decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
          },
        },
        videoRef.current ?? undefined,
        (result, _scanError, controls) => {
          controlsRef.current = controls;

          if (cancelled || !result) {
            return;
          }

          void processCandidate(result.getText());
        },
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setCameraStatus('Aponte a camera para o QR Code.');
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        setCameraStatus('Camera indisponivel.');
        setError(getCameraErrorMessage(err));
        stopCamera();
      });

    return () => {
      cancelled = true;

      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }

      stopCamera();
    };
  }, [open, processCandidate, stopCamera]);

  function handleClose() {
    stopCamera();
    onClose();
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await processCandidate(manualCode);
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary-deeper/65 px-4 py-6 backdrop-blur-sm"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="operational-code-scanner-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-gray-950 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              QR operacional
            </p>
            <h2
              id="operational-code-scanner-title"
              className="mt-1 text-2xl font-bold text-primary-deeper dark:text-white"
            >
              Escanear QR Code
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-300">
              Escaneie um codigo VGO ou LOT. Se a camera nao estiver disponivel, digite o codigo
              manualmente abaixo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-gray-500 transition-colors hover:bg-primary-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:bg-gray-900 dark:text-gray-200"
            aria-label="Fechar scanner"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-gray-950">
          <video
            ref={videoRef}
            className="aspect-video w-full bg-gray-950 object-cover"
            muted
            playsInline
          />
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-300">
          {resolving ? (
            <Loader2 size={16} className="animate-spin text-primary" />
          ) : error ? (
            <Keyboard size={16} className="text-amber-600" />
          ) : (
            <Camera size={16} className="text-primary" />
          )}
          <span aria-live="polite">{resolving ? 'Localizando codigo...' : error ?? cameraStatus}</span>
        </div>

        <form onSubmit={handleManualSubmit} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
          <label className="text-sm" htmlFor="manual-operational-code">
            <span className="mb-2 block text-xs font-semibold text-gray-500 dark:text-gray-300">
              Digite o codigo VGO ou LOT
            </span>
            <input
              id="manual-operational-code"
              value={manualCode}
              onChange={(event) => setManualCode(normalizeOperationalCode(event.target.value))}
              placeholder="VGO-XXXXXX ou LOT-XXXXXX"
              aria-invalid={Boolean(error)}
              aria-describedby="manual-operational-code-help"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm uppercase text-on-surface outline-none transition-colors focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
            <span id="manual-operational-code-help" className="mt-1 block text-xs text-gray-400">
              O QR contem somente o codigo publico, sem dados pessoais.
            </span>
          </label>
          <button
            type="submit"
            disabled={resolving}
            aria-busy={resolving}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300"
          >
            {resolving ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
            Localizar
          </button>
        </form>
      </section>
    </div>
  );
}
