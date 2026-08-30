"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleLike } from "@/lib/social/actions";

export default function PostActionsRow({
  postId,
  initialLiked,
  initialCount,
  commentAnchor,
  shareUrl,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  commentAnchor: string;
  shareUrl: string;
}) {
  const t = useTranslations("feed");
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  function handleLike() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(() => toggleLike(postId, next));
  }

  async function handleShare() {
    // Web Share API on supporting devices; clipboard-copy fallback everywhere
    // else — same two-step behavior as Instagram's own "Copy link" share option.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url: shareUrl });
        return;
      } catch {
        // User cancelled the native share sheet — fall through to clipboard copy.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — nothing more we can do silently.
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="-ml-2 flex items-center gap-1">
        <button
          type="button"
          onClick={handleLike}
          aria-label={t("like")}
          className="rounded-full p-2 text-xl transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          {liked ? "❤️" : "🤍"}
        </button>
        <a
          href={commentAnchor}
          aria-label={t("comment")}
          className="rounded-full p-2 text-xl transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          💬
        </a>
        <button
          type="button"
          onClick={handleShare}
          aria-label={t("share")}
          className="rounded-full p-2 text-xl transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          📤
        </button>
        {copied && <span className="text-xs text-foreground/50">{t("linkCopied")}</span>}
      </div>
      {count > 0 && <p className="text-sm font-semibold">{t("likesCount", { count })}</p>}
    </div>
  );
}
