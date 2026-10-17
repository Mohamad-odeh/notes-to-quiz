import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js runs this before every request that matches `config.matcher` below
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on every path except Next.js build files and images
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
