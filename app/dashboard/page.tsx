import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The dashboard: only for logged-in users
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // proxy.ts already sends logged-out visitors to /login. This is a second check, to be safe.
  if (!data?.claims) redirect("/login");

  return (
    <section className="py-12">
      <h1 className="text-3xl font-bold">Your dashboard</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Logged in as {data.claims.email}</p>

      <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        You don&apos;t have any quizzes yet. Making quizzes is coming next!
      </p>
    </section>
  );
}
