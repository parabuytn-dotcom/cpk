import type { TimetableEntryRow } from "@/lib/admin/data";
import { buildColumns, layOutLane, shortTime, splitIntoLanes } from "@/lib/timetable/grid";
import DeleteTimetableEntryButton from "./DeleteTimetableEntryButton";

const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function TimetableGrid({
  entries,
  canDelete = false,
}: {
  entries: TimetableEntryRow[];
  canDelete?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="glass-surface rounded-3xl px-6 py-10 text-center text-foreground/60">
        Aucun créneau pour cette classe.
      </div>
    );
  }

  const columns = buildColumns(entries);
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => d <= 6 || entries.some((e) => e.dayOfWeek === d));

  return (
    <div className="glass-surface overflow-x-auto rounded-3xl p-2">
      <table className="w-full min-w-[46rem] border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-foreground/60 dark:bg-gray-900">Jour</th>
            {columns.map((column) => (
              <th
                key={column.start}
                className="whitespace-nowrap px-2 py-2 text-center font-medium text-foreground/60"
              >
                {shortTime(column.start)}–{shortTime(column.end)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const lanes = splitIntoLanes(entries.filter((e) => e.dayOfWeek === day));

            return lanes.map((lane, laneIndex) => (
              <tr
                key={`${day}-${laneIndex}`}
                className={laneIndex === 0 ? "border-t border-black/10 dark:border-white/15" : ""}
              >
                {laneIndex === 0 && (
                  <td
                    rowSpan={lanes.length}
                    className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 align-top font-medium dark:bg-gray-900"
                  >
                    {DAY_LABELS[day]}
                  </td>
                )}
                {layOutLane(lane, columns).map((cell, columnIndex) => {
                  if (cell === "covered") return null;
                  if (cell === null) {
                    return <td key={columns[columnIndex].start} className="px-1 py-1" />;
                  }

                  const { entry, span } = cell;
                  return (
                    <td key={columns[columnIndex].start} colSpan={span} className="px-1 py-1 align-top">
                      <div
                        className={`flex h-full items-start justify-between gap-1 rounded-xl px-2 py-1.5 ${
                          entry.isCancelled
                            ? "bg-red-500/10 text-red-600/70 line-through dark:text-red-400/70"
                            : "bg-brand-500/10"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold">{entry.subject}</p>
                          {(entry.room || entry.teacherName) && (
                            <p className="font-normal text-foreground/50">
                              {[entry.room, entry.teacherName].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {(entry.weekParity !== "all" || entry.groupName) && (
                            <p className="mt-0.5 text-[10px] font-semibold text-foreground/45">
                              {[entry.weekParity !== "all" ? `Sem. ${entry.weekParity}` : null, entry.groupName]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                        {canDelete && <DeleteTimetableEntryButton entryId={entry.id} />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
