// The convocation text, built the same way in the teacher's live preview and
// on the server. Kept inside the GSM-7 SMS alphabet (no "ç", "ê", "ô", curly
// quotes) so each SMS costs as little as possible.

export type ConvocationMode = "call" | "visit";

export type ConvocationDetails = {
  teacherName: string;
  subject: string | null;
  childName: string;
  className: string;
  phone: string;
  mode: ConvocationMode;
  note: string;
};

/** "52254129" → "52 254 129", the way numbers are read in Tunisia. */
export function formatTunisianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-8);
  return digits.length === 8 ? `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}` : phone;
}

export function convocationSubject({ teacherName, childName, mode }: Pick<ConvocationDetails, "teacherName" | "childName" | "mode">) {
  return mode === "call"
    ? `${teacherName} souhaite vous parler de ${childName}`
    : `${teacherName} souhaite vous rencontrer au sujet de ${childName}`;
}

export function convocationMessage(d: ConvocationDetails) {
  // Short on purpose: without a note it fits a single SMS, even on a reminder.
  const who = d.subject ? `${d.teacherName} (prof. de ${d.subject})` : d.teacherName;
  const phone = formatTunisianPhone(d.phone);
  const ask =
    d.mode === "call"
      ? `souhaite vous parler de ${d.childName} (${d.className}). Merci d'appeler le ${phone}.`
      : `souhaite vous voir au college au sujet de ${d.childName} (${d.className}). RDV a fixer au ${phone}.`;
  const note = d.note.trim() ? ` Motif : ${d.note.trim()}` : "";
  return `${who} ${ask}${note}`;
}
