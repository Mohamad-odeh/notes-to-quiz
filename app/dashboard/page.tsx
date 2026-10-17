import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type QuizRow = {
  id: string;
  title: string;
  language: string;
  created_at: string;
  questions: { count: number }[];
};

// The dashboard: only for logged-in users
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // proxy.ts already sends logged-out visitors to /login. This is a second check, to be safe.
  if (!data?.claims) redirect("/login");

  // The user's quizzes, newest first. RLS makes sure these are only their own.
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, language, created_at, questions(count)")
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
          {rows.map((quiz) => (
            <li key={quiz.id}>
              <Link
                href={`/quiz/${quiz.id}`}
                className="block rounded-2xl border border-zinc-200 p-5 hover:border-indigo-400 dark:border-zinc-800"
              >
                <p dir="auto" className={`font-semibold ${quiz.language === "ar" ? "font-arabic" : ""}`}>
                  {quiz.title}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {quiz.questions[0]?.count ?? 0} questions ·{" "}
                  {new Date(quiz.created_at).toLocaleDateString("en-GB")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
