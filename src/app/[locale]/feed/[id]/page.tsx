import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getFeedPost } from "@/lib/social/data";
import PostCard from "@/components/feed/PostCard";

export default async function FeedPostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [t, post] = await Promise.all([getTranslations("feed"), getFeedPost(id, profile.id)]);

  if (!post) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link href="/feed" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
        ← {t("title")}
      </Link>

      <PostCard post={post} canDelete={profile.role === "admin" || profile.id === post.authorId} />
    </div>
  );
}
