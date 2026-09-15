import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ConvocationStudent = {
  id: string;
  name: string;
  className: string;
  parentId: string | null;
  parentName: string | null;
  parentHasPhone: boolean;
};

export type TeacherScope = {
  teacherName: string;
  subject: string | null;
  defaultPhone: string;
  classes: string[];
  students: ConvocationStudent[];
};

/**
 * The pupils a teacher may convoke the parents of: those of the classes the
 * admin assigned them, plus any class they teach in the timetable (assignments
 * are often left incomplete). Read with the service role since RLS hides
 * other families from a teacher.
 */
export async function getTeacherScope(profileId: string): Promise<TeacherScope | null> {
  const db = createAdminClient();
  if (!db) return null;

  const [{ data: teacher }, { data: profile }] = await Promise.all([
    db.from("teachers").select("id, first_name, last_name, subject, phone").eq("user_id", profileId).maybeSingle(),
    db.from("profiles").select("phone").eq("id", profileId).maybeSingle(),
  ]);
  if (!teacher) return null;

  const [{ data: assigned }, { data: taught }] = await Promise.all([
    db.from("teacher_classes").select("classes(id, name)").eq("teacher_id", teacher.id),
    db.from("timetable_entries").select("class_id, class_name").eq("teacher_id", teacher.id),
  ]);

  const classIds = new Set<string>();
  const classNames = new Set<string>();
  for (const row of assigned ?? []) {
    const klass = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    if (klass) {
      classIds.add(klass.id);
      classNames.add(klass.name);
    }
  }
  for (const row of taught ?? []) {
    if (row.class_id) classIds.add(row.class_id);
    if (row.class_name) classNames.add(row.class_name);
  }

  const base = {
    teacherName: `${teacher.first_name} ${teacher.last_name}`,
    subject: teacher.subject,
    defaultPhone: (teacher.phone || profile?.phone || "").replace(/\D/g, "").slice(-8),
  };
  if (classIds.size === 0 && classNames.size === 0) return { ...base, classes: [], students: [] };

  const [byId, byName] = await Promise.all([
    classIds.size > 0
      ? db.from("students").select("id, first_name, last_name, class_name, parent_id").in("class_id", Array.from(classIds))
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string | null; class_name: string; parent_id: string | null }[] }),
    db.from("students").select("id, first_name, last_name, class_name, parent_id").in("class_name", Array.from(classNames)),
  ]);
  const rows = new Map([...(byId.data ?? []), ...(byName.data ?? [])].map((s) => [s.id, s]));

  const parentIds = Array.from(new Set(Array.from(rows.values()).map((s) => s.parent_id).filter((id): id is string => Boolean(id))));
  const { data: parents } = parentIds.length
    ? await db.from("profiles").select("id, full_name, parent_first_name, parent_last_name, phone").in("id", parentIds)
    : { data: [] };
  const parentById = new Map((parents ?? []).map((p) => [p.id, p]));

  const students = Array.from(rows.values())
    .map((s) => {
      const parent = s.parent_id ? parentById.get(s.parent_id) : undefined;
      return {
        id: s.id,
        name: [s.first_name, s.last_name].filter(Boolean).join(" "),
        className: s.class_name,
        parentId: parent ? parent.id : null,
        parentName: parent
          ? parent.full_name ?? ([parent.parent_first_name, parent.parent_last_name].filter(Boolean).join(" ") || null)
          : null,
        parentHasPhone: (parent?.phone ?? "").replace(/\D/g, "").length >= 8,
      };
    })
    .sort((a, b) => a.className.localeCompare(b.className, "fr") || a.name.localeCompare(b.name, "fr"));

  return {
    ...base,
    classes: Array.from(new Set(students.map((s) => s.className).concat(Array.from(classNames)))).sort((a, b) =>
      a.localeCompare(b, "fr"),
    ),
    students,
  };
}
