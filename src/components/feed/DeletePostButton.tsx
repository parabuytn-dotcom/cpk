"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deletePost } from "@/lib/social/actions";

export default function DeletePostButton({ postId }: { postId: string }) {
  const t = useTranslations("feed");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setOpen(false);
    if (confirm(t("confirmDelete"))) {
      startTransition(() => deletePost(postId));
    }
  }

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("options")}
        className="rounded-full px-2 py-1 text-lg leading-none text-foreground/50 transition hover:bg-black/5 dark:hover:bg-white/10"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border border-black/5 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-900">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-black/5 disabled:opacity-50 dark:text-red-400 dark:hover:bg-white/10"
          >
            {t("delete")}
          </button>
        </div>
      )}
    </div>
  );
}
