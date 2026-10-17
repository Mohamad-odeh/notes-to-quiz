import Link from "next/link";
import { notFound } from "next/navigation";
import { getLabels, type Question } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";
import Flashcards from "./flashcards";
import QuizPlayer from "./quiz-player";

// One of the user's quizzes, in two modes: /quiz/[id] (take the quiz) or /quiz/[id]?mode=flashcards
export default async function QuizPage(props: PageProps<"/quiz/[id]">) {
  const { id } = await props.params;
  const { mode } = await props.searchParams;
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
  const t = getLabels(quiz.language);
  const isFlashcards = mode === "flashcards";
  const tabClass = (active: boolean) =>
    `flex-1 rounded-full px-4 py-2 text-center text-sm font-medium ${
      active ? "bg-indigo-600 text-white" : "text-zinc-600 dark:text-zinc-400"
    }`;

  return (
    <section className="py-8">
      <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
        ← Back to dashboard
      </Link>

      {/* Arabic quizzes read right-to-left, in the Arabic font */}
      <div dir={isArabic ? "rtl" : "ltr"} lang={quiz.language} className={`mx-auto max-w-xl ${isArabic ? "font-arabic" : ""}`}>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{quiz.title}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {questions.length} {t.questions} · {t.difficulty[quiz.difficulty as "easy" | "medium" | "hard"]}
        </p>

        <nav className="mt-6 flex rounded-full border border-zinc-300 p-1 dark:border-zinc-700">
          <Link href={`/quiz/${id}`} className={tabClass(!isFlashcards)}>
            {t.quiz}
          </Link>
          <Link href={`/quiz/${id}?mode=flashcards`} className={tabClass(isFlashcards)}>
            {t.flashcards}
          </Link>
        </nav>

        {isFlashcards ? (
          <Flashcards questions={questions} language={quiz.language} />
        ) : (
          <QuizPlayer quizId={id} questions={questions} language={quiz.language} />
        )}
      </div>
    </section>
  );
}
