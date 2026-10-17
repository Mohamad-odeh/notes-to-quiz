"use client";

// The form on the /create page. Runs in the browser.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_TEXT = 30_000;
const MAX_FILE_MB = 10;

// The look of every box in the form, in light and dark mode
const fieldClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const tabClass = (active: boolean) =>
  `flex-1 rounded-full px-4 py-2 text-sm font-medium ${
    active ? "bg-indigo-600 text-white" : "text-zinc-600 dark:text-zinc-400"
  }`;

// Makes a photo smaller before upload: at most 1600 px on the longest side, saved as JPEG.
// Claude doesn't need more detail than that, and small files upload faster on phones.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("We couldn't read this photo."))),
      "image/jpeg",
      0.85,
    ),
  );
}

// Uploads the file into the user's own folder in the private "notes" bucket
async function uploadFile(file: File, userId: string) {
  if (file.size === 0) {
    throw new Error("This file is empty (0 bytes). Please download or save it again, then try once more.");
  }
  const isPdf = file.type === "application/pdf";
  const body = isPdf ? file : await compressImage(file);
  if (body.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`Your file is too big. The limit is ${MAX_FILE_MB} MB.`);
  }

  const path = `${userId}/${crypto.randomUUID()}.${isPdf ? "pdf" : "jpg"}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("notes")
    .upload(path, body, { contentType: isPdf ? "application/pdf" : "image/jpeg" });
  if (error) throw new Error("The upload failed. Please try again.");
  return path;
}

export default function CreateForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [source, setSource] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [types, setTypes] = useState(["multiple_choice", "true_false"]);
  const [language, setLanguage] = useState("auto");
  const [status, setStatus] = useState<"idle" | "uploading" | "generating">("idle");
  const [error, setError] = useState("");

  const busy = status !== "idle";

  function toggleType(type: string) {
    setTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (types.length === 0) return setError("Choose at least one question type.");
    if (source === "file" && !file) return setError("Please choose a PDF or a photo.");

    try {
      let sourceBody;
      if (source === "text") {
        sourceBody = { type: "text", text };
      } else {
        setStatus("uploading");
        sourceBody = { type: "file", path: await uploadFile(file!, userId) };
      }

      setStatus("generating");
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: sourceBody, title, questionCount, difficulty, types, language }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");

      router.push(`/quiz/${data.quizId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  if (busy) {
    return (
      <div role="status" className="mt-8 rounded-2xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="mt-4 font-semibold">
          {status === "uploading" ? "Uploading your file..." : "Claude is reading your notes and writing questions..."}
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">This can take up to a minute.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
      {/* 1. The material */}
      <div className="flex rounded-full border border-zinc-300 p-1 dark:border-zinc-700">
        <button type="button" onClick={() => setSource("text")} className={tabClass(source === "text")}>
          Paste text
        </button>
        <button type="button" onClick={() => setSource("file")} className={tabClass(source === "file")}>
          PDF or photo
        </button>
      </div>

      {source === "text" ? (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your notes
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            maxLength={MAX_TEXT}
            required
            dir="auto"
            placeholder="Paste your notes here..."
            className={fieldClass}
          />
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
            {text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()} characters
          </span>
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm font-medium">
          A PDF, or a photo of your notes or a textbook page (max {MAX_FILE_MB} MB)
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={`${fieldClass} file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300`}
          />
        </label>
      )}

      {/* 2. The options */}
      <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Questions
            <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className={fieldClass}>
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={fieldClass}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={fieldClass}>
              <option value="auto">Same as my notes</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </label>
        </div>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium">Question types</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={types.includes("multiple_choice")} onChange={() => toggleType("multiple_choice")} className="h-4 w-4 accent-indigo-600" />
            Multiple choice
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={types.includes("true_false")} onChange={() => toggleType("true_false")} className="h-4 w-4 accent-indigo-600" />
            True / false
          </label>
        </fieldset>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Title (optional)
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          dir="auto"
          placeholder="Leave empty and Claude will suggest one"
          className={fieldClass}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="rounded-full bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
      >
        Make my quiz
      </button>
    </form>
  );
}
