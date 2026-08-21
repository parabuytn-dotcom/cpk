"use client";

import { useTransition } from "react";
import { deleteStaffMember } from "@/lib/admin/actions";
import Avatar from "@/components/ui/Avatar";
import type { StaffMemberRow } from "@/lib/admin/data";

export default function StaffRow({ member }: { member: StaffMemberRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="glass-surface flex items-center justify-between gap-4 rounded-2xl px-5 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={member.fullName} photoUrl={member.showPhoto ? member.photoUrl : null} size={48} />
        <div>
          <p className="font-semibold">{member.fullName}</p>
          <p className="text-sm text-foreground/60">{member.roleTitle}</p>
        </div>
      </div>
      <button
        onClick={() => {
          if (confirm(`Retirer ${member.fullName} du staff ?`)) {
            startTransition(() => deleteStaffMember(member.id));
          }
        }}
        disabled={isPending}
        className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
      >
        Retirer
      </button>
    </div>
  );
}
