"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProfileInfo, sendProfileVerificationOtp } from "@/lib/auth/actions";
import type { CurrentProfile } from "@/lib/auth/session";

export default function EditProfileForm({
  profile,
  smsVerificationEnabled,
}: {
  profile: CurrentProfile;
  smsVerificationEnabled: boolean;
}) {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState(updateProfileInfo, undefined);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpPending, startOtpTransition] = useTransition();

  const phoneChanged = phone.trim() !== (profile.phone ?? "");
  const showOtpStep = smsVerificationEnabled && phoneChanged;

  function requestOtp() {
    setOtpMessage(null);
    startOtpTransition(async () => {
      const result = await sendProfileVerificationOtp(phone.trim());
      if (result.success) {
        setOtpSent(true);
        setOtpMessage(t("otpSent"));
      } else {
        setOtpMessage(result.message ?? t("otpError"));
      }
    });
  }

  return (
    <form action={action} className="glass-surface grid gap-3 rounded-2xl px-5 py-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">{t("editTitle")}</h2>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("fullName")}</label>
        <input
          name="fullName"
          defaultValue={
            profile.fullName ??
            `${profile.parentFirstName ?? ""} ${profile.parentLastName ?? ""}`.trim()
          }
          required
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        {state?.errors?.fullName?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

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

        {showOtpStep && (
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

      <div>
        <label className="mb-1 block text-sm font-medium">{t("cin")}</label>
        <input
          name="cin"
          defaultValue={profile.cin ?? ""}
          placeholder="12345678"
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        {state?.errors?.cin?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("contactEmail")}</label>
        <input
          name="contactEmail"
          type="email"
          defaultValue={profile.contactEmail ?? ""}
          placeholder="toi@example.com"
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        {state?.errors?.contactEmail?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

      <button
        type="submit"
        disabled={pending || (showOtpStep && !otpSent)}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? t("saving") : t("save")}
      </button>

      {state?.message && (
        <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{state.message}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400 sm:col-span-2">{state.success}</p>
      )}
    </form>
  );
}
