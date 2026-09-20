"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Avatar from "@/components/ui/Avatar";
import MiroTalkCall from "./MiroTalkCall";
import ChatWindow from "@/components/chat/ChatWindow";
import {
  removeGroupMember,
  deleteGroup,
  requestToJoinGroup,
  acceptJoinRequest,
} from "@/lib/groups/actions";
import type { GroupDetail } from "@/lib/groups/data";

export default function GroupRoom({
  group,
  currentUserId,
  currentUserName,
  locale,
}: {
  group: GroupDetail;
  currentUserId: string;
  currentUserName: string;
  locale: string;
}) {
  const t = useTranslations("groups");
  const router = useRouter();
  const [view, setView] = useState<"chat" | "call">("chat");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();


  const isMember = group.myStatus === "owner" || group.myStatus === "accepted";
  const isOwner = group.myStatus === "owner";

  function handleRequestToJoin() {
    setError(null);
    startTransition(async () => {
      try {
        await requestToJoinGroup(group.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function handleWithdrawRequest() {
    setError(null);
    startTransition(async () => {
      try {
        await removeGroupMember(group.id, currentUserId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function handleAccept(memberId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await acceptJoinRequest(group.id, memberId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function handleRemoveMember(memberId: string) {
    const isSelf = memberId === currentUserId;
    if (!confirm(isSelf ? t("confirmLeave") : t("confirmRemoveMember"))) return;
    setError(null);
    startTransition(async () => {
      try {
        await removeGroupMember(group.id, memberId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function handleRejectRequest(memberId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await removeGroupMember(group.id, memberId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function handleDeleteGroup() {
    if (!confirm(t("confirmDeleteGroup"))) return;
    startTransition(async () => {
      try {
        await deleteGroup(group.id);
        router.push(`/${locale}/groupes`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/groupes" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
        ← {t("backToGroups")}
      </Link>

      <div className="glass-surface flex flex-col gap-4 rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-sm text-foreground/60">{group.className}</p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={handleDeleteGroup}
              disabled={isPending}
              className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
            >
              {t("deleteGroup")}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {group.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-2 rounded-full bg-black/5 py-1 pl-1 pr-3 dark:bg-white/10"
            >
              <Avatar name={member.name} photoUrl={member.avatarUrl} size={28} />
              <span className="text-sm font-medium">{member.name}</span>
              {member.role === "owner" && <span aria-hidden>👑</span>}
              {(isOwner || member.userId === currentUserId) && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.userId)}
                  disabled={isPending}
                  aria-label="Retirer"
                  className="text-foreground/40 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && group.pendingMembers.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-black/5 pt-3 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              {t("pendingRequests")}
            </p>
            {group.pendingMembers.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 px-3 py-2 dark:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <Avatar name={member.name} photoUrl={member.avatarUrl} size={28} />
                  <span className="text-sm font-medium">{member.name}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(member.userId)}
                    disabled={isPending}
                    className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    {t("acceptRequest")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectRequest(member.userId)}
                    disabled={isPending}
                    className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                  >
                    {t("rejectRequest")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {group.myStatus === "none" && (
        <div className="glass-surface flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
          <p className="text-sm text-foreground/70">{t("notAMemberYet")}</p>
          <button
            type="button"
            onClick={handleRequestToJoin}
            disabled={isPending}
            className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? t("requesting") : t("requestToJoin")}
          </button>
        </div>
      )}

      {group.myStatus === "pending" && (
        <div className="glass-surface flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
          <p className="text-sm text-foreground/70">{t("pendingApproval")}</p>
          <button
            type="button"
            onClick={handleWithdrawRequest}
            disabled={isPending}
            className="rounded-full border border-red-500/30 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
          >
            {t("withdrawRequest")}
          </button>
        </div>
      )}

      {isMember && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView("chat")}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                view === "chat"
                  ? "bg-brand-600 text-white shadow-md"
                  : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
              }`}
            >
              💬 {t("chatTab")}
            </button>
            <button
              type="button"
              onClick={() => setView("call")}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                view === "call"
                  ? "bg-brand-600 text-white shadow-md"
                  : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
              }`}
            >
              📹 {t("callTab")}
            </button>
          </div>

          {view === "call" && group.roomSlug ? (
            <MiroTalkCall roomSlug={group.roomSlug} displayName={currentUserName} />
          ) : (
            <ChatWindow
              scope="group"
              targetId={group.id}
              currentUserId={currentUserId}
              locale={locale}
              showAuthors
              placeholder={t("messagePlaceholder")}
              initialMessages={group.messages.map((message) => ({
                id: message.id,
                authorId: message.authorId ?? "",
                authorName: message.authorName,
                authorAvatar: message.authorAvatarUrl,
                content: message.content,
                mediaPath: message.mediaPath,
                mediaType: message.mediaType,
                mediaDuration: message.mediaDuration,
                createdAt: message.createdAt,
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}
