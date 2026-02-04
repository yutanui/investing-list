import type { Metadata } from "next";
import { PortfolioProvider } from "@/context/portfolio-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Investing Portfolio Tracker",
  description: "Track your investment portfolio — stocks, ETFs, mutual funds, and bonds in THB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Skip to main content
        </a>
        <Header />
        <PortfolioProvider>
          <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </PortfolioProvider>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="border-b border-foreground/10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <h1 className="text-lg font-semibold tracking-tight">
          Investing Portfolio
        </h1>
      </nav>
    </header>
  );
}
