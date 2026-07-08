import Link from "next/link";
import { UserRound, Stethoscope, ArrowRight } from "lucide-react";
import { Logo } from "./logo";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#agents", label: "The agents" },
  { href: "/doctor", label: "Scripted demo" },
  { href: "/live", label: "Voice check" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:text-brand-700"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/patient" className="btn-secondary">
            <UserRound className="h-4 w-4" /> Patient
          </Link>
          <Link href="/room" className="btn-primary">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Start consultation</span>
            <span className="sm:hidden">Consult</span>
            <ArrowRight className="hidden h-4 w-4 sm:inline" />
          </Link>
        </div>
      </div>
    </header>
  );
}
