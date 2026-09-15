"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { markNotificationRead } from "@/lib/notifications/actions";
import type { NotificationRow } from "@/lib/notifications/data";

/**
 * Blocking popup for notifications an admin marked as "intrusive" — the same
 * treatment as the account-validated modal, so an important announcement
 * can't be missed by someone who never opens the bell menu. Dismissing marks
 * it read, which is also what removes it from this list on the next load.
 * Several are shown one after another.
 */
export default function IntrusiveNotificationModal({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const t = useTranslations("notificationsUi");
  const [index, setIndex] = useState(0);
  const [, startTransition] = useTransition();

  const current = notifications[index];
  if (!current) return null;

  function dismiss(id: string) {
    setIndex((i) => i + 1);
    startTransition(() => {
      markNotificationRead(id);
    });
  }

  return (
    <div data-blocking-modal className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="glass-surface w-full max-w-md rounded-3xl p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl text-white shadow-lg">
          📣
        </div>
        <h2 className="text-xl font-bold">{current.title || t("announcementTitle")}</h2>
        <p className="mt-3 whitespace-pre-line text-sm text-foreground/80">{current.message}</p>
        {current.link && (
          <a
            href={current.link}
            className="mt-4 inline-block text-sm font-medium text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
          >
            {t("announcementOpenLink")}
          </a>
        )}
        <button
          onClick={() => dismiss(current.id)}
          className="mt-6 w-full rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700"
        >
          {t("announcementClose")}
        </button>
      </div>
    </div>
  );
}
