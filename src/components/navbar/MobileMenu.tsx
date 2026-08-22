"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

type NavItem = { href: string; label: string };

export default function MobileMenu({
  items,
  authHref,
  authLabel,
}: {
  items: NavItem[];
  authHref: string;
  authLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="xl:hidden">
      <button
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/40 backdrop-blur-md transition dark:bg-white/10"
      >
        <span
          className={`block h-0.5 w-5 bg-current transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
        />
        <span
          className={`block h-0.5 w-5 bg-current transition-opacity ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-0.5 w-5 bg-current transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
        />
      </button>

      {open && (
        <div className="glass-surface absolute inset-x-4 top-20 z-50 rounded-3xl p-4 shadow-xl">
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-base font-medium transition hover:bg-brand-500/10"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={authHref}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-xl bg-brand-600 px-4 py-3 text-center text-base font-semibold text-white shadow-md transition hover:bg-brand-700"
            >
              {authLabel}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
