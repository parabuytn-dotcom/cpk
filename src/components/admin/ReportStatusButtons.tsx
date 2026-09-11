"use client";

import { useTransition } from "react";
import { setReportStatus } from "@/lib/admin/actions";

export default function ReportStatusButtons({ reportId }: { reportId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => setReportStatus(reportId, "reviewed"))}
        className="rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        Traité
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => setReportStatus(reportId, "dismissed"))}
        className="rounded-full border border-black/10 px-4 py-2 text-xs font-medium transition hover:bg-black/5 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/10"
      >
        Sans suite
      </button>
    </div>
  );
}
