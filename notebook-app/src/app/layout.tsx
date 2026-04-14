import type { Metadata } from "next";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Task Notebook",
  description: "Full-stack task management notebook with MongoDB, JWT auth, and drag-and-drop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full bg-bg text-ink">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
