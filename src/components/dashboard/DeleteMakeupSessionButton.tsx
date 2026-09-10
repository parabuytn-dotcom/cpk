"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteMakeupSession } from "@/lib/admin/actions";

export default function DeleteMakeupSessionButton({ sessionId }: { sessionId: string }) {
  const t = useTranslations("makeup");
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm(t("confirmDelete"))) {
          startTransition(() => deleteMakeupSession(sessionId));
        }
      }}
      disabled={isPending}
      aria-label={t("deleteLabel")}
      className="text-foreground/40 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      🗑
    </button>
  );
}
