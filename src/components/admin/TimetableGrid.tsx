import type { TimetableEntryRow } from "@/lib/admin/data";

const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function slotKey(startTime: string, endTime: string) {
  return `${startTime}-${endTime}`;
}

export default function TimetableGrid({ entries }: { entries: TimetableEntryRow[] }) {
  if (entries.length === 0) {
    return (
      <div className="glass-surface rounded-3xl px-6 py-10 text-center text-foreground/60">
        Aucun créneau pour cette classe.
      </div>
    );
  }

  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => d <= 6 || entries.some((e) => e.dayOfWeek === d));

  const slotsMap = new Map<string, { startTime: string; endTime: string }>();
  for (const entry of entries) {
    slotsMap.set(slotKey(entry.startTime, entry.endTime), {
      startTime: entry.startTime,
      endTime: entry.endTime,
    });
  }
  const slots = [...slotsMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const byDayAndSlot = new Map<string, TimetableEntryRow[]>();
  for (const entry of entries) {
    const key = `${entry.dayOfWeek}|${slotKey(entry.startTime, entry.endTime)}`;
    byDayAndSlot.set(key, [...(byDayAndSlot.get(key) ?? []), entry]);
  }

  return (
    <div className="glass-surface overflow-x-auto rounded-3xl p-2">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-foreground/60 dark:bg-gray-900">
              Jour
            </th>
            {slots.map((slot) => (
              <th
                key={slotKey(slot.startTime, slot.endTime)}
                className="whitespace-nowrap px-3 py-2 text-center text-foreground/60"
              >
                {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day} className="border-t border-black/5 dark:border-white/10">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 font-medium dark:bg-gray-900">
                {DAY_LABELS[day]}
              </td>
              {slots.map((slot) => {
                const key = `${day}|${slotKey(slot.startTime, slot.endTime)}`;
                const cellEntries = byDayAndSlot.get(key) ?? [];
                return (
                  <td key={key} className="min-w-28 px-1.5 py-1.5 align-top">
                    <div className="flex flex-col gap-1">
                      {cellEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`rounded-xl px-2 py-1.5 ${
                            entry.isCancelled
                              ? "bg-red-500/10 text-red-600/70 line-through dark:text-red-400/70"
                              : "bg-brand-500/10"
                          }`}
                        >
                          <p className="font-medium">{entry.subject}</p>
                          {entry.teacherName && (
                            <p className="font-normal text-foreground/50">{entry.teacherName}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
