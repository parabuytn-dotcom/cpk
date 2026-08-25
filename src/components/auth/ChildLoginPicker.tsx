"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { loginAsChild } from "@/lib/auth/actions";
import type { ChildLoginClass, ChildLoginStudent } from "@/lib/auth/data";

export default function ChildLoginPicker({
  classes,
  students,
}: {
  classes: ChildLoginClass[];
  students: ChildLoginStudent[];
}) {
  const t = useTranslations("auth");
  const [classId, setClassId] = useState<string | null>(null);
  const [student, setStudent] = useState<ChildLoginStudent | null>(null);
  const [state, action, pending] = useActionState(loginAsChild, undefined);

  const selectedClass = classes.find((c) => c.id === classId);
  const classmates = students.filter((s) => s.classId === classId);

  if (student) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setStudent(null)}
          className="self-start text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          ← {t("childLoginChangeStudent")}
        </button>
        <p className="text-sm text-foreground/70">
          {t("childLoginGreeting", { name: student.firstName })}
        </p>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="studentId" value={student.id} />
          <div>
            <label className="mb-1 block text-sm font-medium">{t("password")}</label>
            <input
              name="password"
              type="password"
              required
              autoFocus
              className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
          >
            {t("submitLogin")}
          </button>
        </form>
        {state?.message && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
        )}
      </div>
    );
  }

  if (selectedClass) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setClassId(null)}
          className="self-start text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          ← {t("childLoginChangeClass")}
        </button>
        <p className="text-sm font-medium text-foreground/70">{selectedClass.name}</p>
        {classmates.length === 0 ? (
          <p className="text-sm text-foreground/50">{t("childLoginNoStudents")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {classmates.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={!s.hasAccount}
                onClick={() => setStudent(s)}
                className="rounded-xl border border-black/10 px-3 py-2.5 text-center text-sm font-medium transition hover:border-brand-500 hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              >
                {s.firstName} {s.lastName ?? ""}
                {!s.hasAccount && (
                  <span className="mt-0.5 block text-[10px] font-normal text-foreground/50">
                    {t("childLoginNoAccount")}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/70">{t("childLoginSelectClass")}</p>
      {classes.length === 0 ? (
        <p className="text-sm text-foreground/50">{t("childLoginNoStudents")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setClassId(c.id)}
              className="rounded-xl border border-black/10 px-3 py-2.5 text-center text-sm font-medium transition hover:border-brand-500 hover:bg-brand-500/10 dark:border-white/10"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
