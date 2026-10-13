import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Inter } from "next/font/google";
import "./globals.css";

// Self-hosted by next/font: no request to Google at runtime and no layout shift.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DocIntel — Answers from your documents",
    template: "%s · DocIntel",
  },
  description: "Upload your documents and ask questions. DocIntel answers with citations to the exact passages it used.",
  applicationName: "DocIntel",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${hanken.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
