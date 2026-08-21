"use client";

import { useTransition } from "react";
import { updateHelpRequestStatus } from "@/lib/admin/actions";
import type { HelpRequestRow } from "@/lib/admin/data";

const STATUSES = ["open", "in_progress", "closed"];

export default function HelpRequestRowItem({ request }: { request: HelpRequestRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="glass-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
      <div>
        <p className="font-semibold">{request.subject}</p>
        <p className="text-sm text-foreground/60">{request.description}</p>
      </div>
      <select
        defaultValue={request.status}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() => updateHelpRequestStatus(request.id, e.target.value))
        }
        className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
