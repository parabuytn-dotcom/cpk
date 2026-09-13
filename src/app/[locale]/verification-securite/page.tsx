import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { hasPassedAdminVerification } from "@/lib/admin/adminVerification";
import AdminSmsChallenge from "@/components/admin/AdminSmsChallenge";

export const dynamic = "force-dynamic";

export default async function SecurityVerificationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }
  if (profile.role !== "admin") {
    redirect({ href: "/dashboard", locale });
    return null;
  }
  // Already verified, or verification switched off: nothing to do here.
  if (await hasPassedAdminVerification()) {
    redirect({ href: "/admin", locale });
    return null;
  }

  return <AdminSmsChallenge />;
}
