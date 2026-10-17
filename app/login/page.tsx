"use client";

// The login page. The same form does "Log in" and "Sign up".

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  // state = the result of the last submit; pending = true while waiting for the server
  const [state, formAction, pending] = useActionState<AuthState, FormData>(authenticate, {});
  const isSignup = mode === "signup";

  return (
    <section className="mx-auto max-w-sm py-12">
      <h1 className="text-2xl font-bold">{isSignup ? "Create your account" : "Log in"}</h1>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="mode" value={mode} />

        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state.email}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isSignup ? 8 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={inputClass}
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignup ? "login" : "signup")}
          className="font-medium text-indigo-600 underline dark:text-indigo-400"
        >
          {isSignup ? "Log in" : "Create an account"}
        </button>
      </p>
    </section>
  );
}
