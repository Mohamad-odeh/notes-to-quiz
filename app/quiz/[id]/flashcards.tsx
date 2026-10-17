"use client";

// Flashcards: the question on the front, the answer on the back. Tap to flip.

import { useState } from "react";
import { getLabels, type Question } from "@/lib/quiz";

const faceClass =
  "absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-2xl border p-6 text-center backface-hidden";

export default function Flashcards(props: { questions: Question[]; language: string }) {
  const { questions } = props;
  const t = getLabels(props.language);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = questions[index];

  // Move forward or back, and wrap around at the ends
  function go(step: number) {
    setFlipped(false);
    setIndex((index + step + questions.length) % questions.length);
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.cardOf(index + 1, questions.length)}</p>

      <button
        onClick={() => setFlipped(!flipped)}
        aria-label={t.tapToFlip}
        className="mt-3 block h-80 w-full perspective-distant"
      >
        <div className={`relative h-full w-full transition-transform duration-500 transform-3d ${flipped ? "rotate-y-180" : ""}`}>
          {/* Front: the question */}
          <div className={`${faceClass} border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950`}>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{card.topic}</p>
            <p className="mt-3 text-xl font-semibold">{card.question}</p>
          </div>
          {/* Back: the answer and why */}
          <div className={`${faceClass} rotate-y-180 border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950`}>
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{card.correct_answer}</p>
            <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{card.explanation}</p>
          </div>
        </div>
      </button>

      <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">{t.tapToFlip}</p>

      <div className="mt-4 flex gap-3">
        <button onClick={() => go(-1)} className="flex-1 rounded-full border border-zinc-300 px-6 py-3 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
          {t.previous}
        </button>
        <button onClick={() => go(1)} className="flex-1 rounded-full bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700">
          {t.nextCard}
        </button>
      </div>
    </div>
  );
}
