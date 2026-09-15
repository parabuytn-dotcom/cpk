"use client";

import { useMemo, useState, useTransition } from "react";
import { cancelConvocation, convokeParent } from "@/lib/urgent/convocationActions";
import {
  convocationMessage,
  convocationSubject,
  type ConvocationMode,
} from "@/lib/urgent/convocationMessage";
import { countSmsSegments } from "@/lib/smsSegments";
import { ChannelCard, RepeatFields, urgentInputClass as inputClass } from "@/components/urgent/ChannelFields";
import type { ConvocationStudent } from "@/lib/urgent/convocationData";

// The school's default reminder rhythm for a convocation.
const DEFAULTS = {
  notification: { count: 4, interval: 60 },
  sms: { count: 5, interval: 40 },
  email: { count: 2, interval: 120 },
};

export type ConvocationHistoryItem = {
  id: string;
  subject: string;
  audienceLabel: string;
  createdAt: string;
  cancelled: boolean;
  pending: number;
  sent: { notification: number; sms: number; email: number };
};

export default function ConvocationForm({
  teacherName,
  subject: teacherSubject,
  defaultPhone,
  classes,
  students,
  history,
}: {
  teacherName: string;
  subject: string | null;
  defaultPhone: string;
  classes: string[];
  students: ConvocationStudent[];
  history: ConvocationHistoryItem[];
}) {
  const [className, setClassName] = useState(classes[0] ?? "");
  const [studentId, setStudentId] = useState("");
  const [mode, setMode] = useState<ConvocationMode>("call");
  const [phone, setPhone] = useState(defaultPhone);
  const [note, setNote] = useState("");

  const [notifOn, setNotifOn] = useState(true);
  const [notifCount, setNotifCount] = useState(DEFAULTS.notification.count);
  const [notifInterval, setNotifInterval] = useState(DEFAULTS.notification.interval);
  const [smsOn, setSmsOn] = useState(true);
  const [smsCount, setSmsCount] = useState(DEFAULTS.sms.count);
  const [smsInterval, setSmsInterval] = useState(DEFAULTS.sms.interval);
  const [emailOn, setEmailOn] = useState(true);
  const [emailCount, setEmailCount] = useState(DEFAULTS.email.count);
  const [emailInterval, setEmailInterval] = useState(DEFAULTS.email.interval);

  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSending, startSending] = useTransition();
  const [, startCancel] = useTransition();

  const classStudents = students.filter((s) => s.className === className);
  const student = students.find((s) => s.id === studentId) ?? null;
  const phoneDigits = phone.replace(/\D/g, "");

  const details = useMemo(
    () =>
      student
        ? {
            teacherName,
            subject: teacherSubject,
            childName: student.name,
            className: student.className,
            phone: phoneDigits || "XX XXX XXX",
            mode,
            note,
          }
        : null,
    [student, teacherName, teacherSubject, phoneDigits, mode, note],
  );
  const preview = details ? convocationMessage(details) : null;
  const smsParts = preview && smsCount ? countSmsSegments(`CPK Learn (rappel ${smsCount}/${smsCount}) : ${preview}`) : 0;

  function resetChannels() {
    setNotifOn(true);
    setNotifCount(DEFAULTS.notification.count);
    setNotifInterval(DEFAULTS.notification.interval);
    setSmsOn(true);
    setSmsCount(DEFAULTS.sms.count);
    setSmsInterval(DEFAULTS.sms.interval);
    setEmailOn(true);
    setEmailCount(DEFAULTS.email.count);
    setEmailInterval(DEFAULTS.email.interval);
  }

  function submit() {
    if (!student || !details) return;
    setResult(null);
    if (!confirm(`Convoquer le parent de ${student.name} ? La première notification, le premier SMS et le premier email partent immédiatement.`)) {
      return;
    }
    startSending(async () => {
      const res = await convokeParent({
        studentId: student.id,
        mode,
        phone: phoneDigits,
        note,
        channels: {
          notification: { enabled: notifOn, count: notifCount, intervalMinutes: notifInterval },
          sms: { enabled: smsOn, count: smsCount, intervalMinutes: smsInterval },
          email: { enabled: emailOn, count: emailCount, intervalMinutes: emailInterval },
        },
      });
      if (res.ok) {
        setResult({ ok: true, text: res.summary });
        setStudentId("");
        setNote("");
      } else {
        setResult({ ok: false, text: res.error });
      }
    });
  }

  const nothingSelected = !notifOn && !smsOn && !emailOn;

  return (
    <section className="glass-surface flex flex-col gap-5 rounded-3xl p-6">
      <div>
        <h2 className="text-lg font-semibold">📩 Convoquer un parent</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Le parent reçoit ton message par notification, SMS et email, avec des rappels jusqu&apos;à ce qu&apos;il réagisse.
          Tu peux annuler les rappels à tout moment.
        </p>
      </div>

      {classes.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucune classe ne t&apos;est attribuée pour le moment. Demande à l&apos;administration de t&apos;ajouter à tes classes.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Classe
              <select
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  setStudentId("");
                }}
                className={inputClass}
              >
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Élève
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
                <option value="">Choisir un élève…</option>
                {classStudents.map((s) => (
                  <option key={s.id} value={s.id} disabled={!s.parentId}>
                    {s.name}
                    {!s.parentId ? " — pas de compte parent" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {student && (
            <p className="-mt-2 text-xs text-foreground/60">
              Parent : {student.parentName ?? "compte parent"}
              {!student.parentHasPhone && " · pas de numéro de téléphone, retire le SMS"}
            </p>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Tu demandes au parent de…</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["call", "📞 Te contacter par téléphone"],
                  ["visit", "🏫 Venir te voir au collège"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    mode === value
                      ? "border-red-500 bg-red-500/10 text-red-800 dark:text-red-300"
                      : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Ton numéro
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                maxLength={11}
                placeholder="XX XXX XXX"
                className={`${inputClass} tabular-nums`}
              />
              {phoneDigits.length > 0 && phoneDigits.length !== 8 && (
                <span className="text-xs font-normal text-red-600 dark:text-red-400">8 chiffres attendus.</span>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Motif ou précision (facultatif)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder="Ex. : résultats du trimestre, jeudi entre 10 h et 12 h"
                className={inputClass}
              />
            </label>
          </div>

          {preview && details && (
            <div className="rounded-2xl bg-black/[0.04] p-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Message envoyé</p>
              <p className="mt-1 text-sm font-semibold">{convocationSubject(details)}</p>
              <p className="mt-1 text-sm text-foreground/80">{preview}</p>
              {smsOn && (
                <p className="mt-2 text-xs text-foreground/50">
                  {smsParts} SMS par envoi × {smsCount} = {smsParts * smsCount} SMS du forfait du collège.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            <ChannelCard title="Notifications" icon="🔔" enabled={notifOn} onToggle={() => setNotifOn(!notifOn)}>
              <RepeatFields count={notifCount} setCount={setNotifCount} interval={notifInterval} setInterval={setNotifInterval} max={6} />
              <p className="text-xs text-foreground/50">La première s&apos;affiche en grand à l&apos;ouverture du site.</p>
            </ChannelCard>
            <ChannelCard title="SMS" icon="💬" enabled={smsOn} onToggle={() => setSmsOn(!smsOn)}>
              <RepeatFields count={smsCount} setCount={setSmsCount} interval={smsInterval} setInterval={setSmsInterval} max={5} />
            </ChannelCard>
            <ChannelCard title="Emails" icon="✉️" enabled={emailOn} onToggle={() => setEmailOn(!emailOn)}>
              <RepeatFields count={emailCount} setCount={setEmailCount} interval={emailInterval} setInterval={setEmailInterval} max={3} />
            </ChannelCard>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={isSending || !student || nothingSelected || phoneDigits.length !== 8}
              className="rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700 disabled:opacity-50"
            >
              {isSending ? "Envoi…" : "Envoyer la convocation"}
            </button>
            <button type="button" onClick={resetChannels} className="text-xs text-foreground/60 underline hover:text-foreground">
              Rythme par défaut : 4 notifications / 1 h, 5 SMS / 40 min, 2 emails / 2 h
            </button>
          </div>
          {nothingSelected && <p className="text-sm text-red-600 dark:text-red-400">Ajoute au moins un moyen d&apos;envoi.</p>}
          {result && (
            <p className={`text-sm ${result.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {result.text}
            </p>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-black/5 pt-4 dark:border-white/10">
          <h3 className="text-sm font-semibold text-foreground/70">Mes convocations</h3>
          <ul className="flex flex-col gap-2">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/[0.03] px-4 py-2.5 dark:bg-white/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.audienceLabel}</p>
                  <p className="text-xs text-foreground/55">
                    {new Date(item.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "short", timeStyle: "short" })} ·
                    envoyés : {item.sent.notification} notif., {item.sent.sms} SMS, {item.sent.email} email
                    {item.pending > 0 ? ` · ${item.pending} rappel(s) à venir` : item.cancelled ? " · rappels annulés" : " · terminé"}
                  </p>
                </div>
                {item.pending > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Annuler les rappels restants de cette convocation ?")) {
                        startCancel(() => cancelConvocation(item.id));
                      }
                    }}
                    className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-500/10 dark:text-red-400"
                  >
                    Annuler les rappels
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
