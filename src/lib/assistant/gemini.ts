import "server-only";
import { SITE_KNOWLEDGE } from "./knowledge";

export type ChatTurn = { role: "user" | "model"; content: string };

export type AskGeminiResult = { reply: string } | { error: string };

/**
 * Calls the free-tier Gemini API (Google AI Studio key, no billing account
 * needed). Keeps requests cheap on purpose: short history window, capped
 * output tokens, low temperature — this is meant to stay inside the free
 * quota for a small school site, not to be a general-purpose chatbot.
 */
export async function askGemini(history: ChatTurn[]): Promise<AskGeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "L'assistant n'est pas encore configuré (GEMINI_API_KEY manquante)." };
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Keep only the last few turns — controls token usage (and therefore cost
  // / free-quota consumption) since the whole history is resent every call.
  const recentHistory = history.slice(-10);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SITE_KNOWLEDGE }] },
        contents: recentHistory.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.content }],
        })),
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 400,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { error: `Gemini a répondu ${response.status} : ${body.slice(0, 200)}` };
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return { error: "Réponse vide de l'assistant." };

    return { reply };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
}
