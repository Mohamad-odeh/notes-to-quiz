import type { Metadata } from "next";
import Link from "next/link";
import { Geist, IBM_Plex_Sans_Arabic } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import "./globals.css";

// The main font for English text
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// The font for Arabic quizzes (used with the "font-arabic" class)
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

// The title and description shown in the browser tab and in search results
export const metadata: Metadata = {
  title: "Notes to Quiz",
  description: "Turn your study notes into a quiz with AI.",
};

// The layout wraps every page: header on top, the page in the middle, footer at the bottom
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Check if someone is logged in, to show the right links in the header
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${plexArabic.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold">
              Notes to Quiz
            </Link>

            {isLoggedIn ? (
              <div className="flex items-center gap-4 text-sm font-medium">
                <Link href="/create">New quiz</Link>
                <Link href="/dashboard">Dashboard</Link>
                <form action={logout}>
                  <button type="submit" className="text-zinc-600 hover:underline dark:text-zinc-400">
                    Log out
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-medium">
                Log in
              </Link>
            )}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4">{children}</main>

        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <p className="mx-auto max-w-3xl px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Built by Mohamad Odeh · AI by Claude
          </p>
        </footer>
      </body>
    </html>
  );
}
