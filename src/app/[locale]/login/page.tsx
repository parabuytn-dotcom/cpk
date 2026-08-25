import { setRequestLocale } from "next-intl/server";
import LoginForm from "@/components/auth/LoginForm";
import { listChildLoginOptions } from "@/lib/auth/data";

// The child-login roster (classes/students) is fetched with the admin client,
// which reads no cookies/headers Next.js could use to infer per-request
// rendering — without this the page would be statically generated once at
// build time and go stale until the next deploy.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { classes, students } = await listChildLoginOptions();

  return <LoginForm childLoginClasses={classes} childLoginStudents={students} />;
}
