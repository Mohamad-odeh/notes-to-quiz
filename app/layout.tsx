import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";

// The main font for English text
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// The title and description shown in the browser tab and in search results
export const metadata: Metadata = {
  title: "Notes to Quiz",
  description: "Turn your study notes into a quiz with AI.",
};

// The layout wraps every page: header on top, the page in the middle, footer at the bottom
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold">
              Notes to Quiz
            </Link>
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
