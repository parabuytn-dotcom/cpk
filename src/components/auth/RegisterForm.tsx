"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { registerManual, registerWithEmail, sendRegistrationOtp } from "@/lib/auth/actions";
import type { ClassRow } from "@/lib/admin/data";

export default function RegisterForm({
  classes,
  smsVerificationEnabled,
}: {
  classes: ClassRow[];
  smsVerificationEnabled: boolean;
}) {
  const t = useTranslations("auth");
  // "manual" = sign up with just a phone number (the phone becomes the login
  // identifier); "email" = sign up with a real email address. Either way the
  // phone field below is required, so the two tabs really only differ by
  // whether a real email is collected too.
  const [method, setMethod] = useState<"manual" | "email">("manual");
  const [manualState, manualAction, manualPending] = useActionState(registerManual, undefined);
  const [emailState, emailAction, emailPending] = useActionState(
    registerWithEmail,
    undefined,
  );
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpPending, startOtpTransition] = useTransition();

  const state = method === "manual" ? manualState : emailState;

  function requestOtp() {
    setOtpMessage(null);
    startOtpTransition(async () => {
      const result = await sendRegistrationOtp(phone.trim());
      if (result.success) {
        setOtpSent(true);
        setOtpMessage(t("otpSent"));
      } else {
        setOtpMessage(result.message ?? t("otpError"));
      }
    });
  }

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
      </div>

      <form
        action={method === "manual" ? manualAction : emailAction}
        className="flex flex-col gap-4"
      >
        {method === "email" && (
          <Field label={t("email")} name="email" type="email" errors={state?.errors?.email} />
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">{t("phone")}</label>
          <input
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setOtpSent(false);
              setOtpMessage(null);
            }}
            placeholder="99766801"
            required
            className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
          />
          {state?.errors?.phone?.map((err) => (
            <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
              {err}
            </p>
          ))}

          {smsVerificationEnabled && (
            <div className="mt-2 flex flex-col gap-2 rounded-xl bg-black/5 p-3 dark:bg-white/10">
              <p className="text-xs text-foreground/60">{t("otpExplain")}</p>
              <button
                type="button"
                onClick={requestOtp}
                disabled={otpPending || !/^\d{8}$/.test(phone.trim())}
                className="self-start rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-60"
              >
                {otpPending ? t("otpSending") : otpSent ? t("otpResend") : t("otpSend")}
              </button>
              {otpMessage && <p className="text-xs text-foreground/70">{otpMessage}</p>}
              {otpSent && (
                <input
                  name="otpCode"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  required
                  className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-center tracking-[0.3em] outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
                />
              )}
            </div>
          )}
        </div>

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
          disabled={manualPending || emailPending || (smsVerificationEnabled && !otpSent)}
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
