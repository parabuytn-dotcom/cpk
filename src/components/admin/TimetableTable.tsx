import type { TimetableEntryRow } from "@/lib/admin/data";

const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function TimetableTable({ entries }: { entries: TimetableEntryRow[] }) {
  if (entries.length === 0) {
    return (
      <div className="glass-surface rounded-3xl px-6 py-10 text-center text-foreground/60">
        Aucun créneau pour cette classe.
      </div>
    );
  }

  return (
    <div className="glass-surface overflow-x-auto rounded-3xl p-2">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-foreground/60">
            <th className="px-4 py-2">Jour</th>
            <th className="px-4 py-2">Horaire</th>
            <th className="px-4 py-2">Matière</th>
            <th className="px-4 py-2">Professeur</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className={entry.isCancelled ? "text-foreground/40" : ""}
            >
              <td className="px-4 py-2">{DAY_LABELS[entry.dayOfWeek]}</td>
              <td className={`px-4 py-2 ${entry.isCancelled ? "line-through" : ""}`}>
                {entry.startTime.slice(0, 5)}–{entry.endTime.slice(0, 5)}
              </td>
              <td className={`px-4 py-2 ${entry.isCancelled ? "line-through" : ""}`}>
                {entry.subject}
                {entry.isCancelled && (
                  <span className="ml-2 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                    Absent(e)
                  </span>
                )}
              </td>
              <td className="px-4 py-2">{entry.teacherName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
