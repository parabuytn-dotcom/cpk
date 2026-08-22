import { getTranslations } from "next-intl/server";
import type { CurrentProfile } from "@/lib/auth/session";

export default async function ProfileProgress({ profile }: { profile: CurrentProfile }) {
  const t = await getTranslations("profile");

  const needsCin = profile.registrationMethod === "email";
  const identityDone = needsCin ? Boolean(profile.cin) : Boolean(profile.contactEmail);

  const items = [
    { label: t("phone"), done: Boolean(profile.phone) },
    { label: needsCin ? t("cin") : t("contactEmail"), done: identityDone },
    { label: t("photo"), done: Boolean(profile.avatarUrl) },
  ];

  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  const percent = Math.round((doneCount / items.length) * 100);

  return (
    <div className="glass-surface rounded-2xl px-5 py-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <p className="font-medium">{t("title")}</p>
        <p className="text-foreground/60">{`${doneCount}/${items.length}`}</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-foreground/60">
        {t("missing")}:{" "}
        {items
          .filter((i) => !i.done)
          .map((i) => i.label)
          .join(", ")}
      </p>
    </div>
  );
}
