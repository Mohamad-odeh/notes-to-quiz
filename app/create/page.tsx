import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateForm from "./create-form";

// The "Create a quiz" page. The form itself is in create-form.tsx.
export default async function CreatePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <section className="py-12">
      <h1 className="text-3xl font-bold">Create a quiz</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Add your notes, choose your options, and Claude will write the questions.
      </p>
      {/* The user id is needed to upload files into the user's own folder */}
      <CreateForm userId={data.claims.sub} />
    </section>
  );
}
