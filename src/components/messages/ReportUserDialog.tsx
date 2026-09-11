"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { reportUser } from "@/lib/messages/actions";

export default function ReportUserDialog({
  userId,
  context = "message",
}: {
  userId: string;
  context?: string;
}) {
  const t = useTranslations("messages");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reportUser, undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-black/10 px-4 py-2 text-xs font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
      >
        {t("report")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="glass-surface w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold">{t("reportTitle")}</h2>
            <p className="mt-1 text-sm text-foreground/70">{t("reportHint")}</p>

            {state?.success ? (
              <>
                <p className="mt-4 text-sm text-green-600 dark:text-green-400">{state.success}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-6 w-full rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700"
                >
                  {t("close")}
                </button>
              </>
            ) : (
              <form action={action} className="mt-4 flex flex-col gap-3">
                <input type="hidden" name="reportedId" value={userId} />
                <input type="hidden" name="context" value={context} />
                <textarea
                  name="reason"
                  rows={3}
                  required
                  placeholder={t("reportPlaceholder")}
                  className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
                />
                {state?.message && (
                  <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {pending ? "…" : t("reportSubmit")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
