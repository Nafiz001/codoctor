import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, Hind_Siliguri } from "next/font/google";
import "./globals.css";

// Warm serif display — gives headlines real character (not the AI-default sans).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

// Friendly humanist sans for UI/body.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const bangla = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bangla",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Codoctor — a second pair of ears in every consultation",
    template: "%s · Codoctor",
  },
  description:
    "An ambient Bangla clinical co-pilot for Bangladesh's overloaded OPDs. Codoctor listens, cross-checks official clinical guidelines with citations, and makes sure no danger sign is missed.",
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
  authors: [{ name: "Team Logarithm" }],
  openGraph: {
    title: "Codoctor — a second pair of ears in every consultation",
    description:
      "Listens to the consultation, cross-checks official guidelines with citations, and makes sure no danger sign is missed.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FBF7F0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${bangla.variable}`}
    >
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
