"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { searchContacts, type ContactChannel, type ContactSuggestion } from "@/lib/admin/contactSearch";

const DEBOUNCE_MS = 250;

function formatLastUsed(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function RecipientSearch({
  channel,
  alreadyAdded,
  onPick,
}: {
  channel: ContactChannel;
  alreadyAdded: string[];
  onPick: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [isPending, startTransition] = useTransition();
  const listId = useId();
  const latest = useRef("");

  useEffect(() => {
    const trimmed = query.trim();
    latest.current = trimmed;
    // Too short to search: results are hidden at render time rather than
    // cleared here, since setting state straight from an effect re-renders twice.
    if (trimmed.length < 2) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const found = await searchContacts(channel, trimmed);
        // Drop a response that arrives after the admin has kept typing.
        if (latest.current === trimmed) {
          setResults(found);
          setActive(0);
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, channel]);

  const added = new Set(alreadyAdded.map((v) => v.toLowerCase()));

  function pick(suggestion: ContactSuggestion) {
    onPick(suggestion.value);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      // Keep Enter from submitting the whole compose form.
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && query.trim().length >= 2;

  return (
    <div className="relative">
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder={
          channel === "email"
            ? "Rechercher un ancien destinataire (adresse ou nom)…"
            : "Rechercher un ancien destinataire (numéro ou nom)…"
        }
        className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-neutral-900"
        >
          {results.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-foreground/50">
              {isPending ? "Recherche…" : "Aucun résultat dans l'historique."}
            </li>
          ) : (
            results.map((suggestion, index) => {
              const isAdded = added.has(suggestion.value.toLowerCase());
              const lastUsed = formatLastUsed(suggestion.lastUsedAt);
              return (
                <li
                  key={suggestion.value}
                  role="option"
                  aria-selected={index === active}
                  // mousedown, not click: fires before the input's blur closes the list.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!isAdded) pick(suggestion);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${
                    isAdded ? "cursor-default opacity-50" : "cursor-pointer"
                  } ${index === active && !isAdded ? "bg-brand-500/10" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{suggestion.name ?? suggestion.value}</span>
                    {suggestion.name && (
                      <span className="block truncate text-xs text-foreground/60">{suggestion.value}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-foreground/50">
                    {isAdded ? "déjà ajouté" : lastUsed ? `contacté le ${lastUsed}` : "compte du site"}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
