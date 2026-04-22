'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Heart } from 'lucide-react';
import { EmojiRating } from '@/components/ui/emoji-rating';

interface PostDonationRatingProps {
  donationId: string;
}

const STORAGE_PREFIX = 'vestgo:donation-rating:';

export function PostDonationRating({ donationId }: PostDonationRatingProps) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Hydrate from localStorage so refresh keeps the submitted state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const prior = window.localStorage.getItem(`${STORAGE_PREFIX}${donationId}`);
      if (prior) {
        const parsed = Number.parseInt(prior, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          setRating(parsed);
          setSubmitted(true);
        }
      }
    } catch {
      // storage unavailable — silently ignore
    }
  }, [donationId]);

  function handleRate(next: number) {
    setRating(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${donationId}`, String(next));
      } catch {
        // ignore
      }
    }
    // Small delay before collapsing so the emoji animation can breathe
    window.setTimeout(() => setSubmitted(true), 700);
  }

  return (
    <section className="rounded-[2rem] border border-primary/15 bg-white/80 p-6 backdrop-blur-sm lg:p-8">
      <div className="flex items-center gap-2 text-primary-deeper">
        <Heart size={14} className="fill-primary text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
          Feedback
        </span>
      </div>

      {submitted ? (
        <div className="mt-4 flex flex-col items-start gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-deeper">
            <CheckCircle2 size={13} />
            Obrigado! Sua avaliação foi registrada.
          </div>
          <p className="text-sm text-gray-600">
            Você avaliou esta experiência com{' '}
            <span className="font-semibold text-primary-deeper">{rating}/5</span>. Seu
            retorno ajuda a melhorar a jornada solidária para todos.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-2 text-xs font-semibold text-primary hover:text-primary-deeper"
          >
            Alterar avaliação
          </button>
        </div>
      ) : (
        <>
          <h3 className="mt-3 text-2xl font-bold text-primary-deeper">
            Como foi registrar esta doação?
          </h3>
          <p className="mt-2 max-w-xl text-sm text-gray-600">
            Seu feedback nos ajuda a melhorar cada passo da jornada solidária — do
            cadastro ao acompanhamento até a entrega.
          </p>
          <div className="mt-6">
            <EmojiRating value={rating} onChange={handleRate} idleLabel="Toque para avaliar" />
          </div>
        </>
      )}
    </section>
  );
}
