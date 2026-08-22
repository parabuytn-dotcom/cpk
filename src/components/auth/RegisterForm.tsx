"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { registerManual, registerWithEmail } from "@/lib/auth/actions";
import type { ClassRow } from "@/lib/admin/data";

export default function RegisterForm({ classes }: { classes: ClassRow[] }) {
  const t = useTranslations("auth");
  const [method, setMethod] = useState<"manual" | "email">("manual");
  const [manualState, manualAction, manualPending] = useActionState(registerManual, undefined);
  const [emailState, emailAction, emailPending] = useActionState(
    registerWithEmail,
    undefined,
  );

  const state = method === "manual" ? manualState : emailState;

  return (
    <div className="glass-surface mx-auto max-w-lg rounded-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">{t("registerTitle")}</h1>

      <div className="mb-6 flex gap-1 rounded-full bg-black/5 p-1 dark:bg-white/10">
        <button
          type="button"
          onClick={() => setMethod("manual")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            method === "manual" ? "bg-white shadow dark:bg-white/20" : "text-foreground/60"
          }`}
        >
          {t("methodCin")}
        </button>
        <button
          type="button"
          onClick={() => setMethod("email")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            method === "email" ? "bg-white shadow dark:bg-white/20" : "text-foreground/60"
          }`}
        >
          {t("methodEmail")}
        </button>
      </div>

      <form
        action={method === "manual" ? manualAction : emailAction}
        className="flex flex-col gap-4"
      >
        {method === "manual" ? (
          <Field label={t("cin")} name="cin" errors={state?.errors?.cin} />
        ) : (
          <Field label={t("email")} name="email" type="email" errors={state?.errors?.email} />
        )}
        <Field
          label={t("phone")}
          name="phone"
          type="tel"
          placeholder="99766801"
          errors={state?.errors?.phone}
        />
        <Field
          label={t("password")}
          name="password"
          type="password"
          errors={state?.errors?.password}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t("parentFirstName")}
            name="parentFirstName"
            errors={state?.errors?.parentFirstName}
          />
          <Field
            label={t("parentLastName")}
            name="parentLastName"
            errors={state?.errors?.parentLastName}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t("childFirstName")}
            name="childFirstName"
            errors={state?.errors?.childFirstName}
          />
          <div>
            <label className="mb-1 block text-sm font-medium">{t("childClass")}</label>
            <select
              name="childClass"
              required
              defaultValue=""
              disabled={classes.length === 0}
              className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 disabled:opacity-60 dark:border-white/10 dark:bg-white/5"
            >
              <option value="" disabled>
                {classes.length === 0 ? "Aucune classe disponible" : "—"}
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            {state?.errors?.childClass?.map((err) => (
              <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
                {err}
              </p>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={manualPending || emailPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
        >
          {t("submitRegister")}
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-foreground/50">
        <Link href="/confidentialite" className="underline hover:text-foreground">
          Voir ce que nous faisons de tes données
        </Link>
      </p>

      {state?.message && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      <p className="mt-6 text-center text-sm text-foreground/60">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          {t("loginTitle")}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  errors?: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
      />
      {errors?.map((err) => (
        <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {err}
        </p>
      ))}
    </div>
  );
}
