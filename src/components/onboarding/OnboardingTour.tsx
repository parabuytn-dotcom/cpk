"use client";

import { useEffect, useState, useTransition } from "react";
import { markOnboardingTourSeen } from "@/lib/auth/actions";

export type TourStep = {
  emoji: string;
  title: string;
  body: string;
  from: string;
  to: string;
};

export default function OnboardingTour({
  steps,
  labels,
}: {
  steps: TourStep[];
  labels: { next: string; previous: string; skip: string; start: string };
}) {
  const [index, setIndex] = useState(0);
  const [closing, setClosing] = useState(false);
  const [open, setOpen] = useState(true);
  const [, startTransition] = useTransition();

  const total = steps.length;
  const step = steps[index];
  const isLast = index === total - 1;

  function finish() {
    if (closing) return;
    setClosing(true);
    startTransition(() => {
      markOnboardingTourSeen();
    });
    setTimeout(() => setOpen(false), 350);
  }

  function next() {
    if (isLast) finish();
    else setIndex((i) => Math.min(i + 1, total - 1));
  }

  function previous() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") previous();
      else if (e.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, closing]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-xl transition-opacity duration-300 ${
        closing ? "opacity-0" : "animate-tour-fade-in opacity-100"
      }`}
    >
      <div
        className="animate-tour-blob pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-60 blur-3xl transition-colors duration-700"
        style={{ background: `radial-gradient(circle, ${step.from}, transparent 70%)` }}
      />
      <div
        className="animate-tour-blob pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full opacity-60 blur-3xl transition-colors duration-700"
        style={{ background: `radial-gradient(circle, ${step.to}, transparent 70%)`, animationDelay: "2s" }}
      />

      <div
        key={index}
        className="animate-tour-step-in glass-surface relative w-full max-w-md rounded-[2rem] p-8 text-center shadow-2xl"
      >
        <div className="absolute left-6 top-6 text-xs font-medium text-foreground/40">
          {index + 1}/{total}
        </div>
        <button
          type="button"
          onClick={finish}
          className="absolute right-6 top-6 text-xs font-medium text-foreground/50 transition hover:text-foreground"
        >
          {labels.skip}
        </button>

        <div
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg, ${step.from}, ${step.to})` }}
        >
          <span aria-hidden>{step.emoji}</span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight">{step.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/75">{step.body}</p>

        <div className="mt-8 flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-brand-600" : "w-1.5 bg-foreground/20"
              }`}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={previous}
            disabled={index === 0}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-foreground/60 transition hover:text-foreground disabled:opacity-0"
          >
            {labels.previous}
          </button>
          <button
            type="button"
            onClick={next}
            className="flex-1 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 active:scale-95"
          >
            {isLast ? labels.start : labels.next}
          </button>
        </div>
      </div>
    </div>
  );
}
