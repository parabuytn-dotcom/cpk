"use client";

import { useState, useTransition } from "react";
import { markValidationSeen } from "@/lib/auth/actions";

export default function ValidatedModal({
  title,
  body,
  closeLabel,
}: {
  title: string;
  body: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function close() {
    setOpen(false);
    startTransition(() => {
      markValidationSeen();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="glass-surface w-full max-w-md rounded-3xl p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl text-white shadow-lg">
          ✓
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-3 text-sm text-foreground/80">{body}</p>
        <button
          onClick={close}
          disabled={isPending}
          className="mt-6 w-full rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
