import "server-only";
import { isoWeekdayOf, schoolCalendarDay, slotInstant } from "@/lib/schoolTime";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getPublicProfiles } from "@/lib/social/data";
import { getSmsPlanState } from "@/lib/sms/balance";

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
  contactEmail: string | null;
  children: { id: string; firstName: string; lastName: string | null; className: string; hasAccount: boolean }[];
  badges: { label: string; emoji: string }[];
};

export async function getProfileDetail(profileId: string): Promise<ProfileDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, parent_first_name, parent_last_name, role, status, phone, cin, contact_email, tags, avatar_url, registration_method, created_at",
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
    contactEmail: profile.contact_email,
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

/**
 * The school week the timetable shows, as calendar days in Tunis: Monday of
 * the current week — or of next week on Sunday, when this week's lessons are
 * all over and families are looking ahead to Monday.
 */
function displayedWeek(now = new Date()) {
  const today = schoolCalendarDay(now);
  const isoDay = isoWeekdayOf(today);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - (isoDay - 1) + (isoDay === 7 ? 7 : 0));
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return {
    monday,
    weekStart: slotInstant(monday, "00:00"),
    weekEnd: slotInstant(nextMonday, "00:00"),
  };
}

function slotDateTime(monday: Date, dayOfWeek: number, hhmm: string) {
  const day = new Date(monday);
  day.setUTCDate(monday.getUTCDate() + (dayOfWeek - 1));
  return slotInstant(day, hhmm);
}

export async function listTimetableEntries(classId: string): Promise<TimetableEntryRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("timetable_entries")
    .select(
      "id, class_name, day_of_week, start_time, end_time, subject, teacher_id, teachers(first_name, last_name)",
    )
    .eq("class_id", classId)
    .order("day_of_week")
    .order("start_time");

  const entries = data ?? [];

  // "Cancelled" is DERIVED, never stored on the recurring slot. Writing
  // is_cancelled = true on a timetable_entries row used to strike that course
  // out every week forever, because these rows are the weekly pattern, not
  // individual dated lessons — a one-off absence looked permanent. Instead we
  // check, per render, whether an absence actually covers THIS week's
  // occurrence of the slot, so it un-cancels itself once the absence is over.
  const teacherIds = Array.from(
    new Set(entries.map((e) => e.teacher_id).filter((id): id is string => Boolean(id))),
  );

  const { monday, weekStart, weekEnd } = displayedWeek();
  let absences: { teacher_id: string; starts_at: string; ends_at: string }[] = [];
  if (teacherIds.length > 0) {
    const { data: rows } = await supabase
      .from("teacher_absences")
      .select("teacher_id, starts_at, ends_at")
      .in("teacher_id", teacherIds)
      .lt("starts_at", weekEnd.toISOString())
      .gt("ends_at", weekStart.toISOString());
    absences = rows ?? [];
  }

  return entries.map((row) => {
    const teacher = Array.isArray(row.teachers) ? row.teachers[0] : row.teachers;
    const slotStart = slotDateTime(monday, row.day_of_week, row.start_time);
    const slotEnd = slotDateTime(monday, row.day_of_week, row.end_time);
    const isCancelled = absences.some(
      (a) =>
        a.teacher_id === row.teacher_id &&
        new Date(a.starts_at) < slotEnd &&
        new Date(a.ends_at) > slotStart,
    );

    return {
      id: row.id,
      className: row.class_name,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      subject: row.subject,
      teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
      isCancelled,
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
  contactEmail: string | null;
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
      "id, full_name, parent_first_name, parent_last_name, role, status, phone, contact_email, tags, cin, avatar_url",
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
    contactEmail: p.contact_email,
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

export type UserReportRow = {
  id: string;
  reportedId: string;
  reportedName: string;
  reportedAvatarUrl: string | null;
  reporterName: string;
  reason: string;
  context: string | null;
  status: string;
  createdAt: string;
};

export async function listUserReports(): Promise<UserReportRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_reports")
    .select("id, reported_id, reporter_id, reason, context, status, created_at")
    .order("status")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = Array.from(
    new Set(
      rows.flatMap((r) => [r.reported_id, r.reporter_id]).filter((id): id is string => Boolean(id)),
    ),
  );
  const profiles = await getPublicProfiles(supabase, ids);

  return rows.map((r) => ({
    id: r.id,
    reportedId: r.reported_id,
    reportedName: profiles.get(r.reported_id)?.displayName ?? "?",
    reportedAvatarUrl: profiles.get(r.reported_id)?.avatarUrl ?? null,
    reporterName: r.reporter_id ? (profiles.get(r.reporter_id)?.displayName ?? "?") : "compte supprimé",
    reason: r.reason,
    context: r.context,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export type SentEmailRow = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  createdAt: string;
};

export async function listSentEmails(): Promise<SentEmailRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("email_logs")
    .select("id, recipient, subject, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    recipient: row.recipient,
    subject: row.subject,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export type SentSmsRow = {
  id: string;
  phone: string;
  message: string;
  trigger: string;
  status: string;
  error: string | null;
  createdAt: string;
};

// Every SMS the platform ever sends goes through sms_logs — absence alerts,
// generated passwords, phone-verification codes, and admin-composed ones —
// so this is the full history, not just what the admin manually sent.
export async function listSentSms(): Promise<SentSmsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("sms_logs")
    .select("id, phone, message, trigger, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    phone: row.phone,
    message: row.message,
    trigger: row.trigger,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Quotas — SMS plan balance and Brevo's daily email allowance
// ---------------------------------------------------------------------------

export const DEFAULT_EMAIL_DAILY_LIMIT = 300;

export type QuotaStatus = {
  /** What the bar is measured against: the balance at the last top-up, or the daily limit. */
  total: number;
  used: number;
  remaining: number;
};

/**
 * The SMS balance is a snapshot plus what went out after it: site_settings
 * holds the balance entered at the last top-up and when, and every SMS sent
 * since (from any trigger — sms_logs records them all) is subtracted, counted
 * the way the carrier bills them. Null until a balance has been entered once.
 */
export async function getSmsBalance(): Promise<QuotaStatus | null> {
  if (!isSupabaseConfigured()) return null;
  const plan = await getSmsPlanState();
  return plan ? { total: plan.total, used: plan.used, remaining: plan.remaining } : null;
}

/**
 * Brevo's allowance refills every day, so only today's successful sends count.
 * "Today" starts at midnight UTC — when Brevo resets it — which is 1 a.m. in
 * Tunisia, not local midnight.
 */
export async function getEmailQuota(): Promise<QuotaStatus> {
  const limitRaw = isSupabaseConfigured() ? await getSiteSetting("email_daily_limit") : null;
  const parsed = Number(limitRaw);
  const total = limitRaw !== null && Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EMAIL_DAILY_LIMIT;

  if (!isSupabaseConfigured()) return { total, used: 0, remaining: total };

  const now = new Date();
  const startOfUtcDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const supabase = await createClient();
  const { count } = await supabase
    .from("email_logs")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("created_at", startOfUtcDay.toISOString());

  const used = count ?? 0;
  return { total, used, remaining: Math.max(total - used, 0) };
}

// ---------------------------------------------------------------------------
// Boîte de réception — SMS et emails reçus + demandes d'aide, en un seul flux
// ---------------------------------------------------------------------------

export type InboxKind = "sms" | "email" | "help";

export type InboxItem = {
  kind: InboxKind;
  id: string;
  /** Phone number, email address, or — for help requests — the author's name. */
  from: string;
  fromName: string | null;
  profileId: string | null;
  subject: string | null;
  body: string;
  receivedAt: string;
  unread: boolean;
  /** Help requests only. */
  status: string | null;
  reply: string | null;
  repliedAt: string | null;
};

export async function listInbox(kind?: InboxKind): Promise<InboxItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const wantMessages = kind !== "help";
  const wantHelp = !kind || kind === "help";

  const [{ data: messages }, { data: help }] = await Promise.all([
    wantMessages
      ? (() => {
          let query = supabase
            .from("inbox_messages")
            .select("id, channel, sender, sender_name, subject, body, profile_id, received_at, read_at, reply_body, replied_at")
            .order("received_at", { ascending: false })
            .limit(200);
          if (kind === "sms" || kind === "email") query = query.eq("channel", kind);
          return query;
        })()
      : Promise.resolve({ data: [] as never[] }),
    wantHelp
      ? supabase
          .from("help_requests")
          .select("id, author_id, subject, description, status, created_at, admin_reply, replied_at")
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const authorIds = [
    ...(help ?? []).map((h) => h.author_id),
    ...(messages ?? []).map((m) => m.profile_id),
  ].filter((id): id is string => Boolean(id));
  const profiles = await getPublicProfiles(supabase, authorIds);

  const items: InboxItem[] = [
    ...(messages ?? []).map((m) => ({
      kind: m.channel as "sms" | "email",
      id: m.id,
      from: m.sender,
      fromName: m.sender_name ?? (m.profile_id ? (profiles.get(m.profile_id)?.displayName ?? null) : null),
      profileId: m.profile_id,
      subject: m.subject,
      body: m.body,
      receivedAt: m.received_at,
      unread: m.read_at === null,
      status: null,
      reply: m.reply_body,
      repliedAt: m.replied_at,
    })),
    ...(help ?? []).map((h) => ({
      kind: "help" as const,
      id: h.id,
      from: h.author_id ? (profiles.get(h.author_id)?.displayName ?? "?") : "Compte supprimé",
      fromName: null,
      profileId: h.author_id,
      subject: h.subject,
      body: h.description,
      receivedAt: h.created_at,
      // A help request is "unread" until someone has picked it up.
      unread: h.status === "open",
      status: h.status,
      reply: h.admin_reply,
      repliedAt: h.replied_at,
    })),
  ];

  return items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export async function countUnreadInbox(): Promise<{ sms: number; email: number; help: number; total: number }> {
  const empty = { sms: 0, email: 0, help: 0, total: 0 };
  if (!isSupabaseConfigured()) return empty;
  const supabase = await createClient();

  const [sms, email, help] = await Promise.all([
    supabase.from("inbox_messages").select("id", { count: "exact", head: true }).eq("channel", "sms").is("read_at", null),
    supabase.from("inbox_messages").select("id", { count: "exact", head: true }).eq("channel", "email").is("read_at", null),
    supabase.from("help_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const counts = { sms: sms.count ?? 0, email: email.count ?? 0, help: help.count ?? 0 };
  return { ...counts, total: counts.sms + counts.email + counts.help };
}

// ---------------------------------------------------------------------------
// Devoirs — vue de l'administration, toutes classes confondues
// ---------------------------------------------------------------------------

export type SchoolHomeworkRow = HomeworkRow & { kind: "homework" };
export type SchoolExamRow = ExamRow & { kind: "exam"; className: string };

/** From a week back, so something just past its date can still be corrected or removed. */
function sinceLastWeek() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

export async function listSchoolHomework(): Promise<SchoolHomeworkRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("homework")
    .select("id, class_name, subject, description, due_date, priority")
    .gte("due_date", sinceLastWeek())
    .order("due_date", { ascending: true })
    .limit(200);

  return (data ?? []).map((row) => ({
    kind: "homework" as const,
    id: row.id,
    className: row.class_name,
    subject: row.subject,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority,
  }));
}

export async function listSchoolExams(): Promise<SchoolExamRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("exams")
    .select("id, class_name, subject, type, exam_date, description, teacher_notes")
    .gte("exam_date", sinceLastWeek())
    .order("exam_date", { ascending: true })
    .limit(200);

  return (data ?? []).map((row) => ({
    kind: "exam" as const,
    id: row.id,
    className: row.class_name,
    subject: row.subject,
    type: row.type,
    examDate: row.exam_date,
    description: row.description,
    teacherNotes: row.teacher_notes,
  }));
}
