"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "@/lib/social/actions";

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  function handleClick() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(() => toggleLike(postId, next));
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        liked
          ? "bg-red-500/10 text-red-600 dark:text-red-400"
          : "text-foreground/60 hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      <span aria-hidden>{liked ? "❤️" : "🤍"}</span>
      {count > 0 ? count : "J'aime"}
    </button>
  );
}
