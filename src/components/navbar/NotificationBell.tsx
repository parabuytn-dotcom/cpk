"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/actions";
import { formatDateTime } from "@/lib/formatDate";
import type { NotificationRow } from "@/lib/notifications/data";

export default function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationRow[];
  unreadCount: number;
}) {
  const t = useTranslations("notificationsUi");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleClickNotification(n: NotificationRow) {
    setOpen(false);
    if (!n.read) startTransition(() => markNotificationRead(n.id));
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/40 transition hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20"
      >
        <span aria-hidden>🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-surface absolute right-0 top-12 z-50 w-80 max-w-[90vw] rounded-2xl p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-semibold">{t("title")}</p>
            {unreadCount > 0 && (
              <button
                onClick={() => startTransition(() => markAllNotificationsRead())}
                className="text-xs text-brand-600 hover:underline dark:text-brand-400"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-foreground/50">{t("empty")}</p>
          ) : (
            <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`rounded-xl px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/10 ${
                    n.read ? "text-foreground/60" : "font-medium"
                  }`}
                >
                  {n.message}
                  <span className="mt-0.5 block text-xs font-normal text-foreground/40">
                    {formatDateTime(locale, n.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
