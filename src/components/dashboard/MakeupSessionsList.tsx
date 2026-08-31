import type { MakeupSessionRow } from "@/lib/admin/data";
import { formatDate } from "@/lib/formatDate";
import DeleteMakeupSessionButton from "./DeleteMakeupSessionButton";

export default function MakeupSessionsList({
  sessions,
  locale,
  canDelete = false,
}: {
  sessions: MakeupSessionRow[];
  locale: string;
  canDelete?: boolean;
}) {
  if (sessions.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Séances de rattrapage à venir</h2>
      <div className="flex flex-col gap-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="glass-surface flex items-center justify-between gap-4 rounded-2xl px-5 py-3"
          >
            <div>
              <p className="font-medium">
                {session.subject} · {formatDate(locale, session.sessionDate)} ·{" "}
                {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)}
              </p>
              <p className="text-sm text-foreground/60">
                {session.teacherName ?? "—"}
                {session.reason ? ` — ${session.reason}` : ""}
              </p>
            </div>
            {canDelete && <DeleteMakeupSessionButton sessionId={session.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
