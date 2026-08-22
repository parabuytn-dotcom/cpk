import type { EarnedBadge } from "@/lib/badges/data";

export default function BadgesRow({ badges }: { badges: EarnedBadge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.code}
          title={badge.description}
          className="glass-surface flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
        >
          <span aria-hidden>{badge.emoji}</span>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
