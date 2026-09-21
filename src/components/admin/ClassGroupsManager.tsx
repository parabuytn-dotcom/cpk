"use client";

import { useState, useTransition } from "react";
import { createClassGroup, deleteClassGroup, setGroupMembership } from "@/lib/admin/classGroups";

export type GroupMember = { userId: string; name: string };
export type ClassGroup = { id: string; name: string; memberIds: string[] };

export default function ClassGroupsManager({
  classId,
  className,
  groups,
  pupils,
}: {
  classId: string;
  className: string;
  groups: ClassGroup[];
  pupils: GroupMember[];
}) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <section className="glass-surface flex flex-col gap-4 rounded-3xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{className}</h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nouveau groupe (ex. : Groupe 1)"
            className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          />
          <button
            type="button"
            disabled={isPending || !name.trim()}
            onClick={() =>
              startTransition(async () => {
                await createClassGroup(classId, name);
                setName("");
              })
            }
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucun demi-groupe. Ajoute « Groupe 1 » et « Groupe 2 » pour les cours où la classe est coupée en deux.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-2xl bg-black/[0.04] p-4 dark:bg-white/5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold">{group.name}</p>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(`Supprimer ${group.name} ? Les cours de ce groupe redeviennent des cours de classe entière.`)) {
                      startTransition(() => deleteClassGroup(group.id));
                    }
                  }}
                  className="text-xs text-foreground/50 transition hover:text-red-600"
                >
                  Supprimer
                </button>
              </div>
              {pupils.length === 0 ? (
                <p className="text-xs text-foreground/55">Aucun élève dans cette classe pour le moment.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {pupils.map((pupil) => {
                    const checked = group.memberIds.includes(pupil.userId);
                    return (
                      <label key={pupil.userId} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isPending}
                          onChange={(e) =>
                            startTransition(() => setGroupMembership(group.id, pupil.userId, e.target.checked))
                          }
                        />
                        {pupil.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
