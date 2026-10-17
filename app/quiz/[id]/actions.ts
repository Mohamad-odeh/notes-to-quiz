"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AnswersSchema = z
  .array(z.object({ question_id: z.string().max(100), answer: z.string().max(1000) }))
  .max(50);

// Saves a finished quiz attempt.
// The score is worked out HERE, on the server, from the real answers in the database,
// so nobody can send a fake score from the browser.
export async function saveAttempt(quizId: string, answers: unknown) {
  const parsed = AnswersSchema.safeParse(answers);
  if (!parsed.success) return { error: "Invalid answers." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { error: "Please log in again." };

  // RLS only returns questions from the user's own quiz
  const { data: questions } = await supabase
    .from("questions")
    .select("id, correct_answer")
    .eq("quiz_id", quizId);
  if (!questions?.length) return { error: "Quiz not found." };

  const correctAnswers = new Map(questions.map((q) => [q.id, q.correct_answer]));
  const checked = parsed.data
    .filter((a) => correctAnswers.has(a.question_id))
    .map((a) => ({ ...a, correct: correctAnswers.get(a.question_id) === a.answer }));
  const score = checked.filter((a) => a.correct).length;

  const { error } = await supabase.from("attempts").insert({
    quiz_id: quizId,
    user_id: userId,
    score,
    total: questions.length,
    answers: checked,
  });
  if (error) return { error: "We couldn't save your score." };

  return { score, total: questions.length };
}
