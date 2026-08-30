"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createPost } from "@/lib/social/actions";
import { createClient } from "@/lib/supabase/client";

export default function PostComposer({
  userId,
  canPostImage,
  canPostVideo,
}: {
  userId: string;
  canPostImage: boolean;
  canPostVideo: boolean;
}) {
  const t = useTranslations("feed");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, actionPending] = useActionState(createPost, undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Only clear the form once the post is actually confirmed saved — clearing
  // it right on submit (regardless of outcome) meant a failed post (e.g. a
  // permissions error) silently wiped out what the user had typed.
  useEffect(() => {
    if (state?.success !== undefined) formRef.current?.reset();
  }, [state]);

  const accept = canPostVideo ? "image/*,video/*" : canPostImage ? "image/*" : undefined;
  const pending = uploading || actionPending;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);

    const form = e.currentTarget;
    const content = new FormData(form).get("content") as string;
    const fileInput = form.elements.namedItem("media") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    const payload = new FormData();
    payload.set("content", content);

    if (file) {
      setUploading(true);
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("feed-media")
        .upload(path, file, { contentType: file.type });
      setUploading(false);

      if (error) {
        setUploadError(error.message);
        return;
      }
      payload.set("mediaType", mediaType);
      payload.set("mediaPath", path);
    }

    startTransition(() => formAction(payload));
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-gray-900"
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
      {(uploadError || state?.message) && (
        <p className="text-sm text-red-600 dark:text-red-400">{uploadError ?? state?.message}</p>
      )}
    </form>
  );
}
