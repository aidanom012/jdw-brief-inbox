import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "JDW Brief Builder",
  description: "Private campaign brief builder for JDW campaign builds."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ThemeScript />{children}</body>
    </html>
  );
}
