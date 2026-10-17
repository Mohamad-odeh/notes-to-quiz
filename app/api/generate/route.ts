// POST /api/generate - turns the student's material into a quiz with Claude, then saves it.
// Called by the form on the /create page.

import { NextResponse } from "next/server";
import { z } from "zod";
import { aiErrorMessage, generateQuiz, type Material } from "@/lib/claude";
import { createClient } from "@/lib/supabase/server";

// Some hosts stop slow requests early. This asks for up to 5 minutes.
export const maxDuration = 300;

const MIN_TEXT = 100;
const MAX_TEXT = 30_000;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// What the form must send
const RequestSchema = z.object({
  source: z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), text: z.string() }),
    z.object({ type: z.literal("file"), path: z.string() }),
  ]),
  title: z.string().max(200),
  questionCount: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  types: z.array(z.enum(["multiple_choice", "true_false"])).min(1).max(2),
  language: z.enum(["auto", "en", "ar"]),
});

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  // 1. Only logged-in users
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("Please log in first.", 401);

  // 2. Check the form data
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Something is wrong with the form. Please check it and try again.", 400);
  const body = parsed.data;
  const source = body.source;

  if (source.type === "text") {
    const length = source.text.trim().length;
    if (length < MIN_TEXT) return fail("Please paste a bit more text (at least a few sentences).", 400);
    if (length > MAX_TEXT) return fail("Your text is too long. The limit is 30,000 characters.", 400);
  } else if (!source.path.startsWith(`${userId}/`)) {
    return fail("File not found. Please upload it again.", 400);
  }

  // 3. Daily limit: count this user's quiz requests in the last 24 hours
  const limit = Number(process.env.DAILY_QUIZ_LIMIT) || 15;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (countError) return fail("Something went wrong. Please try again.", 500);
  if ((count ?? 0) >= limit) {
    return fail(`You've reached the limit of ${limit} quizzes per day. Please come back tomorrow.`, 429);
  }

  // 4. Get the material ready for Claude
  let material: Material;
  if (source.type === "text") {
    material = { kind: "text", text: source.text.trim() };
  } else {
    const { data: file, error } = await supabase.storage.from("notes").download(source.path);
    if (error || !file) return fail("We couldn't read your file. Please upload it again.", 400);
    if (file.size === 0) return fail("This file is empty (0 bytes). Please save it again and try once more.", 400);
    if (file.size > MAX_FILE_BYTES) return fail("Your file is too big. The limit is 10 MB.", 400);

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const extension = source.path.split(".").pop()?.toLowerCase();
    if (extension === "pdf") material = { kind: "pdf", base64 };
    else if (extension === "png") material = { kind: "image", base64, mediaType: "image/png" };
    else if (extension === "webp") material = { kind: "image", base64, mediaType: "image/webp" };
    else material = { kind: "image", base64, mediaType: "image/jpeg" };

    // We don't keep uploaded files: delete it now that we have it in memory
    await supabase.storage.from("notes").remove([source.path]);
  }

  // 5. Log the request (this counts toward the daily limit), then ask Claude
  const { error: logError } = await supabase.from("generations").insert({ user_id: userId });
  if (logError) return fail("Something went wrong. Please try again.", 500);

  let result;
  try {
    result = await generateQuiz(material, {
      questionCount: body.questionCount,
      difficulty: body.difficulty,
      types: body.types,
      language: body.language,
    });
  } catch (error) {
    return fail(aiErrorMessage(error), 503);
  }
  if (!result.ok) return fail(result.message, 422);

  // 6. Save the quiz and its questions
  const quiz = result.quiz;
  const { data: saved, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      user_id: userId,
      title: body.title.trim() || quiz.title.slice(0, 200),
      source_type: material.kind,
      language: quiz.language,
      difficulty: body.difficulty,
    })
    .select("id")
    .single();
  if (quizError || !saved) return fail("We couldn't save your quiz. Please try again.", 500);

  const { error: questionsError } = await supabase.from("questions").insert(
    quiz.questions.map((question, index) => ({ ...question, quiz_id: saved.id, position: index + 1 })),
  );
  if (questionsError) {
    await supabase.from("quizzes").delete().eq("id", saved.id);
    return fail("We couldn't save your quiz. Please try again.", 500);
  }

  return NextResponse.json({ quizId: saved.id });
}
