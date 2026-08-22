"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { incrementResourceView, deleteCourseResource } from "@/lib/vault/actions";
import type { CourseResourceRow } from "@/lib/vault/data";

export default function ResourceRow({
  resource,
  canDelete,
}: {
  resource: CourseResourceRow;
  canDelete: boolean;
}) {
  const t = useTranslations("vault");
  const [, startTransition] = useTransition();

  return (
    <div className="glass-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
      <div>
        <p className="font-semibold">{resource.subject}</p>
        <p className="text-sm text-foreground/60">
          {resource.fileName} · {resource.uploadedByName ?? "?"} · {resource.viewCount} {t("views")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {resource.fileUrl && (
          <a
            href={resource.fileUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => startTransition(() => incrementResourceView(resource.id))}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700"
          >
            {t("open")}
          </a>
        )}
        {canDelete && (
          <button
            onClick={() => {
              if (confirm(t("confirmDelete"))) {
                startTransition(() => deleteCourseResource(resource.id));
              }
            }}
            className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
          >
            {t("delete")}
          </button>
        )}
      </div>
    </div>
  );
}
