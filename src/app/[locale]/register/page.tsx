import { setRequestLocale } from "next-intl/server";
import RegisterForm from "@/components/auth/RegisterForm";
import { listClassesForRegistration } from "@/lib/auth/data";

// The class list is fetched with the admin client (RLS on `classes` requires
// an authenticated caller, which no one has yet on this page) — no
// cookies/headers are read that Next.js could use to infer per-request
// rendering, so without this the page would be statically generated once at
// build time and go stale until the next deploy.
export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const classes = await listClassesForRegistration();

  return <RegisterForm classes={classes} />;
}
