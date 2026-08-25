"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { loginWithPhone, loginWithEmail } from "@/lib/auth/actions";
import ChildLoginPicker from "./ChildLoginPicker";
import type { ChildLoginClass, ChildLoginStudent } from "@/lib/auth/data";

export default function LoginForm({
  childLoginClasses,
  childLoginStudents,
}: {
  childLoginClasses: ChildLoginClass[];
  childLoginStudents: ChildLoginStudent[];
}) {
  const t = useTranslations("auth");
  const [method, setMethod] = useState<"phone" | "email" | "child">("phone");
  const [phoneState, phoneAction, phonePending] = useActionState(loginWithPhone, undefined);
  const [emailState, emailAction, emailPending] = useActionState(loginWithEmail, undefined);

  const state = method === "phone" ? phoneState : method === "email" ? emailState : undefined;

  return (
    <div className="glass-surface mx-auto max-w-md rounded-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">{t("loginTitle")}</h1>

      <div className="mb-6 flex gap-1 rounded-full bg-black/5 p-1 dark:bg-white/10">
        <button
          type="button"
          onClick={() => setMethod("phone")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            method === "phone" ? "bg-white shadow dark:bg-white/20" : "text-foreground/60"
          }`}
        >
          {t("methodPhone")}
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
        <button
          type="button"
          onClick={() => setMethod("child")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            method === "child" ? "bg-white shadow dark:bg-white/20" : "text-foreground/60"
          }`}
        >
          {t("methodChild")}
        </button>
      </div>

      {method === "phone" && (
        <form action={phoneAction} className="flex flex-col gap-4">
          <Field label={t("phone")} name="phone" type="tel" placeholder="99766801" />
          <Field label={t("password")} name="password" type="password" />
          <SubmitButton pending={phonePending} label={t("submitLogin")} />
        </form>
      )}
      {method === "email" && (
        <form action={emailAction} className="flex flex-col gap-4">
          <Field label={t("email")} name="email" type="email" />
          <Field label={t("password")} name="password" type="password" />
          <SubmitButton pending={emailPending} label={t("submitLogin")} />
        </form>
      )}
      {method === "child" && (
        <ChildLoginPicker classes={childLoginClasses} students={childLoginStudents} />
      )}

      {state?.message && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      <p className="mt-6 text-center text-sm text-foreground/60">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          {t("registerTitle")}
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
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
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
    </div>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
