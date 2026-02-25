import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "부부계산 포털",
  description: "키워드 검색량, 네이버 SEO 블로그, 견적 계산을 한 곳에서",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
