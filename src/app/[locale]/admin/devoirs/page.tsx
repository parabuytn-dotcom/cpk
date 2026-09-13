import { setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import HomeworkForm from "@/components/dashboard/HomeworkForm";
import ExamForm from "@/components/dashboard/ExamForm";
import DeleteSchoolWorkButton from "@/components/admin/DeleteSchoolWorkButton";
import { listClasses, listSchoolExams, listSchoolHomework } from "@/lib/admin/data";
import { formatDate } from "@/lib/formatDate";

export const dynamic = "force-dynamic";

export default async function AdminHomeworkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [classes, homework, exams] = await Promise.all([listClasses(), listSchoolHomework(), listSchoolExams()]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Devoirs"
        subtitle="Cahier de texte et devoirs surveillés de toutes les classes. Les élèves concernés sont prévenus à chaque ajout."
      />

      {classes.length === 0 ? (
        <EmptyState message="Crée d'abord une classe dans l'onglet Classes." />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Ajouter un devoir au cahier de texte</h2>
            <HomeworkForm classes={classes} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Programmer un devoir surveillé</h2>
            <ExamForm classes={classes} />
          </section>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cahier de texte</h2>
        {homework.length === 0 ? (
          <EmptyState message="Aucun devoir à venir." />
        ) : (
          <ul className="glass-surface flex flex-col divide-y divide-black/5 rounded-3xl px-5 dark:divide-white/10">
            {homework.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {item.className} · {item.subject}
                  </p>
                  <p className="text-sm text-foreground/70">{item.description}</p>
                  <p className="text-xs text-foreground/50">Pour le {formatDate(locale, item.dueDate)}</p>
                </div>
                <DeleteSchoolWorkButton kind="homework" id={item.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Devoirs surveillés</h2>
        {exams.length === 0 ? (
          <EmptyState message="Aucun devoir surveillé à venir." />
        ) : (
          <ul className="glass-surface flex flex-col divide-y divide-black/5 rounded-3xl px-5 dark:divide-white/10">
            {exams.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {item.className} · {item.subject} ·{" "}
                    {item.type === "synthese" ? "Devoir de synthèse" : "Devoir de contrôle"}
                  </p>
                  {item.description && <p className="text-sm text-foreground/70">{item.description}</p>}
                  <p className="text-xs text-foreground/50">Le {formatDate(locale, item.examDate)}</p>
                </div>
                <DeleteSchoolWorkButton kind="exam" id={item.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
