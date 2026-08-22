"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { updateAvatar } from "@/lib/auth/actions";
import Avatar from "@/components/ui/Avatar";

export default function AvatarUpload({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const t = useTranslations("avatarUpload");
  const [state, action, pending] = useActionState(updateAvatar, undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="flex items-center gap-4">
      <Avatar name={name} photoUrl={avatarUrl} size={64} />
      <div>
        <input
          ref={inputRef}
          type="file"
          name="avatar"
          accept="image/*"
          onChange={() => inputRef.current?.form?.requestSubmit()}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white/80 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          {pending ? t("uploading") : t("change")}
        </button>
        {state?.message && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.message}</p>
        )}
      </div>
    </form>
  );
}
