import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "工具狂",
  description: "工具狂 - 各类实用小工具集合",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.png" alt="工具狂" width={28} height={28} priority />
                <span className="text-base font-semibold tracking-wide">工具狂</span>
              </Link>

              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/"
                  className="rounded-full px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                >
                  工资计算器
                </Link>
                <span className="rounded-full px-3 py-1.5 text-slate-400">更多工具（敬请期待）</span>
              </nav>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl px-4 py-8">
            <div className="flex gap-6">
              <aside className="hidden w-56 shrink-0 md:block">
                <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="px-2 pb-2 text-xs font-medium text-slate-500">工具</div>
                  <Link
                    href="/"
                    className="block rounded-xl px-3 py-2 text-sm text-teal-700 bg-teal-50 border border-teal-100"
                  >
                    工资计算器
                  </Link>
                  <div className="mt-1 block rounded-xl px-3 py-2 text-sm text-slate-400">
                    更多工具（敬请期待）
                  </div>
                </div>
              </aside>

              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
