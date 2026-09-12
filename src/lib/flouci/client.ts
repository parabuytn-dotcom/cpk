import "server-only";

// Flouci (flouci.com) — Tunisian payment gateway. API contract verified
// against docs.flouci.com (v2), not guessed: amounts are in millimes and sent
// as a STRING, auth is `Authorization: Bearer <public>:<private>`, and a
// payment only counts as paid when verify_payment returns success AND
// status === "SUCCESS" — a redirect back to the success page, or a webhook
// call, is never proof on its own.

const API_BASE = "https://developers.flouci.com/api/v2";

export function isFlouciConfigured() {
  return Boolean(process.env.FLOUCI_PUBLIC_KEY && process.env.FLOUCI_PRIVATE_KEY);
}

function authHeader() {
  return `Bearer ${process.env.FLOUCI_PUBLIC_KEY}:${process.env.FLOUCI_PRIVATE_KEY}`;
}

type InitPaymentParams = {
  amountMillimes: number;
  trackingId: string;
  webhookUrl: string;
  successUrl: string;
  failUrl: string;
};

type InitPaymentResult =
  | { success: true; payUrl: string; paymentId: string }
  | { success: false; error: string };

export async function initFlouciPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
  if (!isFlouciConfigured()) return { success: false, error: "Flouci n'est pas configuré." };

  try {
    const response = await fetch(`${API_BASE}/generate_payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        amount: String(params.amountMillimes),
        // Donors without a Flouci wallet can still pay by bank card.
        accept_card: true,
        session_timeout_secs: 1200,
        success_link: params.successUrl,
        fail_link: params.failUrl,
        webhook: params.webhookUrl,
        developer_tracking_id: params.trackingId,
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      return { success: false, error: `Flouci a répondu ${response.status} : ${body}` };
    }

    const data = JSON.parse(body) as {
      result?: { success?: boolean; link?: string; payment_id?: string; message?: string };
    };
    if (!data.result?.link || !data.result?.payment_id) {
      return { success: false, error: data.result?.message ?? "Réponse inattendue de Flouci." };
    }

    return { success: true, payUrl: data.result.link, paymentId: data.result.payment_id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur Flouci." };
  }
}

export type FlouciStatus =
  | "SUCCESS"
  | "PENDING"
  | "EXPIRED"
  | "FAILURE"
  | "PREAUTH_SUCCESS"
  | "SYSTEM_FAILURE";

export async function getFlouciPaymentStatus(
  paymentId: string,
): Promise<{ success: boolean; status: FlouciStatus; amount: number } | null> {
  if (!isFlouciConfigured()) return null;

  try {
    const response = await fetch(`${API_BASE}/verify_payment/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: authHeader() },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      success?: boolean;
      result?: { status?: FlouciStatus; amount?: number };
    };
    if (!data.result?.status) return null;

    return {
      success: data.success === true,
      status: data.result.status,
      amount: data.result.amount ?? 0,
    };
  } catch {
    return null;
  }
}
