import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@devmentor/ui/globals.css";

export const metadata: Metadata = {
  title: {
    default: "DevMentor Admin",
    template: "%s · DevMentor Admin",
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b px-6 py-4">
          <span className="font-semibold">DevMentor Admin</span>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
