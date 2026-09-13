// Proof that the current admin session has passed the SMS verification.
// Framework-free on purpose: it runs both in proxy.ts and in server code, so it
// uses Web Crypto rather than Node's crypto module.
//
// The cookie is bound to the Supabase session id, not just the user: logging
// out and back in (a new session) asks for a new code, and a copied cookie is
// worthless without that exact session. It is signed with a server-only secret
// so it can't be forged.

export const ADMIN_PROOF_COOKIE = "cpk_admin_verified";
export const ADMIN_PROOF_TTL_SECONDS = 12 * 60 * 60;
export const DEFAULT_ADMIN_VERIFICATION_PHONE = "52254129";

/** Default ON: only an explicit "false" written from Admin > Réglages turns it off. */
export function isAdminVerificationEnabled(settingValue: string | null) {
  return settingValue !== "false";
}

function secret() {
  return process.env.ADMIN_VERIFICATION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

const encoder = new TextEncoder();

async function sign(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
  return btoa(String.fromCharCode(...signature)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAdminProof(userId: string, sessionId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_PROOF_TTL_SECONDS;
  const payload = `${userId}.${sessionId}.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

export async function isValidAdminProof(value: string | undefined, userId: string, sessionId: string) {
  // No secret configured: refuse rather than accept signatures made with an empty key.
  if (!value || !secret()) return false;

  const parts = value.split(".");
  if (parts.length !== 4) return false;
  const [proofUser, proofSession, expiresAt, signature] = parts;

  if (proofUser !== userId || proofSession !== sessionId) return false;
  if (!(Number(expiresAt) > Math.floor(Date.now() / 1000))) return false;

  return constantTimeEqual(signature, await sign(`${proofUser}.${proofSession}.${expiresAt}`));
}
