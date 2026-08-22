import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listNotifications, countUnreadNotifications } from "@/lib/notifications/data";
import { countUnreadMessages } from "@/lib/messaging/data";
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationBell from "./NotificationBell";
import MessagesLink from "./MessagesLink";
import MobileMenu from "./MobileMenu";

export default async function Navbar() {
  const t = await getTranslations("nav");
  const profile = await getCurrentProfile();

  const items = [
    { href: "/", label: t("home") },
    { href: "/emploi-du-temps", label: t("timetable") },
    ...(profile ? [{ href: "/feed", label: t("feed") }, { href: "/cours", label: t("vault") }] : []),
    { href: "/staff", label: t("staff") },
    { href: "/a-propos", label: t("about") },
    { href: "/nouveautes", label: t("releases") },
    { href: "/aide", label: t("help") },
  ];

  const authHref = profile
    ? profile.role === "admin"
      ? "/admin"
      : "/dashboard"
    : "/login";
  const authLabel = profile
    ? profile.role === "admin"
      ? t("admin")
      : t("dashboard")
    : t("login");

  const [notifications, unreadCount, unreadMessages] = profile
    ? await Promise.all([
        listNotifications(profile.id),
        countUnreadNotifications(profile.id),
        countUnreadMessages(profile),
      ])
    : [[], 0, 0];

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-4">
      <div className="glass-surface mx-auto flex max-w-6xl items-center justify-between rounded-full px-5 py-3 shadow-lg shadow-black/5">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm text-white shadow-md">
            CPK
          </span>
          <span className="hidden sm:inline">Collège Pilote du Kef</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-brand-500/10 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {profile && <MessagesLink unreadCount={unreadMessages} />}
          {profile && <NotificationBell notifications={notifications} unreadCount={unreadCount} />}
          <LanguageSwitcher />
          <Link
            href={authHref}
            className="hidden rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 md:inline-block"
          >
            {authLabel}
          </Link>
          <MobileMenu items={items} authHref={authHref} authLabel={authLabel} />
        </div>
      </div>
    </header>
  );
}
