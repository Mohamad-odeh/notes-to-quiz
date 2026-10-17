import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can visit without logging in. Everything else needs an account.
const PUBLIC_PATHS = ["/", "/login", "/privacy"];

function isPublic(pathname: string) {
  // Shared quiz links (/q/...) are public too
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/q/");
}

// Runs before every page (see proxy.ts in the project root).
// 1. Refreshes the login session so users stay logged in.
// 2. Sends logged-out visitors to /login, and logged-in users away from /login.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Stop browsers and servers from caching pages that carry login cookies
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Checks the login and refreshes it if needed. Keep this right after createServerClient.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  // API routes (/api/...) check the login themselves and reply with an error instead
  if (!isLoggedIn && !isPublic(pathname) && !pathname.startsWith("/api/")) {
    return redirectKeepingCookies(request, response, "/login");
  }
  if (isLoggedIn && pathname === "/login") {
    return redirectKeepingCookies(request, response, "/dashboard");
  }
  return response;
}

// A redirect must carry over any refreshed login cookies, or the user gets logged out
function redirectKeepingCookies(request: NextRequest, response: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";

  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((key) => {
    const value = response.headers.get(key);
    if (value) redirect.headers.set(key, value);
  });
  return redirect;
}
