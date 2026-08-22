import { setRequestLocale } from "next-intl/server";
import RegisterForm from "@/components/auth/RegisterForm";
import { listClasses } from "@/lib/admin/data";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const classes = await listClasses();

  return <RegisterForm classes={classes} />;
}
