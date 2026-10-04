import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quater | Automated Indian Court Case Update Notifications",
  description:
    "Automated eCourtsIndia case snapshot retrieval, change detection pipeline, and Meta WhatsApp Cloud notifications for lawyers and clients.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
        <Navbar />
        <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-8">
          {children}
        </main>
        <footer className="border-t border-neutral-200 bg-neutral-50 py-5 text-xs text-neutral-500">
          <div className="w-full px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
            <span>
              QUATER / Automated Indian Court Monitoring & WhatsApp Dispatch
            </span>
            <span className="text-neutral-400">
              eCourts Partner API · WhatsApp QR Gateway · Deduplication Active
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
