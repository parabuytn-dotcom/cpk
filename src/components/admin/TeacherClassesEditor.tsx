"use client";

import { useState, useTransition } from "react";
import { updateTeacherClasses } from "@/lib/admin/actions";
import type { ClassRow } from "@/lib/admin/data";

export default function TeacherClassesEditor({
  teacherId,
  classes,
  initialClassIds,
}: {
  teacherId: string;
  classes: ClassRow[];
  initialClassIds: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialClassIds);
  const [isPending, startTransition] = useTransition();

  function toggle(classId: string) {
    const next = selected.includes(classId)
      ? selected.filter((id) => id !== classId)
      : [...selected, classId];
    setSelected(next);
    startTransition(() => updateTeacherClasses(teacherId, next));
  }

  if (classes.length === 0) return null;

  return (
    <div className="flex w-full flex-wrap gap-1.5">
      {classes.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={isPending}
          onClick={() => toggle(c.id)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
            selected.includes(c.id)
              ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-400"
              : "border-black/10 text-foreground/50 hover:border-brand-500/50 dark:border-white/10"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
