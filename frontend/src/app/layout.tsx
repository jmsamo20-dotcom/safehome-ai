import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "세이프홈 AI",
  description: "전월세 계약 리스크를 AI가 분석해 드립니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} antialiased bg-gray-50 min-h-screen`}>
        <main className="max-w-md mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
