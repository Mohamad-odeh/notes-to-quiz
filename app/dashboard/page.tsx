import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type QuizRow = {
  id: string;
  title: string;
  language: string;
  created_at: string;
  questions: { count: number }[];
  attempts: { score: number; total: number }[];
};

// The best score out of all attempts, as a percentage (or null if never taken)
function bestPercent(attempts: QuizRow["attempts"]) {
  if (attempts.length === 0) return null;
  return Math.max(...attempts.map((a) => Math.round((a.score / a.total) * 100)));
}

// The dashboard: only for logged-in users
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // proxy.ts already sends logged-out visitors to /login. This is a second check, to be safe.
  if (!data?.claims) redirect("/login");

  // The user's quizzes, newest first. RLS makes sure these are only their own.
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, language, created_at, questions(count), attempts(score, total)")
    .order("created_at", { ascending: false });
  const rows: QuizRow[] = quizzes ?? [];

  return (
    <section className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your dashboard</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Logged in as {data.claims.email}</p>
        </div>
        <Link
          href="/create"
          className="rounded-full bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
        >
          + New quiz
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          You don&apos;t have any quizzes yet. Click <strong>+ New quiz</strong> to make your first one!
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {rows.map((quiz) => {
            const best = bestPercent(quiz.attempts);
            return (
              <li key={quiz.id}>
                <Link
                  href={`/quiz/${quiz.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 p-5 hover:border-indigo-400 dark:border-zinc-800"
                >
                  <div>
                    <p dir="auto" className={`font-semibold ${quiz.language === "ar" ? "font-arabic" : ""}`}>
                      {quiz.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {quiz.questions[0]?.count ?? 0} questions ·{" "}
                      {new Date(quiz.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Best score</p>
                    <p className="text-lg font-bold">{best === null ? "–" : `${best}%`}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
