"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { logout } from "@/lib/auth/actions";

// Logging out is currently a staff/testing affordance, not something a parent
// or student should trigger by accident, so it's behind a short code. This is
// a speed bump, not a security control — the code ships in the client bundle
// and anyone determined can read it or just clear their cookies. Don't rely on
// it to protect anything that matters.
const LOGOUT_CODE = "3112";

export default function LogoutButton({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const entered = prompt(t("logoutCodePrompt"));
    if (entered === null) return;
    if (entered.trim() !== LOGOUT_CODE) {
      alert(t("logoutCodeWrong"));
      return;
    }
    startTransition(() => logout());
  }

  return (
    <button onClick={handleClick} disabled={isPending} className={className}>
      {t("logout")}
    </button>
  );
}
