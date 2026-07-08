"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCENARIOS, type DemoScenario } from "@/lib/scenarios";

/** Judge-facing demo scripts: 6 reproducible cases with dialogue + expected
 *  result. "Use this case" loads it. Shared by /room and /live. */
export function ScenarioPanel({
  onClose,
  onUse,
}: {
  onClose: () => void;
  onUse: (s: DemoScenario) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl bg-slate-50 p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Demo scripts for judges</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Tap <strong>Use this case</strong> to load it (deterministic — no mic needed), or read
              the Bangla dialogue aloud to reproduce it live.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-muted hover:bg-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {SCENARIOS.map((s, i) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                    Case {i + 1}
                  </div>
                  <h3 className="text-base font-bold text-ink">{s.title}</h3>
                </div>
                <button onClick={() => onUse(s)} className="btn-primary shrink-0 text-sm">
                  Use this case
                </button>
              </div>
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                <strong>Expected:</strong> {s.expect}
              </p>
              <div className="mt-3 space-y-1.5">
                {s.dialogue.map((l, j) => (
                  <div
                    key={j}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      l.who === "doctor" ? "bg-brand-50" : "bg-slate-100"
                    )}
                  >
                    <span
                      className={cn(
                        "mr-2 text-[10px] font-bold uppercase",
                        l.who === "doctor" ? "text-brand-600" : "text-ink-muted"
                      )}
                    >
                      {l.who}
                    </span>
                    <span className="bn text-ink-soft">{l.bn}</span>
                    <span className="ml-1.5 text-xs text-ink-faint">· {l.en}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
