import { redirect } from "@/i18n/navigation";

// Help requests now live in the unified inbox, alongside incoming SMS and emails.
export default async function AdminHelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/admin/boite-de-reception?filtre=aide", locale });
}
