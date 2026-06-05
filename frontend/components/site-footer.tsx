import { ShieldCheck } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/50">
      <div className="container-page py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              An ambient Bangla clinical co-pilot for Bangladesh&apos;s
              overloaded OPDs. A second pair of ears, so nothing is missed.
            </p>
          </div>
          <div className="text-sm text-ink-muted">
            <p className="font-semibold text-ink-soft">
              SciBlitz AI Challenge 2026
            </p>
            <p className="mt-1">IEEE Student Branch, CUET</p>
            <p>Track A — Health &amp; Society</p>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200/70 pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
            Advisory &amp; non-diagnostic — the clinician is always the
            decision-maker.
          </span>
          <span>© 2026 Codoctor.</span>
        </div>
      </div>
    </footer>
  );
}
