"use client";

import { useTransition } from "react";
import { deletePost } from "@/lib/social/actions";

export default function DeletePostButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Supprimer cette publication ?")) {
          startTransition(() => deletePost(postId));
        }
      }}
      disabled={isPending}
      aria-label="Supprimer"
      className="ml-auto text-foreground/40 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      🗑
    </button>
  );
}
