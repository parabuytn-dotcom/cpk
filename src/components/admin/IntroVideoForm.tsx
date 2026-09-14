"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { saveIntroVideo } from "@/lib/admin/siteMediaActions";
import { uploadSiteMedia } from "@/lib/siteMediaUpload";

type Source = "none" | "upload" | "youtube";

export default function IntroVideoForm({
  initialSource,
  initialYoutubeId,
  pageUrl,
}: {
  initialSource: Source;
  initialYoutubeId: string;
  pageUrl: string;
}) {
  const [state, action, pending] = useActionState(saveIntroVideo, undefined);
  const [source, setSource] = useState<Source>(initialSource);
  const [uploadPath, setUploadPath] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onFileChosen(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    startUpload(async () => {
      const result = await uploadSiteMedia("intro_video", file);
      if ("error" in result) {
        setUploadError(result.error);
        return;
      }
      setUploadPath(result.path);
      // Save right away: an uploaded video that is never saved is just a lost file.
      requestAnimationFrame(() => formRef.current?.requestSubmit());
    });
  }

  const tabs: [Source, string][] = [
    ["none", "Aucune"],
    ["upload", "Fichier vidéo"],
    ["youtube", "Lien YouTube"],
  ];

  return (
    <form ref={formRef} action={action} className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <div>
        <p className="text-sm font-medium">Vidéo de présentation aux parents</p>
        <p className="mt-1 text-xs text-foreground/50">
          Affichée sur{" "}
          <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {pageUrl.replace(/^https?:\/\//, "")}
          </a>
          , la page ouverte par le code QR des fiches de renseignements. Une vidéo YouTube est lue directement
          dans le site, sans quitter la page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSource(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              source === value
                ? "bg-brand-600 text-white shadow-md"
                : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="uploadPath" value={uploadPath} />

      {source === "upload" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-foreground/60">
            MP4 de préférence, 50 Mo maximum. L&apos;envoi et l&apos;enregistrement se font dès que tu choisis le
            fichier.
          </span>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            disabled={uploading || pending}
            onChange={(e) => onFileChosen(e.target.files?.[0])}
            className="text-sm"
          />
        </label>
      )}

      {source === "youtube" && (
        <input
          name="youtubeUrl"
          type="url"
          defaultValue={initialYoutubeId ? `https://youtu.be/${initialYoutubeId}` : ""}
          placeholder="https://www.youtube.com/watch?v=…"
          className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"
        />
      )}

      {source !== "upload" && (
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : source === "none" ? "Retirer la vidéo" : "Enregistrer"}
        </button>
      )}

      {uploading && <p className="text-sm text-foreground/60">Envoi de la vidéo… garde cette page ouverte.</p>}
      {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
