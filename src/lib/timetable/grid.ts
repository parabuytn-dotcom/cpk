// Laying a week of lessons onto a grid.
//
// Kept out of the component so it can be checked against a real timetable
// without a browser or a database.

export type GridEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type Column = { start: string; end: string };

/** "08:00:00" → "08:00", so database times and typed times compare. */
export function hhmm(time: string) {
  return time.slice(0, 5);
}

/** "08:00" → "8h", "08:30" → "8h30" — how a timetable is read out loud. */
export function shortTime(time: string) {
  const [h, m] = time.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/**
 * One column per span between two consecutive times used anywhere in the
 * week — not one per distinct pair of hours. A two-hour lesson then covers
 * two columns instead of opening a column of its own, which is what turned
 * a nine-hour day into fourteen half-empty columns.
 */
export function buildColumns(entries: GridEntry[]): Column[] {
  const boundaries = new Set<string>();
  for (const entry of entries) {
    boundaries.add(hhmm(entry.startTime));
    boundaries.add(hhmm(entry.endTime));
  }
  const times = [...boundaries].sort();
  return times.slice(0, -1).map((start, i) => ({ start, end: times[i + 1] }));
}

/**
 * Lessons that overlap go on separate lines of the same day — exactly how the
 * paper timetable shows a morning split between two half-groups.
 */
export function splitIntoLanes<T extends GridEntry>(dayEntries: T[]): T[][] {
  const sorted = [...dayEntries].sort(
    (a, b) =>
      hhmm(a.startTime).localeCompare(hhmm(b.startTime)) ||
      hhmm(a.endTime).localeCompare(hhmm(b.endTime)),
  );
  const lanes: T[][] = [];

  for (const entry of sorted) {
    const start = hhmm(entry.startTime);
    const end = hhmm(entry.endTime);
    const lane = lanes.find((candidates) =>
      candidates.every((other) => hhmm(other.startTime) >= end || hhmm(other.endTime) <= start),
    );
    if (lane) lane.push(entry);
    else lanes.push([entry]);
  }

  return lanes.length > 0 ? lanes : [[]];
}

export type Cell<T> = { entry: T; span: number } | "covered" | null;

/** One array per lane, aligned on `columns`: where each lesson starts and how wide it is. */
export function layOutLane<T extends GridEntry>(lane: T[], columns: Column[]): Cell<T>[] {
  const cells: Cell<T>[] = new Array(columns.length).fill(null);

  for (const entry of lane) {
    const from = columns.findIndex((c) => c.start === hhmm(entry.startTime));
    const to = columns.findIndex((c) => c.end === hhmm(entry.endTime));
    if (from === -1 || to === -1 || to < from) continue;
    cells[from] = { entry, span: to - from + 1 };
    for (let i = from + 1; i <= to; i += 1) cells[i] = "covered";
  }

  return cells;
}
