"use client";

// Building blocks shared by the admin's urgent composer and the teachers'
// convocation form: one card per channel, removable, with repeat settings.

export const URGENT_INTERVALS = [5, 10, 15, 20, 30, 40, 45, 60, 90, 120, 180, 240, 360];

export const urgentInputClass =
  "w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-red-500 dark:border-white/10 dark:bg-white/5";

export function formatInterval(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest}` : `${hours} h`;
}

export function ChannelCard({
  title,
  icon,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  enabled: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${
        enabled
          ? "border-red-500/40 bg-red-500/5"
          : "border-dashed border-black/15 bg-transparent opacity-70 dark:border-white/15"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">
          <span aria-hidden>{icon}</span> {title}
        </p>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            enabled
              ? "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {enabled ? "Retirer" : "Ajouter"}
        </button>
      </div>
      {enabled ? children : <p className="text-xs text-foreground/50">Non envoyé.</p>}
    </div>
  );
}

export function RepeatFields({
  count,
  setCount,
  interval,
  setInterval,
  max,
}: {
  count: number;
  setCount: (n: number) => void;
  interval: number;
  setInterval: (n: number) => void;
  max: number;
}) {
  const intervals = URGENT_INTERVALS.includes(interval) ? URGENT_INTERVALS : [...URGENT_INTERVALS, interval].sort((a, b) => a - b);
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-xs text-foreground/60">
        Nombre d&apos;envois
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={urgentInputClass}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n === 1 ? "1 envoi" : `${n} envois`}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-foreground/60">
        Délai entre deux
        <select
          value={interval}
          disabled={count === 1}
          onChange={(e) => setInterval(Number(e.target.value))}
          className={`${urgentInputClass} disabled:opacity-50`}
        >
          {intervals.map((m) => (
            <option key={m} value={m}>
              {formatInterval(m)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
