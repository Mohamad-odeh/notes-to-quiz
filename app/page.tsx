// The landing page: the first thing visitors see at "/"

import Link from "next/link";

// The three "How it works" steps. Each one becomes a card below.
const steps = [
  {
    title: "Add your notes",
    text: "Paste text, upload a PDF, or take a photo of your notes or a textbook page.",
  },
  {
    title: "Get a quiz",
    text: "Claude writes multiple-choice and true/false questions in English or Arabic.",
  },
  {
    title: "Learn from mistakes",
    text: "After each question, see the right answer and a short explanation.",
  },
];

export default function Home() {
  return (
    <>
      {/* Top section: the main message */}
      <section className="py-16 text-center sm:py-24">
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          For Tawjihi, BTEC and IGCSE students
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Turn your notes into a quiz
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Re-reading feels like studying, but testing yourself works much
          better. Notes to Quiz writes the questions for you, so you can start
          practising in minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Get started
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-zinc-300 px-6 py-3 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* How it works: one card per step */}
      <section id="how-it-works" className="pb-16">
        <h2 className="text-center text-2xl font-bold">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {index + 1}
              </span>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
