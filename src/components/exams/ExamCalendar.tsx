"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ExamRow } from "@/lib/admin/data";

const LOCALE_TAG: Record<string, string> = { fr: "fr-FR", ar: "ar-TN", en: "en-US" };

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export default function ExamCalendar({ exams, locale }: { exams: ExamRow[]; locale: string }) {
  const t = useTranslations("exams");
  const localeTag = LOCALE_TAG[locale] ?? locale;
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const examsByDate = useMemo(() => {
    const map = new Map<string, ExamRow[]>();
    for (const exam of exams) {
      map.set(exam.examDate, [...(map.get(exam.examDate) ?? []), exam]);
    }
    return map;
  }, [exams]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = mondayIndex(firstOfMonth);

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeTag, { weekday: "short" });
    // 2024-01-01 is a Monday — a stable reference week to read labels off.
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)));
  }, [localeTag]);

  const monthLabel = new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" }).format(
    viewDate,
  );

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedExams = selectedKey ? (examsByDate.get(selectedKey) ?? []) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-surface flex items-center justify-between rounded-3xl px-5 py-3">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="rounded-full px-3 py-1.5 text-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          aria-label={t("previousMonth")}
        >
          ←
        </button>
        <p className="font-semibold capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="rounded-full px-3 py-1.5 text-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          aria-label={t("nextMonth")}
        >
          →
        </button>
      </div>

      <div className="glass-surface rounded-3xl p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-foreground/50">
          {weekdayLabels.map((label) => (
            <div key={label} className="py-1 capitalize">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (day === null) return <div key={`blank-${index}`} />;
            const key = dateKey(year, month, day);
            const dayExams = examsByDate.get(key) ?? [];
            const hasExams = dayExams.length > 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => hasExams && setSelectedKey(key)}
                disabled={!hasExams}
                className={`flex min-h-16 flex-col items-start gap-0.5 rounded-xl p-1.5 text-left text-xs transition sm:min-h-20 ${
                  hasExams
                    ? "cursor-pointer bg-brand-500/15 hover:bg-brand-500/25 dark:bg-brand-500/20"
                    : ""
                } ${key === todayKey ? "ring-2 ring-brand-500" : ""}`}
              >
                <span className={hasExams ? "font-semibold" : "text-foreground/70"}>{day}</span>
                {dayExams.slice(0, 2).map((exam) => (
                  <span
                    key={exam.id}
                    className={`w-full truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                      exam.type === "synthese"
                        ? "bg-purple-500/20 text-purple-800 dark:text-purple-300"
                        : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    {exam.subject}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      </div>

      {selectedExams.length > 0 && (
        <div className="glass-surface flex flex-col gap-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              {new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "long", year: "numeric" }).format(
                new Date(selectedExams[0].examDate + "T00:00:00"),
              )}
            </p>
            <button
              type="button"
              onClick={() => setSelectedKey(null)}
              className="text-foreground/40 hover:text-foreground"
              aria-label={t("close")}
            >
              ✕
            </button>
          </div>
          {selectedExams.map((exam) => (
            <div key={exam.id} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
              <p className="font-semibold">
                {exam.subject} —{" "}
                <span
                  className={
                    exam.type === "synthese"
                      ? "text-purple-700 dark:text-purple-400"
                      : "text-amber-700 dark:text-amber-400"
                  }
                >
                  {exam.type === "synthese" ? t("typeSynthese") : t("typeControle")}
                </span>
              </p>
              {exam.description && (
                <p className="mt-2 text-sm text-foreground/80">
                  <span className="font-medium">{t("subjectLabel")} : </span>
                  {exam.description}
                </p>
              )}
              {exam.teacherNotes && (
                <p className="mt-1 text-sm text-foreground/80">
                  <span className="font-medium">{t("notesLabel")} : </span>
                  {exam.teacherNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
