"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

const STORAGE_KEY = "cpk_onboarded";

export default function FirstVisitRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      localStorage.setItem(STORAGE_KEY, "1");
      router.push("/bienvenue");
    } catch {
      // localStorage unavailable (private mode, blocked cookies) — skip silently.
    }
  }, [router]);

  return null;
}
