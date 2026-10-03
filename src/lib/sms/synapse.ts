import "server-only";

// Synapse SMS (https://synapse-sms.chkobba-tn.workers.dev/docs) — the owner's
// SMS service, shared by all his sites. It holds the gateway credentials, the
// single sent/received history, the verification codes and their statistics.
//
// Each site has its own key: SYNAPSE_SMS_KEY for CPK, SYNAPSE_SMS_KEY_LPK for
// the texts LPK hands to /api/bridge (so they show up under LPK's name in the
// dashboard). Without a key, smsService falls back to the gateway directly.
// Everything that goes out can be paused from Synapse's dashboard in one click.

const DEFAULT_URL = "https://synapse-sms.chkobba-tn.workers.dev";
const TIMEOUT_MS = 20_000;

export type SynapseSite = "cpk" | "lpk";

export function synapseKey(site: SynapseSite = "cpk") {
  return (site === "lpk" ? process.env.SYNAPSE_SMS_KEY_LPK : process.env.SYNAPSE_SMS_KEY) || null;
}

export function isSynapseConfigured(site: SynapseSite = "cpk") {
  return synapseKey(site) !== null;
}

type ApiError = { error: { code: string; message: string } };

async function call<T>(key: string, path: string, body?: unknown): Promise<{ status: number; data: T | ApiError | null }> {
  const base = (process.env.SYNAPSE_SMS_URL || DEFAULT_URL).replace(/\/$/, "");
  try {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return { status: response.status, data: (await response.json().catch(() => null)) as T | ApiError | null };
  } catch (error) {
    return {
      status: 0,
      data: { error: { code: "unreachable", message: error instanceof Error ? error.message : "Synapse SMS injoignable." } },
    };
  }
}

function errorOf(data: unknown, fallback: string) {
  const e = (data as ApiError | null)?.error;
  return { code: e?.code ?? "error", message: e?.message ?? fallback };
}

/** The "motif" shown in Synapse's dashboard for each kind of text. */
const CATEGORY: Record<string, string> = {
  teacher_absence: "absence",
  makeup_session: "rattrapage",
  generated_password: "mot-de-passe",
  manual: "manuel",
  announcement: "annonce",
  low_balance_alert: "alerte-solde",
  phone_verification: "code",
};

type SynapseMessage = { id: string; status: string; error: string | null; paused?: boolean };

export async function synapseSend(
  site: SynapseSite,
  phone: string,
  text: string,
  trigger: string,
): Promise<{ success: true; id: string } | { success: false; error: string; paused?: boolean }> {
  const key = synapseKey(site);
  if (!key) return { success: false, error: "Synapse SMS n'est pas configuré." };

  const { status, data } = await call<SynapseMessage>(key, "/v1/messages", {
    to: phone,
    category: CATEGORY[trigger] ?? trigger,
    text,
    metadata: { trigger },
  });
  const message = data && "id" in data ? data : null;
  if (message && (message.status === "pending" || message.status === "sent" || message.status === "delivered")) {
    return { success: true, id: message.id };
  }
  if (message) return { success: false, error: message.error ?? `Refusé par Synapse SMS (${message.status}).`, paused: message.paused };
  return { success: false, error: errorOf(data, `Synapse SMS a répondu ${status}.`).message };
}

type SynapseVerification = { id: string; status: string; attempts: number; attempts_left: number; valid?: boolean };

/** Synapse writes the code, texts it and keeps it: this site never sees it. */
export async function synapseStartVerification(
  site: SynapseSite,
  phone: string,
  appName: string,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const key = synapseKey(site);
  if (!key) return { success: false, error: "Synapse SMS n'est pas configuré." };

  const { status, data } = await call<SynapseVerification>(key, "/v1/verifications", { to: phone, app_name: appName });
  if (data && "id" in data) return { success: true, id: data.id };
  return { success: false, error: errorOf(data, `Synapse SMS a répondu ${status}.`).message };
}

export type SynapseCheck =
  | { ok: true; valid: boolean; status: string; attemptsLeft: number }
  | { ok: false; error: string };

export async function synapseCheckVerification(site: SynapseSite, id: string, code: string): Promise<SynapseCheck> {
  const key = synapseKey(site);
  if (!key) return { ok: false, error: "Synapse SMS n'est pas configuré." };

  const { status, data } = await call<SynapseVerification>(key, `/v1/verifications/${encodeURIComponent(id)}/check`, { code });
  if (data && "id" in data) {
    return { ok: true, valid: data.valid === true, status: data.status, attemptsLeft: data.attempts_left };
  }
  return { ok: false, error: errorOf(data, `Synapse SMS a répondu ${status}.`).message };
}
