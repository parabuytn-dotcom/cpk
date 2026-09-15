"use client";

import { useEffect, useState, useTransition } from "react";
import {
  previewUrgent,
  searchUrgentPeople,
  sendUrgent,
  type UrgentPerson,
  type UrgentPreview,
} from "@/lib/admin/urgentActions";
import { countSmsSegments } from "@/lib/smsSegments";
import type { ClassRow } from "@/lib/admin/data";

const AUDIENCES = [
  { value: "person", label: "Une seule personne (convocation, cours annulé…)" },
  { value: "parents", label: "Parents" },
  { value: "all", label: "Tout le monde (membres du site)" },
  { value: "students", label: "Élèves" },
  { value: "teachers", label: "Professeurs" },
  { value: "class", label: "Une classe (élèves + parents)" },
] as const;

const INTERVALS = [5, 10, 15, 20, 30, 45, 60, 120, 180, 360];

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-red-500 dark:border-white/10 dark:bg-white/5";

function formatInterval(minutes: number) {
  return minutes < 60 ? `${minutes} min` : `${minutes / 60} h`;
}

function ChannelCard({
  title,
  icon,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  enabled: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${
        enabled
          ? "border-red-500/40 bg-red-500/5"
          : "border-dashed border-black/15 bg-transparent opacity-70 dark:border-white/15"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">
          <span aria-hidden>{icon}</span> {title}
        </p>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            enabled
              ? "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {enabled ? "Retirer" : "Ajouter"}
        </button>
      </div>
      {enabled ? children : <p className="text-xs text-foreground/50">Non envoyé.</p>}
    </div>
  );
}

function RepeatFields({
  count,
  setCount,
  interval,
  setInterval,
  max,
  noun,
}: {
  count: number;
  setCount: (n: number) => void;
  interval: number;
  setInterval: (n: number) => void;
  max: number;
  noun: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-xs text-foreground/60">
        Nombre d&apos;envois
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputClass}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n === 1 ? `1 ${noun}` : `${n} ${noun}s`}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-foreground/60">
        Délai entre deux
        <select
          value={interval}
          disabled={count === 1}
          onChange={(e) => setInterval(Number(e.target.value))}
          className={`${inputClass} disabled:opacity-50`}
        >
          {INTERVALS.map((m) => (
            <option key={m} value={m}>
              {formatInterval(m)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function PersonPicker({
  selected,
  onSelect,
}: {
  selected: UrgentPerson | null;
  onSelect: (person: UrgentPerson | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UrgentPerson[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchUrgentPeople(query)
        .then((found) => {
          if (!cancelled) setResults(found);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{selected.name}</p>
          <p className="truncate text-xs text-foreground/60">
            {selected.detail}
            {!selected.hasPhone && " · pas de numéro de téléphone"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-foreground/70 hover:bg-black/10 dark:bg-white/10"
        >
          Changer
        </button>
      </div>
    );
  }

  const showResults = query.trim().length >= 2;
  return (
    <div className="flex flex-col gap-1">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nom du parent, de l'élève, ou numéro de téléphone"
        className={inputClass}
        autoFocus
      />
      <span className="text-xs text-foreground/50">
        Tape le prénom d&apos;un élève pour trouver son parent.
      </span>
      {showResults && (
        <ul className="mt-1 flex max-h-64 flex-col overflow-y-auto rounded-xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-gray-900/80">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-foreground/60">{searching ? "Recherche…" : "Aucun résultat."}</li>
          ) : (
            results.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(person);
                    setQuery("");
                    setResults([]);
                  }}
                  className="flex w-full flex-col items-start px-4 py-2 text-left transition hover:bg-red-500/10"
                >
                  <span className="text-sm font-medium">{person.name}</span>
                  <span className="text-xs text-foreground/60">
                    {person.detail}
                    {!person.hasPhone && " · pas de numéro"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default function UrgentComposer({ classes }: { classes: ClassRow[] }) {
  const [audience, setAudience] = useState<string>("person");
  const [classId, setClassId] = useState("");
  const [person, setPerson] = useState<UrgentPerson | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [emailOn, setEmailOn] = useState(true);
  const [smsOn, setSmsOn] = useState(true);
  const [smsCount, setSmsCount] = useState(1);
  const [smsInterval, setSmsInterval] = useState(30);
  const [notifOn, setNotifOn] = useState(true);
  const [notifCount, setNotifCount] = useState(1);
  const [notifInterval, setNotifInterval] = useState(30);
  const [intrusive, setIntrusive] = useState(true);

  const [preview, setPreview] = useState<UrgentPreview | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSending, startSending] = useTransition();

  useEffect(() => {
    if (audience === "class" && !classId) return;
    if (audience === "person" && !person) return;
    let cancelled = false;
    previewUrgent({ audience, classId, personId: person?.id })
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch(() => {
        // The counts are only a hint; sending re-checks everything.
      });
    return () => {
      cancelled = true;
    };
  }, [audience, classId, person]);

  const smsSegments = countSmsSegments(`CPK Learn - URGENT (rappel 2/2) : ${message}`);
  const reach = preview?.ok ? preview : null;
  const smsTotal = reach ? Math.min(reach.phones, 150) * smsSegments * smsCount : null;
  const nothingSelected = !emailOn && !smsOn && !notifOn;

  function submit() {
    setResult(null);
    const channelsText = [
      notifOn && `notification${notifCount > 1 ? ` ×${notifCount}` : ""}`,
      smsOn && `SMS${smsCount > 1 ? ` ×${smsCount}` : ""}`,
      emailOn && "email",
    ]
      .filter(Boolean)
      .join(", ");
    const to = audience === "person" && person ? ` à ${person.name}` : "";
    if (!confirm(`Envoyer ce message urgent${to} (${channelsText}) ? Le premier envoi part immédiatement.`)) return;

    startSending(async () => {
      const res = await sendUrgent({
        audience: audience as "all",
        classId,
        personId: person?.id,
        subject,
        message,
        channels: {
          email: { enabled: emailOn },
          sms: { enabled: smsOn, count: smsCount, intervalMinutes: smsInterval },
          notification: { enabled: notifOn, count: notifCount, intervalMinutes: notifInterval, intrusive },
        },
      });
      if (res.ok) {
        setResult({ ok: true, text: res.summary });
        setSubject("");
        setMessage("");
      } else {
        setResult({ ok: false, text: res.error });
      }
    });
  }

  return (
    <section className="glass-surface flex flex-col gap-5 rounded-3xl border border-red-500/30 p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Destinataires
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className={inputClass}>
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        {audience === "person" && (
          <div className="flex flex-col gap-1 text-sm font-medium">
            Personne
            <PersonPicker selected={person} onSelect={setPerson} />
          </div>
        )}
        {audience === "class" && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Classe
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {reach && (audience !== "person" || person) && (
        <p className="text-xs text-foreground/60">
          {audience === "person"
            ? `${reach.phones ? "Numéro de téléphone ✓" : "Pas de numéro de téléphone"} · ${reach.emails ? "Adresse email ✓" : "Pas d'adresse email"}`
            : `${reach.people} personne(s) · ${reach.phones} numéro(s) · ${reach.emails} adresse(s) email`}
          {reach.smsUsable !== null && <> · {reach.smsUsable} SMS utilisables</>} · {reach.emailRemaining} emails
          restants aujourd&apos;hui
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Titre
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          placeholder="Ex. : Convocation au collège, Pas de cours demain matin"
          className={inputClass}
        />
        <span className="text-xs font-normal text-foreground/50">Objet de l&apos;email et titre de la notification.</span>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Message
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Le même texte part par email, SMS et notification."
          className={inputClass}
        />
        {smsOn && message && (
          <span className="text-xs font-normal text-foreground/50">
            Par SMS : {smsSegments} SMS par destinataire (préfixe « CPK Learn - URGENT » compris)
            {smsTotal !== null && <> · environ {smsTotal} SMS au total</>}.
          </span>
        )}
      </label>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChannelCard title="Notification" icon="🔔" enabled={notifOn} onToggle={() => setNotifOn(!notifOn)}>
          <RepeatFields
            count={notifCount}
            setCount={setNotifCount}
            interval={notifInterval}
            setInterval={setNotifInterval}
            max={12}
            noun="envoi"
          />
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={intrusive} onChange={(e) => setIntrusive(e.target.checked)} className="mt-0.5" />
            <span>
              Fenêtre bloquante à l&apos;ouverture du site (première notification seulement, les suivantes vont dans la
              cloche et sur le téléphone)
            </span>
          </label>
        </ChannelCard>

        <ChannelCard title="SMS" icon="💬" enabled={smsOn} onToggle={() => setSmsOn(!smsOn)}>
          <RepeatFields
            count={smsCount}
            setCount={setSmsCount}
            interval={smsInterval}
            setInterval={setSmsInterval}
            max={10}
            noun="envoi"
          />
          <p className="text-xs text-foreground/50">
            150 numéros maximum par envoi. Les 30 SMS des codes de vérification et les alertes de recharge restent protégés.
          </p>
        </ChannelCard>

        <ChannelCard title="Email" icon="✉️" enabled={emailOn} onToggle={() => setEmailOn(!emailOn)}>
          <p className="text-xs text-foreground/60">Un seul envoi, à l&apos;adresse de contact de chaque personne.</p>
        </ChannelCard>
      </div>

      <p className="text-xs text-foreground/50">
        Le premier envoi de chaque moyen part tout de suite ; les suivants partent au délai choisi, à 5 minutes près.
        Tu peux annuler les envois restants dans l&apos;historique ci-dessous.
      </p>

      <button
        type="button"
        onClick={submit}
        disabled={
          isSending ||
          nothingSelected ||
          !subject.trim() ||
          !message.trim() ||
          (audience === "class" && !classId) ||
          (audience === "person" && !person)
        }
        className="self-start rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700 disabled:opacity-50"
      >
        {isSending ? "Envoi en cours…" : "🚨 Envoyer le message urgent"}
      </button>
      {nothingSelected && <p className="text-sm text-red-600 dark:text-red-400">Ajoute au moins un moyen d&apos;envoi.</p>}
      {result && (
        <p className={`text-sm ${result.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {result.text}
        </p>
      )}
    </section>
  );
}
