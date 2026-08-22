"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createPost } from "@/lib/social/actions";

export default function PostComposer({
  canPostImage,
  canPostVideo,
}: {
  canPostImage: boolean;
  canPostVideo: boolean;
}) {
  const t = useTranslations("feed");
  const [state, action, pending] = useActionState(createPost, undefined);

  const accept = canPostVideo ? "image/*,video/*" : canPostImage ? "image/*" : undefined;

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="glass-surface flex flex-col gap-3 rounded-3xl p-5"
    >
      <textarea
        name="content"
        placeholder={t("placeholder")}
        rows={3}
        required
        className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
      />
      {accept && (
        <div>
          <input type="file" name="media" accept={accept} className="text-sm" />
          {canPostVideo && <p className="mt-1 text-xs text-foreground/50">{t("videoHint")}</p>}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? t("publishing") : t("publish")}
      </button>
      {state?.message && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}
    </form>
  );
}
