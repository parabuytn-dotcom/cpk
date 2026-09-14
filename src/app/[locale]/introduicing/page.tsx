import { redirect } from "@/i18n/navigation";

// Same page under the spelling that was first shared around; the printed
// forms point to /introducing.
export default async function IntroducingAliasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/introducing", locale });
}
