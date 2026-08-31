import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getPublicProfiles } from "@/lib/social/data";

export type PendingProfile = {
  id: string;
  cin: string | null;
  parentFirstName: string | null;
  parentLastName: string | null;
  registrationMethod: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export async function listPendingProfiles(): Promise<PendingProfile[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, cin, parent_first_name, parent_last_name, registration_method, avatar_url, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    cin: row.cin,
    parentFirstName: row.parent_first_name,
    parentLastName: row.parent_last_name,
    registrationMethod: row.registration_method,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  }));
}

export type ProfileDetail = {
  id: string;
  fullName: string | null;
  role: string;
  status: string;
  phone: string | null;
  cin: string | null;
  tags: string[];
  avatarUrl: string | null;
  registrationMethod: string | null;
  createdAt: string;
  email: string | null;
  children: { id: string; firstName: string; lastName: string | null; className: string; hasAccount: boolean }[];
  badges: { label: string; emoji: string }[];
};

export async function getProfileDetail(profileId: string): Promise<ProfileDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, parent_first_name, parent_last_name, role, status, phone, cin, tags, avatar_url, registration_method, created_at",
    )
    .eq("id", profileId)
    .single();

  if (!profile) return null;

  const [{ data: children }, { data: badgeRows }] = await Promise.all([
    profile.role === "parent"
      ? supabase
          .from("students")
          .select("id, first_name, last_name, class_name, user_id")
          .eq("parent_id", profileId)
      : Promise.resolve({ data: [] }),
    supabase.from("user_badges").select("badges(label, emoji)").eq("user_id", profileId),
  ]);

  let email: string | null = null;
  const adminClient = createAdminClient();
  if (adminClient) {
    const { data: userData } = await adminClient.auth.admin.getUserById(profileId);
    email = userData.user?.email ?? null;
  }

  return {
    id: profile.id,
    fullName:
      profile.full_name ??
      (profile.parent_first_name
        ? `${profile.parent_first_name} ${profile.parent_last_name ?? ""}`.trim()
        : null),
    role: profile.role,
    status: profile.status,
    phone: profile.phone,
    cin: profile.cin,
    tags: profile.tags ?? [],
    avatarUrl: profile.avatar_url,
    registrationMethod: profile.registration_method,
    createdAt: profile.created_at,
    email,
    children: (children ?? []).map((c) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      className: c.class_name,
      hasAccount: c.user_id !== null,
    })),
    badges: (badgeRows ?? [])
      .map((b) => (Array.isArray(b.badges) ? b.badges[0] : b.badges))
      .filter((b): b is { label: string; emoji: string } => Boolean(b)),
  };
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
  classIds: string[];
  classNames: string[];
};

export async function listTeachers(): Promise<TeacherRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const [{ data }, { data: assignments }] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, first_name, last_name, subject, phone, user_id")
      .order("last_name"),
    supabase.from("teacher_classes").select("teacher_id, classes(id, name)"),
  ]);

  const classesByTeacher = new Map<string, ClassRow[]>();
  for (const row of assignments ?? []) {
    const cls = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    if (!cls) continue;
    classesByTeacher.set(row.teacher_id, [...(classesByTeacher.get(row.teacher_id) ?? []), cls]);
  }

  return (data ?? []).map((row) => {
    const assigned = classesByTeacher.get(row.id) ?? [];
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      subject: row.subject,
      phone: row.phone,
      hasAccount: row.user_id !== null,
      classIds: assigned.map((c) => c.id),
      classNames: assigned.map((c) => c.name),
    };
  });
}

export async function listClassesForTeacher(profileId: string): Promise<ClassRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!teacher) return [];

  const { data } = await supabase
    .from("teacher_classes")
    .select("classes(id, name)")
    .eq("teacher_id", teacher.id);

  return (data ?? [])
    .map((row) => (Array.isArray(row.classes) ? row.classes[0] : row.classes))
    .filter((c): c is ClassRow => Boolean(c));
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
  badgeIds: string[];
  avatarUrl: string | null;
};

export async function listAllProfiles(): Promise<UserRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, full_name, parent_first_name, parent_last_name, role, status, phone, tags, cin, avatar_url",
    )
    .order("created_at", { ascending: false });

  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map((p) => p.id);

  const [{ data: students }, { data: badges }] = await Promise.all([
    supabase.from("students").select("user_id, class_name").in("user_id", profileIds),
    supabase.from("user_badges").select("user_id, badge_id").in("user_id", profileIds),
  ]);

  const classByUserId = new Map((students ?? []).map((s) => [s.user_id, s.class_name]));
  const badgesByUserId = new Map<string, string[]>();
  for (const b of badges ?? []) {
    badgesByUserId.set(b.user_id, [...(badgesByUserId.get(b.user_id) ?? []), b.badge_id]);
  }

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
    badgeIds: badgesByUserId.get(p.id) ?? [],
    className: classByUserId.get(p.id) ?? null,
    avatarUrl: p.avatar_url,
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

export type PendingSuggestionRow = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export async function listPendingSuggestions(): Promise<PendingSuggestionRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("suggestions")
    .select("id, content, author_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return [];

  const authorIds = data.map((row) => row.author_id).filter((id): id is string => Boolean(id));
  const profiles = await getPublicProfiles(supabase, authorIds);

  return data.map((row) => ({
    id: row.id,
    content: row.content,
    authorName: row.author_id ? (profiles.get(row.author_id)?.displayName ?? "Anonyme") : "Anonyme",
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
  classId: string | null,
  className: string,
  studentId?: string,
): Promise<(HomeworkRow & { completed: boolean })[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  // Matched by class_id when we have one (robust to a class being renamed
  // later), falling back to the denormalized class_name text for older rows
  // created before students/homework carried a class_id.
  let query = supabase
    .from("homework")
    .select("id, class_name, subject, description, due_date, priority")
    .order("due_date", { ascending: true });
  query = classId
    ? query.or(`class_id.eq.${classId},class_name.eq.${className}`)
    : query.eq("class_name", className);
  const { data: homework } = await query;

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

export type ExamRow = {
  id: string;
  subject: string;
  type: "controle" | "synthese";
  examDate: string;
  description: string | null;
  teacherNotes: string | null;
};

export async function listExamsForClass(classId: string): Promise<ExamRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("exams")
    .select("id, subject, type, exam_date, description, teacher_notes")
    .eq("class_id", classId)
    .order("exam_date", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    subject: row.subject,
    type: row.type,
    examDate: row.exam_date,
    description: row.description,
    teacherNotes: row.teacher_notes,
  }));
}

export async function getStudentClassInfo(
  studentProfileId: string,
): Promise<{ classId: string | null; className: string } | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("class_id, class_name")
    .eq("user_id", studentProfileId)
    .maybeSingle();

  if (!data) return null;
  return { classId: data.class_id, className: data.class_name };
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
  const classes = await listClassesForTeacher(teacherProfileId);
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    subject: data.subject,
    phone: data.phone,
    hasAccount: true,
    classIds: classes.map((c) => c.id),
    classNames: classes.map((c) => c.name),
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

export type DashboardStats = {
  totalUsers: number;
  onlineUsers: number;
  offlineUsers: number;
  pendingAccounts: number;
  pendingHelp: number;
  pendingSuggestions: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) {
    return {
      totalUsers: 0,
      onlineUsers: 0,
      offlineUsers: 0,
      pendingAccounts: 0,
      pendingHelp: 0,
      pendingSuggestions: 0,
    };
  }

  const supabase = await createClient();
  const onlineSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const [totalUsers, onlineUsers, pendingAccounts, pendingHelp, pendingSuggestions] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_seen_at", onlineSince),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("help_requests")
        .select("id", { count: "exact", head: true })
        .neq("status", "closed"),
      supabase
        .from("suggestions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  const total = totalUsers.count ?? 0;
  const online = onlineUsers.count ?? 0;

  return {
    totalUsers: total,
    onlineUsers: online,
    offlineUsers: Math.max(total - online, 0),
    pendingAccounts: pendingAccounts.count ?? 0,
    pendingHelp: pendingHelp.count ?? 0,
    pendingSuggestions: pendingSuggestions.count ?? 0,
  };
}

export async function getSiteSetting(key: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();

  return data?.value ?? null;
}

export type DonationRow = {
  id: string;
  donorName: string;
  amount: number; // millimes
  status: string;
  createdAt: string;
};

export async function listDonations(): Promise<DonationRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("donations")
    .select("id, donor_id, amount, status, created_at")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const donorIds = data.map((row) => row.donor_id).filter((id): id is string => Boolean(id));
  const profiles = await getPublicProfiles(supabase, donorIds);

  return data.map((row) => ({
    id: row.id,
    donorName: row.donor_id ? (profiles.get(row.donor_id)?.displayName ?? "Anonyme") : "Anonyme",
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export type MakeupSessionRow = {
  id: string;
  subject: string;
  teacherName: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  reason: string | null;
};

// Only upcoming sessions — a "rattrapage" from last month isn't useful to
// show on the timetable anymore.
export async function listMakeupSessionsForClass(classId: string): Promise<MakeupSessionRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("makeup_sessions")
    .select("id, subject, session_date, start_time, end_time, reason, teachers(first_name, last_name)")
    .eq("class_id", classId)
    .gte("session_date", today)
    .order("session_date", { ascending: true });

  return (data ?? []).map((row) => {
    const teacher = Array.isArray(row.teachers) ? row.teachers[0] : row.teachers;
    return {
      id: row.id,
      subject: row.subject,
      teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
      sessionDate: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      reason: row.reason,
    };
  });
}
