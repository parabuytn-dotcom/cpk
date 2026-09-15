import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/smsService";
import { sendEmail } from "@/lib/emailService";
import { renderEmail, plainTextToHtml } from "@/lib/emailTemplate";
import { notifyMany } from "@/lib/notifications/engine";
import { getEmailQuota } from "@/lib/admin/data";

// "Urgent" broadcasts: one message sent at once by email, SMS and in-site
// notification, with SMS and notifications optionally repeated at a chosen
// interval. Each send (channel × round) is a row in urgent_deliveries; round 1
// runs right away, later rounds are picked up by the 5-minute database cron.

type Db = NonNullable<ReturnType<typeof createAdminClient>>;

export type UrgentAudience = "all" | "parents" | "teachers" | "students" | "class" | "person";
export type UrgentChannel = "email" | "sms" | "notification";
/** "urgent" from the admin page, "convocation" from a teacher's dashboard. */
export type UrgentKind = "urgent" | "convocation";

export type UrgentChannels = {
  email: { enabled: boolean; count: number; intervalMinutes: number };
  sms: { enabled: boolean; count: number; intervalMinutes: number };
  notification: { enabled: boolean; count: number; intervalMinutes: number; intrusive: boolean };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Same cap as the SMS page: the school's own SIM, not a bulk line, can get flagged. */
export const MAX_SMS_PER_ROUND = 150;
/** The cron ticks every 5 minutes; a little slack keeps rounds from slipping a whole tick. */
const DUE_SLACK_MS = 90 * 1000;

const ROLE_LABELS: Record<string, string> = {
  parent: "parent",
  student: "élève",
  teacher: "professeur",
  staff: "staff",
  director: "direction",
  admin: "admin",
};

export function displayName(p: { full_name: string | null; parent_first_name: string | null; parent_last_name: string | null }) {
  return p.full_name ?? ([p.parent_first_name, p.parent_last_name].filter(Boolean).join(" ") || "Sans nom");
}

export async function resolveAudience(db: Db, audience: UrgentAudience, classId?: string, personId?: string) {
  if (audience === "person") {
    if (!personId) return { ids: [], label: "Une personne" };
    const { data: person } = await db
      .from("profiles")
      .select("id, full_name, parent_first_name, parent_last_name, role")
      .eq("id", personId)
      .maybeSingle();
    if (!person) return { ids: [], label: "Une personne" };
    return { ids: [person.id], label: `${displayName(person)} (${ROLE_LABELS[person.role] ?? person.role})` };
  }

  if (audience === "class") {
    if (!classId) return { ids: [], label: "Classe" };
    const [{ data: klass }, { data: students }] = await Promise.all([
      db.from("classes").select("name").eq("id", classId).maybeSingle(),
      db.from("students").select("user_id, parent_id, class_id, class_name"),
    ]);
    const ids = new Set<string>();
    for (const s of students ?? []) {
      if (s.class_id !== classId && s.class_name !== klass?.name) continue;
      if (s.user_id) ids.add(s.user_id);
      if (s.parent_id) ids.add(s.parent_id);
    }
    return { ids: Array.from(ids), label: `Classe ${klass?.name ?? ""} (élèves + parents)`.trim() };
  }

  const roles: Record<Exclude<UrgentAudience, "class" | "all" | "person">, string> = {
    parents: "parent",
    teachers: "teacher",
    students: "student",
  };
  let query = db.from("profiles").select("id");
  if (audience !== "all") query = query.eq("role", roles[audience as keyof typeof roles]);
  const { data } = await query;
  const labels = { all: "Tout le monde", parents: "Parents", teachers: "Professeurs", students: "Élèves" };
  return { ids: (data ?? []).map((p) => p.id), label: labels[audience as keyof typeof labels] };
}

/** One phone per number and one address per inbox, however many accounts share them. */
export async function resolveContacts(db: Db, ids: string[]) {
  const phones = new Map<string, string>();
  const emails = new Set<string>();
  const PAGE = 500;

  // Auth addresses in a few paged calls rather than one lookup per person.
  const authEmails = new Map<string, string>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    for (const user of data.users) if (user.email) authEmails.set(user.id, user.email);
    if (data.users.length < 1000) break;
  }

  for (let i = 0; i < ids.length; i += PAGE) {
    const { data } = await db.from("profiles").select("id, phone, contact_email").in("id", ids.slice(i, i + PAGE));
    for (const person of data ?? []) {
      const digits = (person.phone ?? "").replace(/\D/g, "").slice(-8);
      if (digits.length === 8) phones.set(digits, digits);

      if (person.contact_email && EMAIL_RE.test(person.contact_email.trim())) {
        emails.add(person.contact_email.trim().toLowerCase());
        continue;
      }
      // Phone signups carry a synthetic @cpk.internal auth address that goes nowhere.
      const authEmail = authEmails.get(person.id) ?? "";
      if (authEmail && !authEmail.endsWith("@cpk.internal") && EMAIL_RE.test(authEmail)) {
        emails.add(authEmail.toLowerCase());
      }
    }
  }
  return { phones: Array.from(phones.values()), emails: Array.from(emails) };
}

function roundLabel(round: number, rounds: number) {
  return rounds > 1 && round > 1 ? ` (rappel ${round}/${rounds})` : "";
}

const KIND_WORDING = {
  urgent: { sms: "CPK Learn - URGENT", email: "URGENT", notification: "🚨" },
  // Short SMS prefix: every character counts towards fitting one SMS.
  convocation: { sms: "CPK Learn", email: "Convocation", notification: "📩" },
} as const;

/** The SMS exactly as sent, so its cost can be measured before sending. */
export function smsText(kind: UrgentKind, message: string, round: number, rounds: number) {
  return `${KIND_WORDING[kind].sms}${roundLabel(round, rounds)} : ${message}`;
}

async function inFives<T>(items: T[], worker: (item: T) => Promise<boolean>) {
  let ok = 0;
  for (let i = 0; i < items.length; i += 5) {
    const results = await Promise.all(items.slice(i, i + 5).map((item) => worker(item).catch(() => false)));
    ok += results.filter(Boolean).length;
  }
  return ok;
}

/** Runs one delivery. The status flip to "running" is the lock: the cron and the first send can't both take it. */
export async function runUrgentDelivery(deliveryId: string) {
  const db = createAdminClient();
  if (!db) return;

  const { data: delivery } = await db
    .from("urgent_deliveries")
    .update({ status: "running" })
    .eq("id", deliveryId)
    .eq("status", "pending")
    .select("id, channel, round, rounds, broadcast_id")
    .maybeSingle();
  if (!delivery) return;

  const { data: broadcast } = await db
    .from("urgent_broadcasts")
    .select("kind, subject, message, recipient_ids, channels, created_by, cancelled_at")
    .eq("id", delivery.broadcast_id)
    .maybeSingle();

  const finish = (fields: { sent?: number; failed?: number; skipped?: number; error?: string | null; status?: string }) =>
    db
      .from("urgent_deliveries")
      .update({ status: "done", done_at: new Date().toISOString(), ...fields })
      .eq("id", delivery.id);

  if (!broadcast || broadcast.cancelled_at) {
    await finish({ status: "cancelled" });
    return;
  }

  const channels = broadcast.channels as UrgentChannels;
  const kind = (broadcast.kind ?? "urgent") as UrgentKind;
  const wording = KIND_WORDING[kind];
  const suffix = roundLabel(delivery.round, delivery.rounds);

  try {
    if (delivery.channel === "notification") {
      await notifyMany(broadcast.recipient_ids, "urgent", `${broadcast.message}${suffix}`, undefined, {
        // Only the first round blocks the screen; the reminders go to the bell and the phone.
        intrusive: delivery.round === 1 && channels.notification.intrusive,
        title: `${wording.notification} ${broadcast.subject}`,
        sentBy: broadcast.created_by ?? undefined,
      });
      await finish({ sent: broadcast.recipient_ids.length });
      return;
    }

    const { phones, emails } = await resolveContacts(db, broadcast.recipient_ids);

    if (delivery.channel === "sms") {
      const targets = phones.slice(0, MAX_SMS_PER_ROUND);
      const text = smsText(kind, broadcast.message, delivery.round, delivery.rounds);
      let lastError: string | null = null;
      const sent = await inFives(targets, async (phone) => {
        const result = await sendSms(phone, text, "manual");
        if (!result.success) lastError = result.error;
        return result.success;
      });
      await finish({
        sent,
        failed: targets.length - sent,
        skipped: phones.length - targets.length,
        error: lastError,
      });
      return;
    }

    // email
    const quota = await getEmailQuota();
    const targets = emails.slice(0, quota.remaining);
    const html = renderEmail({ title: `${wording.email} : ${broadcast.subject}`, bodyHtml: plainTextToHtml(broadcast.message) });
    let lastError: string | null = null;
    const sent = await inFives(targets, async (to) => {
      const result = await sendEmail(to, `${wording.email}${suffix} : ${broadcast.subject}`, html, {
        sentBy: broadcast.created_by,
        logBody: broadcast.message,
      });
      if (!result.success) lastError = result.error;
      return result.success;
    });
    await finish({
      sent,
      failed: targets.length - sent,
      skipped: emails.length - targets.length,
      error: emails.length > targets.length ? "Quota email du jour atteint pour une partie des destinataires." : lastError,
    });
  } catch (error) {
    await finish({ error: error instanceof Error ? error.message : "Erreur inconnue." });
  }
}

/** Every delivery whose time has come; called by the 5-minute cron. */
export async function runDueUrgentDeliveries() {
  const db = createAdminClient();
  if (!db) return 0;
  const { data } = await db
    .from("urgent_deliveries")
    .select("id")
    .eq("status", "pending")
    .lte("run_at", new Date(Date.now() + DUE_SLACK_MS).toISOString())
    .order("run_at");
  for (const row of data ?? []) await runUrgentDelivery(row.id);
  return data?.length ?? 0;
}
