const ACCENTS = {
  blue: "text-sky-400 border-sky-500/25",
  green: "text-emerald-400 border-emerald-500/25",
  slate: "text-slate-400 border-slate-500/25",
  amber: "text-amber-400 border-amber-500/25",
  rose: "text-rose-400 border-rose-500/25",
  violet: "text-violet-400 border-violet-500/25",
} as const;

export default function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: string;
  accent: keyof typeof ACCENTS;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border bg-gray-950 px-5 py-4 shadow-lg shadow-black/20 ${ACCENTS[accent]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span aria-hidden className="text-base leading-none">
          {icon}
        </span>
      </div>
      <span className={`text-3xl font-bold tabular-nums ${ACCENTS[accent].split(" ")[0]}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
