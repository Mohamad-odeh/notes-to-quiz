import { createBrowserClient } from "@supabase/ssr";

// Creates a Supabase client for code that runs in the browser (for example, file uploads).
// It only uses the publishable key, so Row Level Security still protects every request.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
