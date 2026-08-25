"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { logout } from "@/lib/auth/actions";

export default function LogoutButton({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const [isPending, startTransition] = useTransition();

  return (
    <button onClick={() => startTransition(() => logout())} disabled={isPending} className={className}>
      {t("logout")}
    </button>
  );
}
