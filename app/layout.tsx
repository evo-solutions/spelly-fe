import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shadowing Practice",
  description: "Interactive shadowing and pronunciation practice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b1120] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
