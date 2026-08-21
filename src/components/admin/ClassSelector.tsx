"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ClassRow } from "@/lib/admin/data";

export default function ClassSelector({
  classes,
  currentClassId,
  label,
}: {
  classes: ClassRow[];
  currentClassId?: string;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(classId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (classId) params.set("classId", classId);
    else params.delete("classId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={currentClassId ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
    >
      <option value="">{label}</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
