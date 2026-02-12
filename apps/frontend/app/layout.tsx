import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { RoleToggle } from "@/components/RoleToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MaintenanceBot - RAG + Work Orders",
  description: "Multi-site maintenance operations assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-2">
              <Navigation />
              <RoleToggle />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
