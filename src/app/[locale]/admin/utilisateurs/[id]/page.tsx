import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Avatar from "@/components/ui/Avatar";
import { getProfileDetail } from "@/lib/admin/data";
import { validateAccount } from "@/lib/admin/actions";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const profile = await getProfileDetail(id);
  if (!profile) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/utilisateurs" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
        ← Retour aux utilisateurs
      </Link>

      <PageHeader title={profile.fullName ?? "Profil"} />

      <div className="glass-surface flex flex-wrap items-center gap-6 rounded-3xl p-6">
        <Avatar name={profile.fullName ?? "?"} photoUrl={profile.avatarUrl} size={96} />
        <div className="flex-1">
          <p className="text-lg font-semibold">{profile.fullName ?? "—"}</p>
          <p className="text-sm text-foreground/60">
            {profile.role} ·{" "}
            <span className={profile.status === "pending" ? "text-accent-600" : "text-green-600 dark:text-green-400"}>
              {profile.status}
            </span>
          </p>
        </div>
        {profile.status === "pending" && (
          <form action={validateAccount.bind(null, profile.id)}>
            <button
              type="submit"
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700"
            >
              Valider ce compte
            </button>
          </form>
        )}
      </div>

      <div className="glass-surface grid gap-4 rounded-3xl p-6 sm:grid-cols-2">
        <Field label="CIN" value={profile.cin ?? "—"} />
        <Field label="Téléphone" value={profile.phone ?? "—"} />
        <Field label="Email" value={profile.email ?? "—"} />
        <Field label="Méthode d'inscription" value={profile.registrationMethod ?? "—"} />
        <Field label="Tags" value={profile.tags.length > 0 ? profile.tags.join(", ") : "—"} />
        <Field label="Inscrit le" value={new Date(profile.createdAt).toLocaleString("fr-FR")} />
      </div>

      {profile.badges.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground/70">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b, i) => (
              <span key={i} className="glass-surface rounded-full px-3 py-1.5 text-sm">
                {b.emoji} {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.role === "parent" && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground/70">Enfants</h2>
          {profile.children.length === 0 ? (
            <p className="text-sm text-foreground/50">Aucun enfant enregistré.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {profile.children.map((c) => (
                <div key={c.id} className="glass-surface rounded-2xl px-4 py-3 text-sm">
                  <span className="font-medium">
                    {c.firstName} {c.lastName ?? ""}
                  </span>{" "}
                  — {c.className} {c.hasAccount ? "· compte créé" : "· pas encore de compte"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-foreground/50">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
