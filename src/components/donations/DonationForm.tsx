"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { startDonation } from "@/lib/donations/actions";

const PRESETS = [5, 10, 20, 50];

export default function DonationForm() {
  const t = useTranslations("donations");
  const [state, action, pending] = useActionState(startDonation, undefined);
  const [amount, setAmount] = useState<number | "">(10);

  return (
    <form action={action} className="glass-surface flex flex-col gap-4 rounded-3xl p-6">
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            className={`rounded-xl py-3 text-sm font-semibold transition ${
              amount === preset
                ? "bg-brand-600 text-white shadow-md"
                : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            }`}
          >
            {preset} DT
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("customAmount")}</span>
        <input
          name="amount"
          type="number"
          min={1}
          max={2000}
          step="0.5"
          value={amount}
          onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
          required
          className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
      </label>

      {state?.errors?.amount?.map((err) => (
        <p key={err} className="text-xs text-red-600 dark:text-red-400">
          {err}
        </p>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? t("redirecting") : t("donate")}
      </button>

      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
    </form>
  );
}
