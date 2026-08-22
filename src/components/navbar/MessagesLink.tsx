import { Link } from "@/i18n/navigation";

export default function MessagesLink({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/messages"
      aria-label="Messages"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/40 transition hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20"
    >
      <span aria-hidden>💬</span>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
