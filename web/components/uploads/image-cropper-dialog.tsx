'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { cropImageFile, type ImageCropPreset } from '@/lib/image-crop';
import { cn } from '@/lib/utils';

type ImageCropperDialogProps = {
  file: File;
  preset: ImageCropPreset;
  onApply: (file: File) => void | Promise<void>;
  onCancel: () => void;
};

export function ImageCropperDialog({ file, preset, onApply, onCancel }: ImageCropperDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setImageSrc(nextUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const handleCropComplete = useCallback((_croppedArea: Area, nextCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(nextCroppedAreaPixels);
  }, []);

  async function handleApply() {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsApplying(true);
    setError(null);

    try {
      const croppedFile = await cropImageFile({
        file,
        imageSrc,
        crop: croppedAreaPixels,
        outputWidth: preset.outputWidth,
        outputHeight: preset.outputHeight,
      });
      await onApply(croppedFile);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Nao foi possivel preparar a imagem agora.',
      );
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={preset.label}
        className="vg-card w-full max-w-[520px] overflow-hidden rounded-3xl shadow-2xl"
      >
        <header className="border-b border-[var(--vg-border)] px-5 py-4">
          <p className="vg-text-primary text-sm font-extrabold">{preset.label}</p>
          <p className="vg-text-secondary mt-1 text-xs">
            Reposicione, ajuste o zoom e salve a imagem quando estiver pronta.
          </p>
        </header>

        <div
          className="relative bg-[var(--vg-bg-soft)]"
          style={{ aspectRatio: preset.aspect }}
        >
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={preset.aspect}
              cropShape={preset.aspect === 1 ? 'round' : 'rect'}
              showGrid={preset.aspect !== 1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          )}
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <ZoomOut size={16} className="vg-text-muted flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Zoom da imagem"
              className="h-2 w-full accent-primary"
            />
            <ZoomIn size={16} className="vg-text-muted flex-shrink-0" />
            <button
              type="button"
              onClick={() => {
                setCrop({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[var(--vg-border)] text-[var(--vg-text-secondary)] transition hover:border-primary hover:text-primary"
              aria-label="Reiniciar ajuste"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isApplying}
              className="rounded-full border border-[var(--vg-border)] px-4 py-2.5 text-sm font-bold text-[var(--vg-text-secondary)] transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={!imageSrc || !croppedAreaPixels || isApplying}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-primary-dark',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {isApplying ? <Loader2 className="animate-spin" size={15} /> : null}
              {isApplying ? 'Salvando...' : 'Aplicar imagem'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
