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

export type TeacherRow = {
  id: string;
  firstName: string;
  lastName: string;
  subject: string | null;
  phone: string | null;
  hasAccount: boolean;
};

export async function listTeachers(): Promise<TeacherRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("id, first_name, last_name, subject, phone, user_id")
    .order("last_name");

  return (data ?? []).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    subject: row.subject,
    phone: row.phone,
    hasAccount: row.user_id !== null,
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

export type UserRow = {
  id: string;
  fullName: string | null;
  role: string;
  status: string;
  phone: string | null;
  tags: string[];
  cin: string | null;
  className: string | null;
};

export async function listAllProfiles(): Promise<UserRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, parent_first_name, parent_last_name, role, status, phone, tags, cin")
    .order("created_at", { ascending: false });

  if (!profiles || profiles.length === 0) return [];

  const { data: students } = await supabase
    .from("students")
    .select("user_id, class_name")
    .in(
      "user_id",
      profiles.map((p) => p.id),
    );

  const classByUserId = new Map((students ?? []).map((s) => [s.user_id, s.class_name]));

  return profiles.map((p) => ({
    id: p.id,
    fullName:
      p.full_name ??
      (p.parent_first_name ? `${p.parent_first_name} ${p.parent_last_name ?? ""}`.trim() : null),
    role: p.role,
    status: p.status,
    phone: p.phone,
    tags: p.tags ?? [],
    cin: p.cin,
    className: classByUserId.get(p.id) ?? null,
  }));
}

export type StaffMemberRow = {
  id: string;
  fullName: string;
  roleTitle: string;
  photoUrl: string | null;
  showPhoto: boolean;
};

export async function listStaffMembers(): Promise<StaffMemberRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_members")
    .select("id, full_name, role_title, photo_url, show_photo")
    .order("display_order");

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    roleTitle: row.role_title,
    photoUrl: row.photo_url,
    showPhoto: row.show_photo,
  }));
}

export type HelpRequestRow = {
  id: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
};

export async function listHelpRequests(): Promise<HelpRequestRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("help_requests")
    .select("id, subject, description, status, created_at")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    subject: row.subject,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export type ReleaseRow = { id: string; title: string; body: string; publishedAt: string };

export async function listReleases(): Promise<ReleaseRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("releases")
    .select("id, title, body, published_at")
    .order("published_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    publishedAt: row.published_at,
  }));
}

export type HomeworkRow = {
  id: string;
  className: string;
  subject: string;
  description: string;
  dueDate: string;
  priority: string;
};

export async function listHomeworkForTeacher(teacherProfileId: string): Promise<HomeworkRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("homework")
    .select("id, class_name, subject, description, due_date, priority")
    .eq("created_by", teacherProfileId)
    .order("due_date", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    className: row.class_name,
    subject: row.subject,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority,
  }));
}

export async function listHomeworkForClass(
  className: string,
  studentId?: string,
): Promise<(HomeworkRow & { completed: boolean })[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: homework } = await supabase
    .from("homework")
    .select("id, class_name, subject, description, due_date, priority")
    .eq("class_name", className)
    .order("due_date", { ascending: true });

  if (!homework || homework.length === 0) return [];

  let completedIds = new Set<string>();
  if (studentId) {
    const { data: completions } = await supabase
      .from("homework_completions")
      .select("homework_id")
      .eq("student_id", studentId)
      .in(
        "homework_id",
        homework.map((h) => h.id),
      );
    completedIds = new Set((completions ?? []).map((c) => c.homework_id));
  }

  return homework.map((row) => ({
    id: row.id,
    className: row.class_name,
    subject: row.subject,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority,
    completed: completedIds.has(row.id),
  }));
}

export async function getStudentClassName(studentProfileId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("class_name")
    .eq("user_id", studentProfileId)
    .maybeSingle();

  return data?.class_name ?? null;
}

export async function getTeacherRowForUser(teacherProfileId: string): Promise<TeacherRow | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("id, first_name, last_name, subject, phone, user_id")
    .eq("user_id", teacherProfileId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    subject: data.subject,
    phone: data.phone,
    hasAccount: true,
  };
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
