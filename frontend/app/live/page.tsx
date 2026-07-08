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
  Upload,
  FileText,
  Activity,
  Share2,
  Copy,
  Brain,
  Scale,
  ClipboardList,
  X,
} from "lucide-react";
import { SCENARIOS, type DemoScenario } from "@/lib/scenarios";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TONES } from "@/components/tone";
import { cn } from "@/lib/utils";
import {
  analyzeConsultation,
  extractReport,
  estimateDose,
  reconcileMeds,
  livePrompts,
  API_URL,
  type ConsultResult,
  type ReportExtract,
  type DoseResult,
  type ReconcileResult,
  type LivePrompts,
} from "@/lib/api";
import { citationHref } from "@/lib/citations";
import type { Tone } from "@/lib/demo-data";

const DANGER_OPTIONS = [
  { key: "not_able_to_drink_or_breastfeed", label: "Can't drink / breastfeed" },
  { key: "vomits_everything", label: "Vomits everything" },
  { key: "convulsions", label: "Convulsions" },
  { key: "lethargic_or_unconscious", label: "Lethargic / unconscious" },
];

function splitList(s: string): string[] {
  return s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
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
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setTranscript(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.abort(); } catch {} };
  }, [lang]);

  const start = () => { try { setTranscript(""); recRef.current?.start(); setListening(true); } catch {} };
  const stop = () => { try { recRef.current?.stop(); } catch {} setListening(false); };
  return { listening, supported, transcript, start, stop };
}

export default function LivePage() {
  const [ageMonths, setAgeMonths] = useState("36");
  const [weightKg, setWeightKg] = useState("12");
  const [symptoms, setSymptoms] = useState("fever, cough");
  const [respiratoryRate, setRespiratoryRate] = useState("52");
  const [chestIndrawing, setChestIndrawing] = useState(true);
  const [dangerSigns, setDangerSigns] = useState<string[]>([]);
  const [proposedMed, setProposedMed] = useState("Amoxicillin");
  const [allergies, setAllergies] = useState("Penicillin");
  const [currentMeds, setCurrentMeds] = useState("Salbutamol");
  const [scriptsOpen, setScriptsOpen] = useState(false);

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ConsultResult | null>(null);

  const [report, setReport] = useState<ReportExtract | null>(null);
  const [uploading, setUploading] = useState(false);
  const [doses, setDoses] = useState<DoseResult[]>([]);
  const [reconcile, setReconcile] = useState<ReconcileResult | null>(null);
  const [live, setLive] = useState<LivePrompts | null>(null);
  const [copied, setCopied] = useState(false);

  // RR tap-counter
  const [rrOpen, setRrOpen] = useState(false);
  const [rrCount, setRrCount] = useState(0);
  const [rrElapsed, setRrElapsed] = useState(0);
  const rrTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const speech = useSpeech("bn-BD");
  const age = Number(ageMonths) || 36;

  useEffect(() => {
    if (speech.transcript) setSymptoms((s) => (s ? s + ", " : "") + speech.transcript);
  }, [speech.transcript]);

  // ── #2 live co-pilot: while dictating, ask the next question (incl. allergy screening)
  useEffect(() => {
    if (!speech.listening) return;
    let stop = false;
    const tick = async () => {
      const text = `${symptoms} ${proposedMed}`.trim();
      const p = await livePrompts(text, age, splitList(allergies), splitList(currentMeds));
      if (!stop && p) setLive(p);
    };
    void tick();
    const id = setInterval(tick, 5000);
    return () => { stop = true; clearInterval(id); };
  }, [speech.listening]);

  const toggleDanger = (k: string) =>
    setDangerSigns((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));

  // ── report upload → vision extraction ───────────────────────────────────────
  const onUpload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    const ex = await extractReport(file);
    setUploading(false);
    if (!ex) return;
    setReport(ex);
    if (ex.allergies.length) setAllergies((a) => mergeCsv(a, ex.allergies));
    if (ex.conditions.length) setSymptoms((s) => mergeCsv(s, ex.conditions));
  };

  // ── RR tap counter ───────────────────────────────────────────────────────────
  const rrTap = () => {
    if (rrElapsed === 0 && !rrTimer.current) {
      rrTimer.current = setInterval(() => {
        setRrElapsed((e) => {
          if (e + 1 >= 60) { if (rrTimer.current) { clearInterval(rrTimer.current); rrTimer.current = null; } return 60; }
          return e + 1;
        });
      }, 1000);
    }
    if (rrElapsed < 60) setRrCount((c) => c + 1);
  };
  const rr = rrElapsed > 0 ? Math.round((rrCount / rrElapsed) * 60) : 0;
  const rrReset = () => { if (rrTimer.current) { clearInterval(rrTimer.current); rrTimer.current = null; } setRrCount(0); setRrElapsed(0); };
  const rrUse = () => { setRespiratoryRate(String(rr)); setRrOpen(false); rrReset(); };

  const analyze = async () => {
    setStatus("loading");
    setResult(null); setDoses([]); setReconcile(null);
    const proposed = splitList(proposedMed);
    const payload = {
      patient: { allergies: splitList(allergies), current_meds: splitList(currentMeds) },
      encounter: {
        age_months: age,
        symptoms: splitList(symptoms),
        vitals: (respiratoryRate ? { respiratory_rate: Number(respiratoryRate) } : {}) as Record<string, number>,
        chest_indrawing: chestIndrawing,
        general_danger_signs: dangerSigns,
        proposed_meds: proposed,
      },
    };
    const res = await analyzeConsultation(payload, 35000);
    if (!res) { setStatus("error"); return; }
    setResult(res);
    setStatus("done");

    // #5 dosing + #4 reconciliation (parallel, best-effort)
    const w = Number(weightKg) || undefined;
    Promise.all(proposed.map((d) => estimateDose(d, w, age))).then((ds) =>
      setDoses(ds.filter((d): d is DoseResult => !!d && d.known))
    );
    if (report?.medications.length || splitList(currentMeds).length) {
      reconcileMeds({
        proposed, allergies: splitList(allergies),
        current_meds: splitList(currentMeds), past_meds: report?.medications ?? [],
      }).then((r) => r && setReconcile(r));
    }
  };

  const applyScenario = (s: DemoScenario) => {
    setAgeMonths(s.form.ageMonths);
    setWeightKg(s.form.weightKg);
    setSymptoms(s.form.symptoms);
    setRespiratoryRate(s.form.respiratoryRate);
    setChestIndrawing(s.form.chestIndrawing);
    setDangerSigns(s.form.dangerSigns);
    setProposedMed(s.form.proposedMed);
    setAllergies(s.form.allergies);
    setCurrentMeds(s.form.currentMeds);
    setResult(null);
    setStatus("idle");
    setDoses([]);
    setReconcile(null);
    setReport(null);
    setLive(null);
    setScriptsOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shareText = result
    ? buildShareText(result, proposedMed)
    : "";
  const doShare = async () => {
    if ((navigator as any).share) {
      try { await (navigator as any).share({ text: shareText, title: "Codoctor — রোগীর রেকর্ড" }); return; } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div>
      <SiteHeader />
      <section className="container-page py-12">
        <div className="max-w-2xl">
          <span className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> Live · powered by the real backend</span>
          <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Consultation</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            Speak in <strong className="font-semibold text-ink-soft">Bangla</strong> or type; attach a
            previous report; and Codoctor&apos;s agents return a grounded, cited assessment — with the
            questions to ask before you prescribe. Runs the deployed backend live.
          </p>
        </div>

        <button onClick={() => setScriptsOpen(true)} className="btn-secondary mt-5">
          <ClipboardList className="h-4 w-4" /> Demo scripts for judges · {SCENARIOS.length} cases
        </button>

        {scriptsOpen && <ScenarioPanel onClose={() => setScriptsOpen(false)} onUse={applyScenario} />}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* -------------------------------------------------------- input */}
          <div className="card h-fit p-6">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age (months)"><input type="number" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} className="input" /></Field>
              <Field label="Weight (kg)"><input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="input" /></Field>
            </div>

            <Field label="Symptoms">
              <div className="flex gap-2">
                <input value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="fever, cough, fast breathing…" className="input flex-1" />
                {speech.supported && (
                  <button type="button" onClick={speech.listening ? speech.stop : speech.start}
                    className={cn("flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl transition",
                      speech.listening ? "bg-red-500 text-white" : "bg-brand-600 text-white hover:bg-brand-700")}
                    title="Speak in Bangla">
                    {speech.listening ? <Square className="h-4 w-4 fill-white" /> : <Mic className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ink-faint">
                <Languages className="h-3 w-3" />
                {speech.supported ? (speech.listening ? "Listening… speak in Bangla" : "Tap the mic to dictate in Bangla (Chrome)") : "Voice needs Chrome; type instead."}
              </p>
            </Field>

            {/* live co-pilot while dictating */}
            {speech.listening && live && (live.ask_these.length > 0 || live.red_flags.length > 0) && (
              <div className="mt-3 rounded-xl bg-indigo-50 p-3 ring-1 ring-inset ring-indigo-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                  <Brain className="h-3.5 w-3.5" /> Co-pilot
                </div>
                {live.red_flags.map((r, i) => (
                  <p key={`r${i}`} className="mt-1 text-sm font-medium text-red-700">🔴 {r.title} — {r.detail}</p>
                ))}
                {live.ask_these.map((q, i) => (
                  <p key={`a${i}`} className="mt-1 bn text-sm text-ink-soft">❓ {q.bn} <span className="text-ink-faint">· {q.en}</span></p>
                ))}
              </div>
            )}

            <Field label="Respiratory rate (breaths/min)">
              <div className="flex gap-2">
                <input type="number" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} className="input flex-1" />
                <button type="button" onClick={() => { setRrOpen((v) => !v); rrReset(); }}
                  className="flex h-[42px] shrink-0 items-center gap-1 rounded-xl bg-brand-50 px-3 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-100">
                  <Activity className="h-3.5 w-3.5" /> Measure
                </button>
              </div>
              {rrOpen && (
                <div className="mt-2 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                  <p className="text-[11px] text-ink-muted">Tap once for every breath you see. Aim for 60s.</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" onClick={rrTap} className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white active:scale-95">
                      <span className="text-lg font-bold">{rrCount}</span>
                    </button>
                    <div className="text-xs text-ink-soft">
                      <div>{60 - rrElapsed}s left</div>
                      <div className="text-base font-bold text-brand-700">{rr || "—"}/min</div>
                    </div>
                    <button type="button" onClick={rrUse} disabled={rrCount === 0 || rrElapsed < 10}
                      className="ml-auto rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Use {rr}</button>
                  </div>
                </div>
              )}
            </Field>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">Lower chest indrawing</span>
              <button type="button" onClick={() => setChestIndrawing((v) => !v)}
                className={cn("relative h-6 w-11 rounded-full transition", chestIndrawing ? "bg-brand-600" : "bg-slate-300")}>
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", chestIndrawing ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>

            <Field label="General danger signs">
              <div className="flex flex-wrap gap-2">
                {DANGER_OPTIONS.map((o) => (
                  <button key={o.key} type="button" onClick={() => toggleDanger(o.key)}
                    className={cn("chip ring-1 transition", dangerSigns.includes(o.key) ? "bg-red-600 text-white ring-red-600" : "bg-white text-ink-muted ring-slate-200 hover:ring-red-300")}>
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Proposed medicine"><input value={proposedMed} onChange={(e) => setProposedMed(e.target.value)} className="input" /></Field>
              <Field label="Allergies"><input value={allergies} onChange={(e) => setAllergies(e.target.value)} className="input" /></Field>
            </div>
            <Field label="Current medicines"><input value={currentMeds} onChange={(e) => setCurrentMeds(e.target.value)} placeholder="e.g. Salbutamol, Tizanidine" className="input" /></Field>

            {/* report upload */}
            <Field label="Previous report (optional)">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-ink-muted hover:border-brand-300 hover:text-brand-700">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading…</> : <><Upload className="h-4 w-4" /> Photo or PDF — the AI reads the history</>}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} disabled={uploading} />
              </label>
              {report && (
                <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs ring-1 ring-inset ring-slate-200">
                  <div className="flex items-center gap-1.5 font-semibold text-ink"><FileText className="h-3.5 w-3.5 text-brand-500" /> From the report</div>
                  {report.summary_bn && <p className="bn mt-1 text-ink-soft">{report.summary_bn}</p>}
                  {report.medications.length > 0 && <p className="mt-1 text-ink-muted">Meds: {report.medications.join(", ")}</p>}
                  {report.allergies.length > 0 && <p className="text-ink-muted">Allergies: {report.allergies.join(", ")}</p>}
                </div>
              )}
            </Field>

            <button onClick={analyze} disabled={status === "loading"} className="btn-primary mt-6 w-full">
              {status === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Stethoscope className="h-4 w-4" /> Analyze with live agents</>}
            </button>
          </div>

          {/* ------------------------------------------------------- result */}
          <div className="space-y-4">
            {status === "idle" && (
              <div className="card flex h-full min-h-[20rem] flex-col items-center justify-center p-8 text-center">
                <Sparkles className="h-8 w-8 text-brand-300" />
                <p className="mt-3 max-w-xs text-sm text-ink-faint">The grounded, cited result from the live agentic orchestrator will appear here.</p>
              </div>
            )}
            {status === "loading" && (
              <div className="card flex h-full min-h-[20rem] flex-col items-center justify-center p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                <p className="mt-3 text-sm text-ink-muted">Running retrieve → tools → critic → synthesize…</p>
              </div>
            )}
            {status === "error" && (
              <div className="card p-6">
                <div className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-5 w-5" /><span className="font-semibold">Couldn&apos;t reach the backend</span></div>
                <p className="mt-2 text-sm text-ink-muted">{API_URL ? "Something went wrong — try again in a moment." : "Backend URL is not configured for this build."}</p>
                <button onClick={analyze} className="btn-secondary mt-4">Try again</button>
              </div>
            )}
            {status === "done" && result && (
              <>
                <ResultView result={result} />
                {doses.length > 0 && <DoseCard doses={doses} weight={weightKg} />}
                {reconcile && reconcile.notes.length > 0 && <ReconcileCard r={reconcile} />}
                <div className="card p-5">
                  <div className="flex items-center gap-2 font-semibold text-ink"><Share2 className="h-4 w-4 text-brand-500" /> Share record with the patient</div>
                  <p className="mt-2 text-xs text-ink-muted">A Bangla record (diagnosis · advice · prescription) — send via WhatsApp/SMS.</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={doShare} className="btn-primary flex-1"><Share2 className="h-4 w-4" /> Share</button>
                    <button onClick={doCopy} className="btn-secondary"><Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function mergeCsv(existing: string, add: string[]): string {
  const have = new Set(existing.split(/[,\n]/).map((s) => s.trim().toLowerCase()).filter(Boolean));
  const merged = existing.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  add.forEach((a) => { if (a && !have.has(a.toLowerCase())) { merged.push(a); have.add(a.toLowerCase()); } });
  return merged.join(", ");
}

function buildShareText(r: ConsultResult, prescription: string): string {
  const lines = ["🩺 Codoctor — রোগীর রেকর্ড", ""];
  if (r.safety?.imci?.classification) lines.push(`রোগ: ${r.safety.imci.classification}`);
  if (r.answer_bn) lines.push(r.answer_bn);
  lines.push("", `ওষুধ / প্রেসক্রিপশন: ${prescription || "—"}`);
  lines.push("", "পরামর্শমূলক; লাইসেন্সপ্রাপ্ত ডাক্তারের সিদ্ধান্তই চূড়ান্ত।");
  return lines.join("\n");
}

function ScenarioPanel({ onClose, onUse }: { onClose: () => void; onUse: (s: DemoScenario) => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
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
              Tap <strong>Use this case</strong> to fill the form, then <strong>Analyze</strong> — or read
              the Bangla dialogue aloud (or into the mic) to reproduce it.
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</label>
      {children}
    </div>
  );
}

const CONF_STYLE: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  moderate: "bg-slate-100 text-ink-muted ring-slate-200",
  low: "bg-amber-50 text-amber-700 ring-amber-200",
  insufficient: "bg-amber-50 text-amber-700 ring-amber-200",
};

function ResultView({ result }: { result: ConsultResult }) {
  const imci = result.safety?.imci;
  const meds = result.safety?.medication ?? [];
  const missing = result.missing_data ?? [];

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap gap-2">
        {result.confidence && (
          <span className={cn("chip", CONF_STYLE[result.confidence] ?? CONF_STYLE.moderate)}>
            confidence: {result.confidence}
          </span>
        )}
        <span className={cn("chip", result.grounded ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200")}>
          <CheckCircle2 className="h-3 w-3" />
          {result.refused ? "refused (insufficient data)" : result.grounded ? "grounded" : "ungrounded"}
        </span>
        <span className="chip bg-brand-50 text-brand-700 ring-brand-200">{result.retrieval_passes} retrieval pass{result.retrieval_passes === 1 ? "" : "es"}</span>
        <span className="chip bg-slate-100 text-ink-muted ring-slate-200">{result.llm_narration ? "LLM narration" : "deterministic narration"}</span>
      </div>

      {/* #6/#2 ask these before deciding (incl. drug-allergy screening) */}
      {missing.length > 0 && (
        <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <div className="flex items-center gap-2 font-semibold text-amber-800"><Brain className="h-4 w-4" /> Ask these before you decide</div>
          <ul className="mt-3 space-y-1.5">
            {missing.map((m, i) => (
              <li key={i} className="text-sm">
                <span className="bn text-ink-soft">{m.bn}</span> <span className="text-ink-muted">· {m.en}</span>
                {m.citation && <CiteChip c={m.citation} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {imci && (
        <div className={cn("rounded-2xl p-5 ring-1", TONES[toneForSeverity(imci.severity)].softBg, TONES[toneForSeverity(imci.severity)].ring)}>
          <div className="flex items-center gap-2">
            <ShieldAlert className={cn("h-5 w-5", TONES[toneForSeverity(imci.severity)].text)} />
            <span className={cn("font-bold", TONES[toneForSeverity(imci.severity)].strongText)}>{imci.classification}</span>
            {imci.refer && <span className="chip ml-auto bg-red-600 text-white ring-red-600">refer</span>}
          </div>
          {imci.reasons?.length > 0 && <p className="mt-2 text-sm text-ink-soft">Why: {imci.reasons.join("; ")}.</p>}
          <p className="mt-1.5 text-sm text-ink-muted">{imci.action}</p>
          {imci.citation && <CiteChip c={imci.citation} />}
        </div>
      )}

      {meds.map((m, i) => (
        <div key={i} className={cn("rounded-2xl p-5 ring-1", TONES[toneForSeverity(m.severity)].softBg, TONES[toneForSeverity(m.severity)].ring)}>
          <div className="flex items-center gap-2">
            <Pill className={cn("h-5 w-5", TONES[toneForSeverity(m.severity)].text)} />
            <span className="font-bold text-ink">{m.drug?.toUpperCase()}</span>
            <span className="chip ml-auto bg-white text-ink-muted ring-slate-200">{m.type}</span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{m.reason}</p>
          {m.citation && <CiteChip c={m.citation} />}
        </div>
      ))}

      {result.differential && result.differential.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 font-semibold text-ink"><Sparkles className="h-4 w-4 text-brand-500" /> Differential — consider</div>
          <ol className="mt-3 space-y-2">
            {result.differential.map((d, i) => (
              <li key={i} className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                  <span className="font-semibold text-ink-soft">{d.condition}</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">{d.rationale}</p>
                {d.citation && <CiteChip c={d.citation} />}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center gap-2 font-semibold text-ink"><Languages className="h-4 w-4 text-brand-500" /> Plain-language summary</div>
        <p className="bn mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-ink-soft ring-1 ring-inset ring-slate-200">{result.answer_bn}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">{result.answer_en}</p>
        {result.citations.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{result.citations.map((c, i) => <CiteChip key={i} c={c} />)}</div>}
      </div>

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-ink"><Sparkles className="mr-1 inline h-4 w-4 text-brand-500" /> Agent reasoning trace ({result.trace.length} steps)</summary>
        <ol className="mt-3 space-y-2">
          {result.trace.map((t, i) => (
            <li key={i} className="flex gap-2 text-xs">
              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", t.status === "critical" ? "bg-red-500" : t.status === "flag" ? "bg-amber-500" : t.status === "ok" ? "bg-emerald-500" : "bg-slate-400")} />
              <div><span className="font-semibold text-ink-soft">{t.agent}</span> <span className="text-ink-muted">— {t.title}</span><p className="text-ink-faint">{t.detail}</p></div>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function DoseCard({ doses, weight }: { doses: DoseResult[]; weight: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 font-semibold text-ink"><Scale className="h-4 w-4 text-brand-500" /> Weight-based dose ({weight} kg)</div>
      <ul className="mt-3 space-y-2">
        {doses.map((d, i) => (
          <li key={i} className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
            <div className="font-semibold text-ink-soft">{d.drug}</div>
            <p className="text-xs text-ink-muted">
              {d.per_dose_mg ? `${d.per_dose_mg[0]}–${d.per_dose_mg[1]} mg/dose · ${d.frequency_per_day}×/day. ` : ""}
              {d.note}
            </p>
            {d.citation && <CiteChip c={d.citation} />}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ink-faint">Advisory — confirm before giving.</p>
    </div>
  );
}

function ReconcileCard({ r }: { r: ReconcileResult }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 font-semibold text-ink"><FileText className="h-4 w-4 text-brand-500" /> Reconciliation with history</div>
      <ul className="mt-3 space-y-2">
        {r.notes.map((n, i) => (
          <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm text-ink-soft ring-1 ring-inset ring-slate-200">
            {n.type === "stewardship" ? "💊 " : "↩️ "}{n.reason}
            {n.citation && <CiteChip c={n.citation} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CiteChip({ c }: { c: { source: string; ref: string } }) {
  const href = citationHref(c.source);
  const className = "mt-2 inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-ink-muted ring-1 ring-inset ring-slate-200";
  const body = (<><ScrollText className="h-3 w-3 text-brand-500" />{c.source} · {c.ref}</>);
  if (!href) return <span className={className}>{body}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn(className, "transition hover:text-brand-700 hover:ring-brand-300")} title={`Open source: ${c.source}`}>{body}</a>
  );
}
