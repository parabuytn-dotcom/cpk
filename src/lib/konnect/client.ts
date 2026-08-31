import "server-only";

// Konnect (konnect.network) — Tunisian payment gateway. API contract verified
// against their official docs (docs.konnect.network) and PHP SDK, not
// guessed: amounts are in millimes (1 TND = 1000), auth is an `x-api-key`
// header, and the webhook only ever carries a `payment_ref` to look up — the
// actual status must always be re-confirmed via getPaymentDetails, never
// trusted from the webhook call itself.

const SANDBOX_BASE = "https://api.preprod.konnect.network/api/v2";
const PRODUCTION_BASE = "https://api.konnect.network/api/v2";

export function isKonnectConfigured() {
  return Boolean(process.env.KONNECT_API_KEY && process.env.KONNECT_WALLET_ID);
}

function baseUrl() {
  return process.env.KONNECT_SANDBOX === "true" ? SANDBOX_BASE : PRODUCTION_BASE;
}

type InitPaymentParams = {
  amountMillimes: number;
  description: string;
  orderId: string;
  webhookUrl: string;
  successUrl: string;
  failUrl: string;
};

type InitPaymentResult =
  | { success: true; payUrl: string; paymentRef: string }
  | { success: false; error: string };

export async function initKonnectPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
  if (!isKonnectConfigured()) return { success: false, error: "Konnect n'est pas configuré." };

  try {
    const response = await fetch(`${baseUrl()}/payments/init-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.KONNECT_API_KEY!,
      },
      body: JSON.stringify({
        receiverWalletId: process.env.KONNECT_WALLET_ID,
        token: "TND",
        amount: params.amountMillimes,
        type: "immediate",
        description: params.description,
        acceptedPaymentMethods: ["wallet", "bank_card", "e-DINAR"],
        orderId: params.orderId,
        webhook: params.webhookUrl,
        successUrl: params.successUrl,
        failUrl: params.failUrl,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `Konnect a répondu ${response.status}: ${body}` };
    }

    const data = (await response.json()) as { payUrl: string; paymentRef: string };
    return { success: true, payUrl: data.payUrl, paymentRef: data.paymentRef };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur Konnect." };
  }
}

export type KonnectPaymentStatus = "pending" | "completed";

export async function getKonnectPaymentDetails(
  paymentRef: string,
): Promise<{ status: KonnectPaymentStatus; amount: number } | null> {
  if (!isKonnectConfigured()) return null;

  try {
    const response = await fetch(`${baseUrl()}/payments/${paymentRef}`, {
      headers: { "x-api-key": process.env.KONNECT_API_KEY! },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      payment: { status: KonnectPaymentStatus; amount: number };
    };
    return { status: data.payment.status, amount: data.payment.amount };
  } catch {
    return null;
  }
}
