"use server";

// Server actions: these run on the server when a form is submitted

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// What the login form shows after a submit
export type AuthState = {
  error?: string;
  message?: string;
  email?: string; // keeps the email in the box after an error
};

// Logs in or signs up, depending on the "mode" field in the form
export async function authenticate(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password.", email };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    if (password.length < 8) {
      return { error: "Your password needs at least 8 characters.", email };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: error.message, email };
    }
    // If "Confirm email" is turned on in Supabase, the user must click the email link first
    if (!data.session) {
      return { message: "Check your email to confirm your account, then log in.", email };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: "Wrong email or password.", email };
    }
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
