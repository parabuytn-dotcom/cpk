"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleFollow } from "@/lib/profiles/actions";

export default function FollowButton({
  userId,
  initialFollowing,
}: {
  userId: string;
  initialFollowing: boolean;
}) {
  const t = useTranslations("userProfile");
  const [following, setFollowing] = useState(initialFollowing);
  const [, startTransition] = useTransition();

  function handleClick() {
    const next = !following;
    setFollowing(next);
    startTransition(() => toggleFollow(userId, next));
  }

  return (
    <button
      onClick={handleClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold shadow-md transition ${
        following
          ? "bg-black/5 text-foreground hover:bg-red-500/10 hover:text-red-600 dark:bg-white/10"
          : "bg-brand-600 text-white hover:bg-brand-700"
      }`}
    >
      {following ? t("following") : t("follow")}
    </button>
  );
}
