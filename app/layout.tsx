import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://ppg-bp-evidence-atlas.hankzdw.chatgpt.site"),
  title: "PPG·BP Evidence Atlas｜无袖带血压研究审计库",
  description: "检索 PPG 与无袖带血压论文，核对部署路径、校准方式和数据泄露风险。",
  openGraph: {
    title: "PPG·BP Evidence Atlas",
    description: "无袖带血压研究审计库",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "PPG·BP Evidence Atlas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PPG·BP Evidence Atlas",
    description: "无袖带血压研究审计库",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
