"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import Avatar from "@/components/ui/Avatar";
import { saveAboutPhoto } from "@/lib/admin/siteMediaActions";
import { uploadSiteMedia } from "@/lib/siteMediaUpload";

type Person = { key: "melik" | "edem"; name: string; photoUrl: string; isUploaded: boolean };

export default function AboutPhotosForm({ people }: { people: Person[] }) {
  return (
    <div className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <div>
        <p className="text-sm font-medium">Photos de la page « Plus de nous »</p>
        <p className="mt-1 text-xs text-foreground/50">
          Une photo carrée, cadrée sur le visage, rend le mieux (elle est affichée dans un cercle). JPG ou PNG,
          8 Mo maximum.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {people.map((person) => (
          <PhotoSlot key={person.key} person={person} />
        ))}
      </div>
    </div>
  );
}

function PhotoSlot({ person }: { person: Person }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function run(task: () => Promise<{ error?: string }>, successMessage: string) {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const result = await task();
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(successMessage);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-black/5 p-3 dark:bg-white/5">
      <Avatar name={person.name} photoUrl={person.photoUrl} size={64} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-sm font-semibold">{person.name}</p>
        <label className="cursor-pointer self-start rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700">
          {pending ? "Envoi…" : "Changer la photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              run(async () => {
                const uploaded = await uploadSiteMedia(person.key, file);
                if ("error" in uploaded) return { error: uploaded.error };
                return saveAboutPhoto(person.key, uploaded.path);
              }, "Photo mise à jour.");
            }}
          />
        </label>
        {person.isUploaded && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => saveAboutPhoto(person.key, null), "Photo d'origine rétablie.")}
            className="self-start text-xs text-foreground/50 underline hover:text-red-600"
          >
            Revenir à la photo d&apos;origine
          </button>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        {done && <p className="text-xs text-green-600 dark:text-green-400">{done}</p>}
      </div>
    </div>
  );
}
