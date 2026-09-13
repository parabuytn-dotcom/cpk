import type { QuotaStatus } from "@/lib/admin/data";

// Colour follows what's left, not what's used: the bar should turn alarming as
// the plan runs dry.
function tone(ratio: number) {
  if (ratio <= 0.1) return "bg-red-500";
  if (ratio <= 0.3) return "bg-amber-500";
  return "bg-brand-600";
}

export default function QuotaBar({
  quota,
  label,
  unit,
  caption,
}: {
  quota: QuotaStatus;
  label: string;
  unit: string;
  caption: string;
}) {
  const ratio = quota.total > 0 ? quota.remaining / quota.total : 0;
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm tabular-nums">
          <span className="text-lg font-bold">{quota.remaining}</span>
          <span className="text-foreground/50"> / {quota.total} {unit}</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={quota.total}
        aria-valuenow={quota.remaining}
        className="h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
      >
        <div className={`h-full rounded-full transition-all ${tone(ratio)}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-foreground/50">{caption}</p>
    </div>
  );
}
