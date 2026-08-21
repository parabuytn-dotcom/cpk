import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export type PendingProfile = {
  id: string;
  cin: string | null;
  parentFirstName: string | null;
  parentLastName: string | null;
  registrationMethod: string | null;
  createdAt: string;
};

export async function listPendingProfiles(): Promise<PendingProfile[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, cin, parent_first_name, parent_last_name, registration_method, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    cin: row.cin,
    parentFirstName: row.parent_first_name,
    parentLastName: row.parent_last_name,
    registrationMethod: row.registration_method,
    createdAt: row.created_at,
  }));
}

export type ClassRow = { id: string; name: string };

export async function listClasses(): Promise<ClassRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name").order("name");
  return data ?? [];
}

export type TeacherRow = { id: string; firstName: string; lastName: string; subject: string | null };

export async function listTeachers(): Promise<TeacherRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("id, first_name, last_name, subject")
    .order("last_name");

  return (data ?? []).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    subject: row.subject,
  }));
}

export type TimetableEntryRow = {
  id: string;
  className: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherName: string | null;
  isCancelled: boolean;
};

export async function listTimetableEntries(classId: string): Promise<TimetableEntryRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("timetable_entries")
    .select(
      "id, class_name, day_of_week, start_time, end_time, subject, is_cancelled, teachers(first_name, last_name)",
    )
    .eq("class_id", classId)
    .order("day_of_week")
    .order("start_time");

  return (data ?? []).map((row) => {
    const teacher = Array.isArray(row.teachers) ? row.teachers[0] : row.teachers;
    return {
      id: row.id,
      className: row.class_name,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      subject: row.subject,
      teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
      isCancelled: row.is_cancelled,
    };
  });
}

export type TeacherAbsenceRow = {
  id: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

export async function listTeacherAbsences(): Promise<TeacherAbsenceRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("teacher_absences")
    .select("id, starts_at, ends_at, reason, teachers(first_name, last_name)")
    .order("starts_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => {
    const teacher = Array.isArray(row.teachers) ? row.teachers[0] : row.teachers;
    return {
      id: row.id,
      teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : "?",
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      reason: row.reason,
    };
  });
}

export type ChildRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  className: string;
  hasAccount: boolean;
};

export async function listChildrenForParent(parentId: string): Promise<ChildRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, first_name, last_name, class_name, user_id")
    .eq("parent_id", parentId)
    .order("first_name");

  return (data ?? []).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    className: row.class_name,
    hasAccount: row.user_id !== null,
  }));
}
