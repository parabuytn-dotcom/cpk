"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateAvatarUrl } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";

export default function AvatarUpload({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const t = useTranslations("avatarUpload");
  const [state, action, actionPending] = useActionState(updateAvatarUrl, undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = uploading || actionPending;

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Le fichier doit être une image.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type });
    setUploading(false);

    if (error) {
      setUploadError(error.message);
      return;
    }

    const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const payload = new FormData();
    payload.set("avatarUrl", publicUrl);
    startTransition(() => action(payload));
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} photoUrl={avatarUrl} size={64} />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
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
        {(uploadError || state?.message) && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {uploadError ?? state?.message}
          </p>
        )}
      </div>
    </div>
  );
}
