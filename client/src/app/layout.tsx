import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "MonopolyBattle — Học Thuyết Độc Quyền",
  description: "Trò chơi mô phỏng tương tác thực tế về độc quyền và vai trò điều tiết của Nhà nước trong Kinh tế Chính trị.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">{children}</body>
    </html>
  );
}
