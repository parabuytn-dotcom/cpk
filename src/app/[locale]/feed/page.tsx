import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listFeedPosts } from "@/lib/social/data";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import PostComposer from "@/components/feed/PostComposer";
import PostCard from "@/components/feed/PostCard";

export default async function FeedPage({
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

  const [t, posts] = await Promise.all([getTranslations("feed"), listFeedPosts(profile.id)]);
  const canPostImage =
    profile.role === "admin" || profile.role === "teacher" || profile.tags.includes("feed_publisher");
  const canPostVideo =
    profile.role === "admin" || profile.role === "teacher" || profile.tags.includes("reels_publisher");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={t("title")} />

      {(canPostImage || canPostVideo) && (
        <PostComposer canPostImage={canPostImage} canPostVideo={canPostVideo} />
      )}

      {posts.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete={profile.role === "admin" || profile.id === post.authorId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
