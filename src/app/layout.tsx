import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from "@/components/tracker/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trackr-money.vercel.app"),
  title: "Trackr - AI Voice Expense Tracker | Smart Money Management",
  description: "Voice-first, AI-assisted spending & income tracker with smart categorization. Auto-detects your currency and language — just speak and track. Free, private, and works offline.",
  keywords: ["expense tracker", "budget app", "voice input", "AI finance", "money tracker", "personal finance", "50/30/20 rule", "lending tracker", "savings goals", "voice expense tracker", "bangla expense tracker", "multi-currency tracker"],
  authors: [{ name: "Trackr" }],
  creator: "Trackr",
  publisher: "Trackr",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 } },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://trackr-money.vercel.app",
    siteName: "Trackr",
    title: "Trackr - AI Voice Expense Tracker",
    description: "Just speak and track. AI-powered expense tracker that auto-detects your currency and language. Free forever.",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Trackr - AI Voice Expense Tracker" }],
  },
  twitter: {
    card: "summary",
    title: "Trackr - AI Voice Expense Tracker",
    description: "Just speak and track. AI-powered expense tracker that auto-detects your currency and language.",
    images: ["/icons/icon-512.png"],
  },
  other: {
    "theme-color": "#10b981",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
