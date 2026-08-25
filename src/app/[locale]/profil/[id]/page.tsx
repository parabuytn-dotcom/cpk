import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getUserProfile, getProfileStats } from "@/lib/profiles/data";
import { listFeedPosts } from "@/lib/social/data";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import PostCard from "@/components/feed/PostCard";
import FollowButton from "@/components/profiles/FollowButton";

const ROLE_KEYS: Record<string, string> = {
  parent: "roleParent",
  student: "roleStudent",
  teacher: "roleTeacher",
  staff: "roleStaff",
  admin: "roleAdmin",
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [t, viewer, profile] = await Promise.all([
    getTranslations("userProfile"),
    getCurrentProfile(),
    getUserProfile(id),
  ]);

  if (!profile) notFound();

  const [stats, posts] = await Promise.all([
    getProfileStats(id, viewer?.id),
    listFeedPosts(viewer?.id, id),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="glass-surface flex flex-wrap items-center gap-6 rounded-3xl p-6">
        <Avatar name={profile.displayName} photoUrl={profile.avatarUrl} size={96} />
        <div className="flex-1">
          <h1 className="text-xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-foreground/60">
            {t(ROLE_KEYS[profile.role] ?? "roleParent")}
          </p>
          <div className="mt-2 flex gap-4 text-sm text-foreground/70">
            <span>
              <strong>{stats.followerCount}</strong> {t("followersCount")}
            </span>
            <span>
              <strong>{stats.followingCount}</strong> {t("followingCount")}
            </span>
          </div>
        </div>
        {viewer && viewer.id !== profile.id && (
          <FollowButton userId={profile.id} initialFollowing={stats.isFollowing} />
        )}
      </div>

      <h2 className="text-lg font-semibold">{t("posts")}</h2>
      {posts.length === 0 ? (
        <EmptyState message={t("noPosts")} />
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete={viewer?.role === "admin" || viewer?.id === post.authorId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
