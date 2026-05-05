'use client';

import {
  type MouseEvent,
  type TouchEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';

interface CropperProps {
  file: File;
  /** width / height, e.g. 1 = square, 16/9 = cover, 4/3 = gallery */
  aspectRatio: number;
  /** Exported image dimensions */
  outputWidth: number;
  outputHeight: number;
  label?: string;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

const CANVAS_DISPLAY_WIDTH = 380;

export function ProfileImageCropper({
  file,
  aspectRatio,
  outputWidth,
  outputHeight,
  label = 'Ajustar imagem',
  onConfirm,
  onCancel,
}: CropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const canvasH = Math.round(CANVAS_DISPLAY_WIDTH / aspectRatio);
  const minScale = useCallback(
    (w: number, h: number) =>
      w > 0 && h > 0 ? Math.max(CANVAS_DISPLAY_WIDTH / w, canvasH / h) : 1,
    [canvasH],
  );

  function clamp(ox: number, oy: number, s: number, nw: number, nh: number) {
    const scaledW = nw * s;
    const scaledH = nh * s;
    return {
      x: Math.min(0, Math.max(CANVAS_DISPLAY_WIDTH - scaledW, ox)),
      y: Math.min(0, Math.max(canvasH - scaledH, oy)),
    };
  }

  // Load the file and initialize state
  useEffect(() => {
    setReady(false);
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      imageRef.current = img;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalSize({ w: nw, h: nh });

      const s = minScale(nw, nh);
      const ox = (CANVAS_DISPLAY_WIDTH - nw * s) / 2;
      const oy = (canvasH - nh * s) / 2;
      setScale(s);
      setOffset(clamp(ox, oy, s, nw, nh));
      setReady(true);
    };

    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]); // intentionally only re-runs when the file changes

  // Redraw canvas whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;

    if (!canvas || !img || !ready || naturalSize.w === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_DISPLAY_WIDTH, canvasH);
    ctx.drawImage(img, offset.x, offset.y, naturalSize.w * scale, naturalSize.h * scale);
  }, [scale, offset, ready, naturalSize, canvasH]);

  // ── drag helpers ──────────────────────────────────────────────────────────

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = { startX: clientX, startY: clientY, ox: offset.x, oy: offset.y };
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragRef.current) return;

    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    const next = clamp(
      dragRef.current.ox + dx,
      dragRef.current.oy + dy,
      scale,
      naturalSize.w,
      naturalSize.h,
    );
    setOffset(next);
  }

  function stopDrag() {
    dragRef.current = null;
  }

  // ── mouse events ──────────────────────────────────────────────────────────

  function onMouseDown(e: MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }

  function onMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    moveDrag(e.clientX, e.clientY);
  }

  // ── touch events ──────────────────────────────────────────────────────────

  function onTouchStart(e: TouchEvent<HTMLCanvasElement>) {
    const touch = e.touches[0];
    if (touch) startDrag(touch.clientX, touch.clientY);
  }

  function onTouchMove(e: TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) moveDrag(touch.clientX, touch.clientY);
  }

  // ── wheel zoom ────────────────────────────────────────────────────────────

  function onWheel(e: WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const delta = -e.deltaY * 0.0008;
    const ms = minScale(naturalSize.w, naturalSize.h);
    const nextScale = Math.max(ms, Math.min(scale * (1 + delta), ms * 4));
    const ratio = nextScale / scale;
    const cx = CANVAS_DISPLAY_WIDTH / 2;
    const cy = canvasH / 2;
    const nextOffset = clamp(
      cx - (cx - offset.x) * ratio,
      cy - (cy - offset.y) * ratio,
      nextScale,
      naturalSize.w,
      naturalSize.h,
    );
    setScale(nextScale);
    setOffset(nextOffset);
  }

  // ── zoom buttons ──────────────────────────────────────────────────────────

  function zoom(direction: 1 | -1) {
    const ms = minScale(naturalSize.w, naturalSize.h);
    const step = 0.15;
    const nextScale = Math.max(ms, Math.min(scale * (1 + direction * step), ms * 4));
    const ratio = nextScale / scale;
    const cx = CANVAS_DISPLAY_WIDTH / 2;
    const cy = canvasH / 2;
    const nextOffset = clamp(
      cx - (cx - offset.x) * ratio,
      cy - (cy - offset.y) * ratio,
      nextScale,
      naturalSize.w,
      naturalSize.h,
    );
    setScale(nextScale);
    setOffset(nextOffset);
  }

  // ── export ────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    const img = imageRef.current;
    if (!img || !ready) return;

    setExporting(true);

    // Source rect in image (natural) coordinates
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = CANVAS_DISPLAY_WIDTH / scale;
    const sh = canvasH / scale;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outputWidth;
    exportCanvas.height = outputHeight;
    const ctx = exportCanvas.getContext('2d');

    if (!ctx) {
      setExporting(false);
      return;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

    exportCanvas.toBlob(
      (blob) => {
        setExporting(false);

        if (!blob) return;

        const extension = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
        const croppedFile = new File([blob], `cropped.${extension}`, { type: file.type });
        onConfirm(croppedFile);
      },
      file.type,
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[440px] overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-primary-deeper">{label}</p>
          <p className="mt-1 text-xs text-gray-400">
            Arraste para reposicionar · Scroll ou botões para zoom · Confirme para enviar
          </p>
        </div>

        <div className="relative bg-surface">
          {!ready && (
            <div
              className="flex items-center justify-center bg-surface"
              style={{ width: CANVAS_DISPLAY_WIDTH, height: canvasH }}
            >
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={CANVAS_DISPLAY_WIDTH}
            height={canvasH}
            style={{
              display: ready ? 'block' : 'none',
              cursor: dragRef.current ? 'grabbing' : 'grab',
              touchAction: 'none',
              maxWidth: '100%',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={stopDrag}
            onWheel={onWheel}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => zoom(-1)}
              aria-label="Reduzir zoom"
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 transition-colors hover:border-primary hover:text-primary"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              onClick={() => zoom(1)}
              aria-label="Aumentar zoom"
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 transition-colors hover:border-primary hover:text-primary"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:border-primary hover:text-primary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!ready || exporting}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting && <Loader2 className="animate-spin" size={14} />}
              {exporting ? 'Processando...' : 'Confirmar corte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
