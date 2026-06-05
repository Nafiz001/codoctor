import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" fill="none" className="h-[62%] w-[62%]">
        {/* listening arcs */}
        <path
          d="M21 9a10 10 0 0 1 0 14"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M24.5 6a15.5 15.5 0 0 1 0 20"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.45"
        />
        {/* clinical plus */}
        <rect x="7" y="13.4" width="13" height="5.2" rx="2.6" fill="white" />
        <rect x="10.9" y="9.5" width="5.2" height="13" rx="2.6" fill="white" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:scale-105" />
      <span className="text-lg font-bold tracking-tight text-ink">
        Co<span className="text-brand-600">doctor</span>
      </span>
    </Link>
  );
}
