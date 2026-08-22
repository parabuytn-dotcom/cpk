"use client";

import { useState, useTransition } from "react";
import { startDirectConversation } from "@/lib/messaging/actions";
import type { ConversationMember } from "@/lib/messaging/data";

export default function MemberList({ members }: { members: ConversationMember[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="glass-surface rounded-2xl px-5 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-foreground/70"
      >
        {members.length} membre(s) {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-1">
              <span className="text-sm">{m.name}</span>
              <button
                onClick={() => startTransition(() => startDirectConversation(m.id))}
                disabled={isPending}
                className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium transition hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
              >
                Message privé
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
