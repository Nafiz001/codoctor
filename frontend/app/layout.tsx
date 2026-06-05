import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bangla = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bangla",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Codoctor — ambient Bangla clinical co-pilot",
    template: "%s · Codoctor",
  },
  description:
    "A second pair of ears in every consultation. Codoctor listens, cross-checks against official clinical guidelines with citations, and makes sure no danger sign is missed — built for Bangladesh's overloaded OPDs.",
  keywords: [
    "Codoctor",
    "clinical AI",
    "Bangla",
    "RAG",
    "multi-agent",
    "SciBlitz AI Challenge",
    "healthcare Bangladesh",
    "ambient clinical scribe",
  ],
  authors: [{ name: "Codoctor" }],
  openGraph: {
    title: "Codoctor — ambient Bangla clinical co-pilot",
    description:
      "Listens to the consultation, cross-checks official guidelines with citations, and makes sure no danger sign is missed.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${bangla.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
