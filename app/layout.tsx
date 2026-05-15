import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aneeminen veikkauskisasivusto",
  description: "Private World Cup 2026 prediction contest for friends."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
