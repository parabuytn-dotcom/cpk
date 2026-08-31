import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listNotifications, countUnreadNotifications } from "@/lib/notifications/data";
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationBell from "./NotificationBell";
import MobileMenu from "./MobileMenu";
import LogoutButton from "./LogoutButton";
import PresenceHeartbeat from "@/components/presence/PresenceHeartbeat";

export default async function Navbar() {
  const t = await getTranslations("nav");
  const profile = await getCurrentProfile();

  const items = [
    { href: "/", label: t("home") },
    { href: "/emploi-du-temps", label: t("timetable") },
    ...(profile
      ? [
          { href: "/devoirs", label: t("exams") },
          { href: "/feed", label: t("feed") },
          { href: "/idees", label: t("ideas") },
          { href: "/dons", label: t("donations") },
        ]
      : []),
    { href: "/staff", label: t("staff") },
    { href: "/a-propos", label: t("about") },
    { href: "/nouveautes", label: t("releases") },
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

  const [notifications, unreadCount] = profile
    ? await Promise.all([listNotifications(profile.id), countUnreadNotifications(profile.id)])
    : [[], 0];

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-4">
      {profile && <PresenceHeartbeat />}
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-black/5 bg-white px-5 py-3 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-gray-900">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm text-white shadow-md">
            CPK
          </span>
          <span className="hidden sm:inline">Collège Pilote du Kef</span>
        </Link>

        <nav className="hidden flex-nowrap items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] xl:flex [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-brand-500/10 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {profile && <NotificationBell notifications={notifications} unreadCount={unreadCount} />}
          <LanguageSwitcher />
          {profile && (
            <LogoutButton className="hidden text-sm font-medium text-foreground/40 transition hover:text-foreground/70 xl:inline-block" />
          )}
          <Link
            href={authHref}
            className="hidden rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 xl:inline-block"
          >
            {authLabel}
          </Link>
          <MobileMenu
            items={items}
            authHref={authHref}
            authLabel={authLabel}
            showLogout={Boolean(profile)}
          />
        </div>
      </div>
    </header>
  );
}
