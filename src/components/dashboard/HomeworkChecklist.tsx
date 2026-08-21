"use client";

import { useTransition } from "react";
import { toggleHomeworkCompletion } from "@/lib/admin/actions";
import type { HomeworkRow } from "@/lib/admin/data";

const PRIORITY_LABEL: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

export default function HomeworkChecklist({
  items,
}: {
  items: (HomeworkRow & { completed: boolean })[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <label
          key={item.id}
          className="glass-surface flex items-start gap-3 rounded-2xl px-5 py-4"
        >
          <input
            type="checkbox"
            defaultChecked={item.completed}
            disabled={isPending}
            onChange={(e) =>
              startTransition(() => toggleHomeworkCompletion(item.id, e.target.checked))
            }
            className="mt-1 h-5 w-5"
          />
          <div className={item.completed ? "opacity-50" : ""}>
            <p className="font-semibold">
              {item.subject} <span className="font-normal text-foreground/60">— {item.description}</span>
            </p>
            <p className="text-sm text-foreground/60">
              Pour le {new Date(item.dueDate).toLocaleDateString("fr-FR")} · Priorité{" "}
              {PRIORITY_LABEL[item.priority] ?? item.priority}
            </p>
          </div>
        </label>
      ))}
    </div>
  );
}
