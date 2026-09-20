import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { manrope } from "@/lib/design/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "financeX — Personal finance",
  description: "Track income, expenses, savings, and budgets",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F3F1F9] font-[family-name:var(--font-manrope)] text-[#1C1B29]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
