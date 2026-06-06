"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Sparkles,
  Stethoscope,
  ScrollText,
  ShieldAlert,
  Pill,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Languages,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TONES } from "@/components/tone";
import { cn } from "@/lib/utils";
import { analyzeConsultation, API_URL, type ConsultResult } from "@/lib/api";
import type { Tone } from "@/lib/demo-data";

const DANGER_OPTIONS = [
  { key: "not_able_to_drink_or_breastfeed", label: "Can't drink / breastfeed" },
  { key: "vomits_everything", label: "Vomits everything" },
  { key: "convulsions", label: "Convulsions" },
  { key: "lethargic_or_unconscious", label: "Lethargic / unconscious" },
];

function splitList(s: string): string[] {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function toneForSeverity(sev: string): Tone {
  if (sev === "critical") return "red";
  if (sev === "moderate" || sev === "caution") return "amber";
  if (sev === "low") return "emerald";
  return "slate";
}

/** Browser Web Speech API — keyless Bangla speech-to-text (best on Chrome). */
function useSpeech(lang = "bn-BD") {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setTranscript(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {}
    };
  }, [lang]);

  const start = () => {
    try {
      setTranscript("");
      recRef.current?.start();
      setListening(true);
    } catch {}
  };
  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  };

  return { listening, supported, transcript, start, stop };
}

export default function LivePage() {
  const [ageMonths, setAgeMonths] = useState("36");
  const [symptoms, setSymptoms] = useState("fever, cough");
  const [respiratoryRate, setRespiratoryRate] = useState("52");
  const [chestIndrawing, setChestIndrawing] = useState(true);
  const [dangerSigns, setDangerSigns] = useState<string[]>([]);
  const [proposedMed, setProposedMed] = useState("Amoxicillin");
  const [allergies, setAllergies] = useState("Penicillin");

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ConsultResult | null>(null);

  const speech = useSpeech("bn-BD");

  // Append voice transcript into the symptoms field.
  useEffect(() => {
    if (speech.transcript) {
      setSymptoms((s) => (s ? s + ", " : "") + speech.transcript);
    }
  }, [speech.transcript]);

  const toggleDanger = (k: string) =>
    setDangerSigns((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));

  const analyze = async () => {
    setStatus("loading");
    setResult(null);
    const payload = {
      patient: { allergies: splitList(allergies), current_meds: [] },
      encounter: {
        age_months: Number(ageMonths) || 36,
        symptoms: splitList(symptoms),
        vitals: (respiratoryRate
          ? { respiratory_rate: Number(respiratoryRate) }
          : {}) as Record<string, number>,
        chest_indrawing: chestIndrawing,
        general_danger_signs: dangerSigns,
        proposed_meds: splitList(proposedMed),
      },
    };
    const res = await analyzeConsultation(payload, 35000);
    if (res) {
      setResult(res);
      setStatus("done");
    } else {
      setStatus("error");
    }
  };

  return (
    <div>
      <SiteHeader />

      <section className="container-page py-12">
        <div className="max-w-2xl">
          <span className="eyebrow">
            <Sparkles className="h-3.5 w-3.5" /> Live · powered by the real backend
          </span>
          <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">
            Quick check
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            Type — or <strong className="font-semibold text-ink-soft">speak in Bangla</strong> —
            a child&apos;s symptoms, and Codoctor&apos;s agentic orchestrator returns a
            grounded, cited assessment. This calls the deployed backend live.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* -------------------------------------------------------- input */}
          <div className="card h-fit p-6">
            <Field label="Child age (months)">
              <input
                type="number"
                value={ageMonths}
                onChange={(e) => setAgeMonths(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Symptoms">
              <div className="flex gap-2">
                <input
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="fever, cough, fast breathing…"
                  className="input flex-1"
                />
                {speech.supported && (
                  <button
                    type="button"
                    onClick={speech.listening ? speech.stop : speech.start}
                    className={cn(
                      "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl transition",
                      speech.listening
                        ? "bg-red-500 text-white"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    )}
                    title="Speak in Bangla"
                  >
                    {speech.listening ? (
                      <Square className="h-4 w-4 fill-white" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              {speech.supported ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ink-faint">
                  <Languages className="h-3 w-3" />
                  {speech.listening
                    ? "Listening… speak in Bangla"
                    : "Tap the mic to dictate in Bangla (Chrome)"}
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  Voice input needs Chrome; type symptoms instead.
                </p>
              )}
            </Field>

            <Field label="Respiratory rate (breaths/min)">
              <input
                type="number"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value)}
                className="input"
              />
            </Field>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">
                Lower chest indrawing
              </span>
              <button
                type="button"
                onClick={() => setChestIndrawing((v) => !v)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition",
                  chestIndrawing ? "bg-brand-600" : "bg-slate-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                    chestIndrawing ? "left-[22px]" : "left-0.5"
                  )}
                />
              </button>
            </div>

            <Field label="General danger signs">
              <div className="flex flex-wrap gap-2">
                {DANGER_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => toggleDanger(o.key)}
                    className={cn(
                      "chip ring-1 transition",
                      dangerSigns.includes(o.key)
                        ? "bg-red-600 text-white ring-red-600"
                        : "bg-white text-ink-muted ring-slate-200 hover:ring-red-300"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Proposed medicine">
                <input
                  value={proposedMed}
                  onChange={(e) => setProposedMed(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Allergies">
                <input
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <button
              onClick={analyze}
              disabled={status === "loading"}
              className="btn-primary mt-6 w-full"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Stethoscope className="h-4 w-4" /> Analyze with live agents
                </>
              )}
            </button>
          </div>

          {/* ------------------------------------------------------- result */}
          <div className="space-y-4">
            {status === "idle" && (
              <div className="card flex h-full min-h-[20rem] flex-col items-center justify-center p-8 text-center">
                <Sparkles className="h-8 w-8 text-brand-300" />
                <p className="mt-3 max-w-xs text-sm text-ink-faint">
                  The grounded, cited result from the live agentic orchestrator will
                  appear here.
                </p>
              </div>
            )}

            {status === "loading" && (
              <div className="card flex h-full min-h-[20rem] flex-col items-center justify-center p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                <p className="mt-3 text-sm text-ink-muted">
                  Running retrieve → tools → critic → synthesize…
                </p>
                <p className="mt-1 text-[11px] text-ink-faint">
                  A sleeping free-tier backend can take ~30s to wake the first time.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="card p-6">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Couldn&apos;t reach the backend</span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  {API_URL
                    ? "The free-tier server may be waking up — try again in ~30 seconds."
                    : "Backend URL is not configured for this build."}
                </p>
                <button onClick={analyze} className="btn-secondary mt-4">
                  Try again
                </button>
              </div>
            )}

            {status === "done" && result && <ResultView result={result} />}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function ResultView({ result }: { result: ConsultResult }) {
  const imci = result.safety?.imci;
  const meds = result.safety?.medication ?? [];

  return (
    <div className="space-y-4 animate-fade-up">
      {/* status badges */}
      <div className="flex flex-wrap gap-2">
        <span
          className={cn(
            "chip",
            result.grounded
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-700 ring-amber-200"
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          {result.refused ? "refused (insufficient data)" : result.grounded ? "grounded" : "ungrounded"}
        </span>
        <span className="chip bg-brand-50 text-brand-700 ring-brand-200">
          {result.retrieval_passes} retrieval pass
          {result.retrieval_passes === 1 ? "" : "es"}
        </span>
        <span className="chip bg-slate-100 text-ink-muted ring-slate-200">
          {result.llm_narration ? "LLM narration" : "deterministic narration"}
        </span>
      </div>

      {/* IMCI classification */}
      {imci && (
        <div
          className={cn(
            "rounded-2xl p-5 ring-1",
            TONES[toneForSeverity(imci.severity)].softBg,
            TONES[toneForSeverity(imci.severity)].ring
          )}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert
              className={cn("h-5 w-5", TONES[toneForSeverity(imci.severity)].text)}
            />
            <span
              className={cn(
                "font-bold",
                TONES[toneForSeverity(imci.severity)].strongText
              )}
            >
              {imci.classification}
            </span>
            {imci.refer && (
              <span className="chip ml-auto bg-red-600 text-white ring-red-600">
                refer
              </span>
            )}
          </div>
          {imci.reasons?.length > 0 && (
            <p className="mt-2 text-sm text-ink-soft">Why: {imci.reasons.join("; ")}.</p>
          )}
          <p className="mt-1.5 text-sm text-ink-muted">{imci.action}</p>
          {imci.citation && <CiteChip c={imci.citation} />}
        </div>
      )}

      {/* medication findings */}
      {meds.map((m, i) => (
        <div
          key={i}
          className={cn(
            "rounded-2xl p-5 ring-1",
            TONES[toneForSeverity(m.severity)].softBg,
            TONES[toneForSeverity(m.severity)].ring
          )}
        >
          <div className="flex items-center gap-2">
            <Pill className={cn("h-5 w-5", TONES[toneForSeverity(m.severity)].text)} />
            <span className="font-bold text-ink">{m.drug?.toUpperCase()}</span>
            <span className="chip ml-auto bg-white text-ink-muted ring-slate-200">
              {m.type}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{m.reason}</p>
          {m.citation && <CiteChip c={m.citation} />}
        </div>
      ))}

      {/* differential */}
      {result.differential && result.differential.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-brand-500" /> Differential — consider
          </div>
          <ol className="mt-3 space-y-2">
            {result.differential.map((d, i) => (
              <li
                key={i}
                className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-ink-soft">{d.condition}</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">{d.rationale}</p>
                {d.citation && <CiteChip c={d.citation} />}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[11px] text-ink-faint">
            Conditions to consider — not a diagnosis. The clinician decides.
          </p>
        </div>
      )}

      {/* completeness */}
      {result.completeness &&
        ((result.completeness.also_check?.length ?? 0) > 0 ||
          (result.completeness.confirmed?.length ?? 0) > 0) && (
          <div className="card p-5">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <CheckCircle2 className="h-4 w-4 text-brand-500" /> IMCI assessment
              checklist
            </div>
            {result.completeness.confirmed &&
              result.completeness.confirmed.length > 0 && (
                <div className="mt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                    Confirmed
                  </div>
                  <ul className="mt-1 space-y-1">
                    {result.completeness.confirmed.map((c, i) => (
                      <li key={i} className="flex gap-1.5 text-sm text-ink-soft">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            {result.completeness.also_check &&
              result.completeness.also_check.length > 0 && (
                <div className="mt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                    Also check (guideline-recommended)
                  </div>
                  <ul className="mt-1 space-y-1">
                    {result.completeness.also_check.map((c, i) => (
                      <li key={i} className="flex gap-1.5 text-sm text-ink-soft">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            {result.completeness.citation && (
              <CiteChip c={result.completeness.citation} />
            )}
          </div>
        )}

      {/* grounded answer */}
      <div className="card p-5">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <Languages className="h-4 w-4 text-brand-500" /> Plain-language summary
        </div>
        <p className="bn mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-ink-soft ring-1 ring-inset ring-slate-200">
          {result.answer_bn}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">{result.answer_en}</p>
        {result.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.citations.map((c, i) => (
              <CiteChip key={i} c={c} />
            ))}
          </div>
        )}
      </div>

      {/* agent trace */}
      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-ink">
          <Sparkles className="mr-1 inline h-4 w-4 text-brand-500" />
          Agent reasoning trace ({result.trace.length} steps)
        </summary>
        <ol className="mt-3 space-y-2">
          {result.trace.map((t, i) => (
            <li key={i} className="flex gap-2 text-xs">
              <span
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  t.status === "critical"
                    ? "bg-red-500"
                    : t.status === "flag"
                    ? "bg-amber-500"
                    : t.status === "ok"
                    ? "bg-emerald-500"
                    : "bg-slate-400"
                )}
              />
              <div>
                <span className="font-semibold text-ink-soft">{t.agent}</span>{" "}
                <span className="text-ink-muted">— {t.title}</span>
                <p className="text-ink-faint">{t.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function CiteChip({ c }: { c: { source: string; ref: string } }) {
  return (
    <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-ink-muted ring-1 ring-inset ring-slate-200">
      <ScrollText className="h-3 w-3 text-brand-500" />
      {c.source} · {c.ref}
    </span>
  );
}
