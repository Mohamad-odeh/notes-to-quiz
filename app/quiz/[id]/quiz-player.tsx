"use client";

// Takes the quiz one question at a time, then shows the score and the mistakes.

import Link from "next/link";
import { useState } from "react";
import { getLabels, type Question } from "@/lib/quiz";
import { saveAttempt } from "./actions";

type Answer = { question_id: string; answer: string; correct: boolean };

// The colour of an answer button, before and after the student answers
function optionClass(option: string, question: Question, chosen?: string) {
  const base = "w-full rounded-xl border px-4 py-3 text-start transition-colors";
  if (!chosen) return `${base} border-zinc-300 hover:border-indigo-500 hover:bg-indigo-50 dark:border-zinc-700 dark:hover:bg-indigo-950`;
  if (option === question.correct_answer) {
    return `${base} border-green-600 bg-green-50 font-medium text-green-800 dark:bg-green-950 dark:text-green-300`;
  }
  if (option === chosen) return `${base} border-red-600 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300`;
  return `${base} border-zinc-200 opacity-60 dark:border-zinc-800`;
}

export default function QuizPlayer(props: { quizId: string; questions: Question[]; language: string }) {
  const { quizId, questions } = props;
  const t = getLabels(props.language);

  const [index, setIndex] = useState(0); // which question we're on
  const [answers, setAnswers] = useState<Answer[]>([]); // one answer per question so far
  const [finished, setFinished] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [saveError, setSaveError] = useState("");

  const question = questions[index];
  const current = answers[index]; // the answer to this question, once chosen
  const score = answers.filter((a) => a.correct).length;
  const isLast = index === questions.length - 1;

  function choose(option: string) {
    if (current) return; // you can only answer once
    setAnswers([...answers, { question_id: question.id, answer: option, correct: option === question.correct_answer }]);
  }

  async function next() {
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    setFinished(true);
    // Only the answers go to the server; it works out the score itself
    const result = await saveAttempt(quizId, answers.map(({ question_id, answer }) => ({ question_id, answer })));
    if ("error" in result) setSaveError(t.saveError);
  }

  function restart() {
    setIndex(0);
    setAnswers([]);
    setFinished(false);
    setShowReview(false);
    setSaveError("");
  }

  // ----- The results screen -----
  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    const mistakes = questions.filter((_, i) => !answers[i]?.correct);
    const message = percent === 100 ? t.perfect : percent >= 70 ? t.great : t.keepGoing;

    return (
      <div className="mt-6 flex flex-col gap-6">
        <div className="rounded-2xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{t.yourScore}</p>
          <p className="mt-2 text-5xl font-bold">
            {score} / {questions.length}
          </p>
          <p className="mt-1 text-lg text-indigo-600 dark:text-indigo-400">{percent}%</p>
          <p className="mt-4 font-medium">{message}</p>
          {saveError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {mistakes.length > 0 && (
            <button onClick={() => setShowReview(!showReview)} className="flex-1 rounded-full bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700">
              {showReview ? t.hideReview : t.review}
            </button>
          )}
          <button onClick={restart} className="flex-1 rounded-full border border-zinc-300 px-6 py-3 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            {t.tryAgain}
          </button>
          <Link href="/dashboard" className="flex-1 rounded-full border border-zinc-300 px-6 py-3 text-center font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            {t.backToDashboard}
          </Link>
        </div>

        {showReview && (
          <ol className="flex flex-col gap-4">
            {mistakes.map((q) => (
              <li key={q.id} className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{q.topic}</p>
                <p className="mt-1 font-semibold">{q.question}</p>
                <p className="mt-3 text-sm text-red-700 dark:text-red-400">
                  {t.yourAnswer} {answers.find((a) => a.question_id === q.id)?.answer}
                </p>
                <p className="mt-1 text-sm font-medium text-green-700 dark:text-green-400">
                  {t.correctAnswerIs} {q.correct_answer}
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{q.explanation}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  // ----- One question -----
  const progress = ((index + (current ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <span>{t.questionOf(index + 1, questions.length)}</span>
        <span className="text-xs text-indigo-600 dark:text-indigo-400">{question.topic}</span>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <h2 className="mt-6 text-xl font-semibold">{question.question}</h2>

      <div className="mt-4 flex flex-col gap-3">
        {question.options.map((option) => (
          <button key={option} onClick={() => choose(option)} disabled={!!current} className={optionClass(option, question, current?.answer)}>
            {option}
          </button>
        ))}
      </div>

      {/* Feedback after answering. aria-live makes screen readers read it out. */}
      <div aria-live="polite">
        {current && (
          <div className="mt-6 rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900">
            <p className={`font-semibold ${current.correct ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
              {current.correct ? t.correct : t.wrong}
            </p>
            {!current.correct && (
              <p className="mt-1 text-sm">
                {t.correctAnswerIs} <strong>{question.correct_answer}</strong>
              </p>
            )}
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{question.explanation}</p>
            <button onClick={next} className="mt-4 w-full rounded-full bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700">
              {isLast ? t.finish : t.next}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
