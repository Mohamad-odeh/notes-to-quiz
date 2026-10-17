import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Question = {
  id: string;
  type: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
};

// Shows one of the user's quizzes. For now it lists every question with its answer.
// (Taking the quiz one question at a time comes in Phase 4.)
export default async function QuizPage(props: PageProps<"/quiz/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  // Row Level Security makes sure this only finds the user's OWN quiz
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("title, language, difficulty, questions(id, type, question, options, correct_answer, explanation, topic)")
    .eq("id", id)
    .order("position", { referencedTable: "questions" })
    .maybeSingle();
  if (!quiz) notFound();

  const questions: Question[] = quiz.questions;
  const isArabic = quiz.language === "ar";

  return (
    <section className="py-12">
      <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
        ← Back to dashboard
      </Link>

      {/* Arabic quizzes read right-to-left, in the Arabic font */}
      <div dir={isArabic ? "rtl" : "ltr"} lang={quiz.language} className={isArabic ? "font-arabic" : ""}>
        <h1 className="mt-4 text-3xl font-bold">{quiz.title}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {questions.length} questions · {quiz.difficulty}
        </p>

        <ol className="mt-8 flex flex-col gap-4">
          {questions.map((q, index) => (
            <li key={q.id} className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {index + 1} · {q.topic}
              </p>
              <p className="mt-1 font-semibold">{q.question}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {q.options.map((option) => {
                  const correct = option === q.correct_answer;
                  return (
                    <li
                      key={option}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        correct
                          ? "border-green-600 bg-green-50 font-medium text-green-800 dark:bg-green-950 dark:text-green-300"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {correct ? "✓ " : ""}
                      {option}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{q.explanation}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
