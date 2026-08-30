"use client";

import { useState, useTransition } from "react";
import { createDocumentAccounts } from "@/lib/admin/actions";
import type { ClassRow } from "@/lib/admin/data";

type Row = { fullName: string; phone: string; childFirstName: string; childClass: string };

function emptyRow(defaultClass: string): Row {
  return { fullName: "", phone: "", childFirstName: "", childClass: defaultClass };
}

export default function DocumentAccountsForm({ classes }: { classes: ClassRow[] }) {
  const defaultClass = classes[0]?.name ?? "";
  const [rows, setRows] = useState<Row[]>([emptyRow(defaultClass)]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow(defaultClass)]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleSubmit() {
    setError(null);
    setSuccessCount(null);
    startTransition(async () => {
      const result = await createDocumentAccounts(rows);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const byteChars = atob(result.pdfBase64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fiches-connexion-cpk.pdf";
      a.click();
      URL.revokeObjectURL(url);

      setSuccessCount(rows.length);
      setRows([emptyRow(defaultClass)]);
    });
  }

  return (
    <div className="glass-surface flex flex-col gap-4 rounded-3xl p-6">
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-2xl border border-black/10 p-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto] dark:border-white/10"
          >
            <input
              value={row.fullName}
              onChange={(e) => updateRow(index, "fullName", e.target.value)}
              placeholder="Nom et prénom (parent)"
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            />
            <input
              value={row.phone}
              onChange={(e) => updateRow(index, "phone", e.target.value)}
              placeholder="Téléphone (8 chiffres)"
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            />
            <input
              value={row.childFirstName}
              onChange={(e) => updateRow(index, "childFirstName", e.target.value)}
              placeholder="Prénom de l'enfant"
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            />
            <select
              value={row.childClass}
              onChange={(e) => updateRow(index, "childClass", e.target.value)}
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={rows.length === 1}
              className="rounded-xl px-3 py-2 text-sm text-foreground/40 transition hover:text-red-600 disabled:opacity-30 dark:hover:text-red-400"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          + Ajouter une ligne
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || classes.length === 0}
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? "Création…" : "Créer les comptes et générer le PDF"}
        </button>
      </div>

      {classes.length === 0 && (
        <p className="text-sm text-foreground/60">Crée d&apos;abord au moins une classe.</p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {successCount !== null && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {successCount} compte(s) créé(s) — le PDF a été téléchargé.
        </p>
      )}
    </div>
  );
}
