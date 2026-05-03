import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "團隊經費管理工具",
  description: "Team Budget Management Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
