"use client";

import { useActionState } from "react";
import { upsertTimetableEntry } from "@/lib/admin/actions";
import type { ClassRow, TeacherRow } from "@/lib/admin/data";

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

export default function ManualEntryForm({
  classRow,
  teachers,
}: {
  classRow: ClassRow;
  teachers: TeacherRow[];
}) {
  const [state, action, pending] = useActionState(upsertTimetableEntry, undefined);

  return (
    <form action={action} className="glass-surface grid gap-3 rounded-3xl p-6 sm:grid-cols-2">
      <input type="hidden" name="classId" value={classRow.id} />
      <input type="hidden" name="className" value={classRow.name} />

      <select
        name="dayOfWeek"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      >
        {DAYS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      <input
        name="subject"
        placeholder="Matière"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />
      <input
        type="time"
        name="startTime"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />
      <input
        type="time"
        name="endTime"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />
      <select
        name="teacherId"
        required
        defaultValue=""
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 sm:col-span-2 dark:border-white/10 dark:bg-white/5"
      >
        <option value="" disabled>
          Choisir un professeur…
        </option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.firstName} {teacher.lastName}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
      >
        Ajouter le créneau
      </button>
      {state?.message && (
        <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{state.message}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400 sm:col-span-2">{state.success}</p>
      )}
    </form>
  );
}
