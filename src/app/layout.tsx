import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CONCORD — Group Trip Negotiator",
  description:
    "Conflict-resolving multi-agent group travel planner powered by Gemma 4 and deterministic constraint optimization.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-background text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
