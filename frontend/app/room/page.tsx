"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  ArrowLeft,
  Mic,
  Square,
  Loader2,
  Sparkles,
  ShieldAlert,
  Pill,
  ScrollText,
  CheckCircle2,
  Smartphone,
  RotateCcw,
  Stethoscope,
  Radio,
  Send,
  AlertTriangle,
  PlayCircle,
  Languages,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { TONES } from "@/components/tone";
import { cn } from "@/lib/utils";
import { useDictation } from "@/lib/use-dictation";
import { citationHref } from "@/lib/citations";
import {
  createSession,
  getSession,
  appendTranscript,
  analyzeSession,
  resetSession,
  runSessionDemo,
  warmBackend,
  API_URL,
  type SessionState,
  type SessionAnalyzeResult,
} from "@/lib/api";
import type { Tone } from "@/lib/demo-data";

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

interface Heard {
  text: string;
  conf: number;
}

export default function RoomPage() {
  // Clinical context the doctor confirms (golden path defaults).
  const [allergies, setAllergies] = useState("Penicillin");
  const [currentMeds, setCurrentMeds] = useState("Salbutamol");
  const [ageMonths, setAgeMonths] = useState("36");
  const [proposedMed, setProposedMed] = useState("Amoxicillin");

  const [session, setSession] = useState<SessionState | null>(null);
  const [creating, setCreating] = useState(false);
  const [origin, setOrigin] = useState("");
  const [heard, setHeard] = useState<Heard[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [result, setResult] = useState<SessionAnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sidRef = useRef<string | null>(null);
  sidRef.current = session?.id ?? null;

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
    // Wake a sleeping free-tier backend now, so "Start" is fast when clicked.
    warmBackend();
  }, []);

  // Stream the doctor's recognized speech into the session.
  const onFinal = useCallback((text: string, conf: number) => {
    setHeard((h) => [...h, { text, conf }]);
    const sid = sidRef.current;
    if (sid) appendTranscript(sid, "doctor", text, conf);
  }, []);
  const dictation = useDictation(onFinal, "bn-BD");

  // Poll session so the patient's "connected" + utterance count update live.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(async () => {
      const s = await getSession(session.id);
      if (s) setSession(s);
    }, 3000);
    return () => clearInterval(id);
  }, [session?.id]);

  const start = async () => {
    setCreating(true);
    setError(null);
    const s = await createSession({
      allergies: splitList(allergies),
      current_meds: splitList(currentMeds),
    });
    setCreating(false);
    if (s) {
      setSession(s);
    } else {
      setError(
        API_URL
          ? "Couldn't reach the backend — a sleeping free-tier server can take ~30s to wake. Try again."
          : "Backend URL isn't configured for this build (NEXT_PUBLIC_API_URL)."
      );
    }
  };

  const analyze = async () => {
    if (!session) return;
    dictation.stop();
    setAnalyzing(true);
    setError(null);
    const out = await analyzeSession(session.id, {
      patient: {
        allergies: splitList(allergies),
        current_meds: splitList(currentMeds),
      },
      age_months: Number(ageMonths) || 36,
      proposed_meds: splitList(proposedMed),
    });
    setAnalyzing(false);
    if (out) {
      setResult(out);
      setSession(out.session);
    } else {
      setError(
        "Analysis failed — make sure some speech was captured, then try again."
      );
    }
  };

  // One-tap golden-path replay — works with no second phone, no live ASR.
  const runDemo = async () => {
    setDemoRunning(true);
    setError(null);
    dictation.stop();
    let sess = session;
    if (!sess) {
      sess = await createSession({
        allergies: splitList(allergies),
        current_meds: splitList(currentMeds),
      });
      if (sess) setSession(sess);
    }
    if (!sess) {
      setDemoRunning(false);
      setError(
        API_URL
          ? "Couldn't reach the backend — a sleeping free-tier server can take ~30s to wake. Try again."
          : "Backend URL isn't configured for this build (NEXT_PUBLIC_API_URL)."
      );
      return;
    }
    const out = await runSessionDemo(sess.id);
    setDemoRunning(false);
    if (out) {
      setResult(out);
      setSession(out.session);
    } else {
      setError("Demo run failed — the backend may be waking. Try again in ~30s.");
    }
  };

  const newConsult = async () => {
    if (!session) return;
    dictation.stop();
    setResult(null);
    setHeard([]);
    setError(null);
    const s = await resetSession(session.id);
    if (s) setSession(s);
  };

  const qrUrl = origin && session ? `${origin}/patient?s=${session.id}` : "";

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden h-6 w-px bg-slate-200 sm:block" />
            <span className="hidden items-center gap-2 text-sm font-medium text-ink-muted sm:flex">
              <Activity className="h-4 w-4 text-brand-500" />
              Live consultation room
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip hidden bg-emerald-50 text-emerald-700 ring-emerald-200 sm:inline-flex">
              <Radio className="h-3 w-3" /> Real session · live mic
            </span>
            <Link href="/doctor" className="btn-ghost">
              Scripted demo
            </Link>
            <Link href="/" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
          </div>
        </div>
      </header>

      {/* No session yet — intro + start */}
      {!session ? (
        <section className="container-page py-12">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">
              <Radio className="h-3.5 w-3.5" /> Real · two devices · live
            </span>
            <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">
              Start a live consultation
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              This opens a real session. A QR appears — the patient scans it on
              their phone to join. Both phones listen in Bangla; Codoctor fuses
              the two transcripts, runs the agentic safety pipeline, and pushes a
              spoken Bangla summary straight to the patient&apos;s phone.
            </p>
            <p className="mt-2 text-sm text-ink-faint">
              Works best in Chrome (microphone + Bangla speech recognition).
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={start}
                disabled={creating || demoRunning}
                className="btn-primary"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening session…
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-4 w-4" /> Start live consultation
                  </>
                )}
              </button>
              <button
                onClick={runDemo}
                disabled={creating || demoRunning}
                className="btn-secondary"
              >
                {demoRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Running…
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" /> Run demo consultation
                  </>
                )}
              </button>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              No second phone? <strong className="font-semibold text-ink-soft">Run demo
              consultation</strong> replays a real pediatric case through the full
              pipeline — fusion, danger-sign + drug catches, and the spoken Bangla
              summary — deterministically.
            </p>
            {creating && (
              <p className="mt-4 text-xs text-ink-faint">
                Waking the free-tier server can take up to a minute on the first
                request — hang tight.
              </p>
            )}
            {error && (
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4" /> {error}
              </p>
            )}
          </div>
        </section>
      ) : (
        <div className="container-page grid gap-5 py-6 lg:grid-cols-12">
          {/* Left — QR + devices + context */}
          <aside className="space-y-5 lg:col-span-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-600">
                <Smartphone className="h-3.5 w-3.5" /> Patient joins here
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                  {qrUrl ? (
                    <QRCodeSVG value={qrUrl} size={104} level="M" />
                  ) : (
                    <div className="h-[104px] w-[104px]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-ink-muted">Session code</div>
                  <div className="font-mono text-2xl font-bold tracking-widest text-ink">
                    {session.id}
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-ink-faint">
                    Scan with the patient&apos;s phone to join.
                  </div>
                  {qrUrl && (
                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                    >
                      <Smartphone className="h-3 w-3" /> Open patient view ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <DevicePill
                  label="Doctor"
                  on={session.devices.doctor || dictation.listening}
                  count={session.counts.doctor}
                />
                <DevicePill
                  label="Patient phone"
                  on={session.devices.patient}
                  count={session.counts.patient}
                />
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-600">
                <Pill className="h-3.5 w-3.5" /> Clinical context
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                Confirm what ASR can&apos;t reliably hear. Defaults follow the
                pediatric IMCI golden path.
              </p>
              <MiniField label="Allergies">
                <input
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="input"
                />
              </MiniField>
              <MiniField label="Current meds">
                <input
                  value={currentMeds}
                  onChange={(e) => setCurrentMeds(e.target.value)}
                  className="input"
                />
              </MiniField>
              <div className="grid grid-cols-2 gap-3">
                <MiniField label="Age (months)">
                  <input
                    type="number"
                    value={ageMonths}
                    onChange={(e) => setAgeMonths(e.target.value)}
                    className="input"
                  />
                </MiniField>
                <MiniField label="Proposed med">
                  <input
                    value={proposedMed}
                    onChange={(e) => setProposedMed(e.target.value)}
                    className="input"
                  />
                </MiniField>
              </div>
            </div>
          </aside>

          {/* Middle — live mic + transcript */}
          <section className="lg:col-span-4">
            <div className="card flex h-[640px] flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <Mic className="h-4 w-4 text-brand-500" /> Doctor&apos;s mic
                </div>
                {dictation.supported ? (
                  <button
                    onClick={
                      dictation.listening ? dictation.stop : dictation.start
                    }
                    className={cn(
                      "chip ring-1 transition",
                      dictation.listening
                        ? "bg-red-500 text-white ring-red-500"
                        : "bg-brand-600 text-white ring-brand-600"
                    )}
                  >
                    {dictation.listening ? (
                      <>
                        <Square className="h-3 w-3 fill-white" /> Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-3 w-3" /> Listen
                      </>
                    )}
                  </button>
                ) : (
                  <span className="chip bg-amber-50 text-amber-700 ring-amber-200">
                    Use Chrome for voice
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-5">
                {heard.length === 0 && !dictation.interim ? (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Mic className="h-5 w-5" />
                    </div>
                    <p className="mt-3 max-w-xs text-sm text-ink-faint">
                      Tap <strong>Listen</strong> and speak the consultation in
                      Bangla. Each phrase streams into the session live.
                    </p>
                  </div>
                ) : (
                  <>
                    {heard.map((h, i) => (
                      <div
                        key={i}
                        className="bn animate-fade-up rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft"
                      >
                        {h.text}
                        {h.conf < 0.75 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 align-middle text-[10px] font-semibold text-amber-600">
                            <AlertTriangle className="h-2.5 w-2.5" /> low conf
                          </span>
                        )}
                      </div>
                    ))}
                    {dictation.interim && (
                      <div className="bn rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm italic text-ink-faint">
                        {dictation.interim}…
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-slate-100 px-5 py-3">
                {!result ? (
                  <div className="space-y-2">
                    <button
                      onClick={analyze}
                      disabled={analyzing || demoRunning}
                      className="btn-primary w-full"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Fusing &
                          analyzing…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Analyze & send to patient
                        </>
                      )}
                    </button>
                    <button
                      onClick={runDemo}
                      disabled={analyzing || demoRunning}
                      className="btn-ghost w-full text-xs"
                    >
                      {demoRunning ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running
                          seeded demo…
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-3.5 w-3.5" /> or replay the
                          seeded demo case
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button onClick={newConsult} className="btn-secondary w-full">
                    <RotateCcw className="h-4 w-4" /> New consultation
                  </button>
                )}
                {error && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> {error}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Right — live analysis */}
          <section className="space-y-5 lg:col-span-4">
            {!result ? (
              <div className="card flex h-[640px] flex-col items-center justify-center p-8 text-center">
                <Sparkles className="h-8 w-8 text-brand-300" />
                <p className="mt-3 max-w-xs text-sm text-ink-faint">
                  After you analyze, the grounded result appears here and the
                  patient&apos;s phone updates instantly with a spoken Bangla
                  summary.
                </p>
              </div>
            ) : (
              <RoomResult result={result} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function DevicePill({
  label,
  on,
  count,
}: {
  label: string;
  on: boolean;
  count: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl px-3 py-2 text-xs ring-1 ring-inset",
        on
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-50 text-ink-faint ring-slate-200"
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            on ? "bg-emerald-500" : "bg-slate-300"
          )}
        />
        {label}
      </span>
      <span className="font-mono">{count}</span>
    </div>
  );
}

function MiniField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function RoomResult({ result }: { result: SessionAnalyzeResult }) {
  const a = result.analysis;
  const imci = a.safety?.imci;
  const meds = a.safety?.medication ?? [];
  const recovered = result.fused_transcript.filter((s) => s.recovered).length;

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="mr-1.5 inline h-4 w-4" /> Sent to the patient&apos;s
        phone — they can listen now.{" "}
        {result.seeded && (
          <span className="font-normal text-emerald-600">(seeded demo case)</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="chip bg-indigo-50 text-indigo-700 ring-indigo-200">
          <Mic className="h-3 w-3" /> Fused 2 devices · {recovered} recovered
        </span>
        <span
          className={cn(
            "chip",
            a.grounded
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-700 ring-amber-200"
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          {a.refused ? "refused" : a.grounded ? "grounded" : "ungrounded"}
        </span>
        <span className="chip bg-brand-50 text-brand-700 ring-brand-200">
          {a.retrieval_passes} retrieval pass{a.retrieval_passes === 1 ? "" : "es"}
        </span>
      </div>

      <FusedTranscript segments={result.fused_transcript} />

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
            <p className="mt-2 text-sm text-ink-soft">
              Why: {imci.reasons.join("; ")}.
            </p>
          )}
          <p className="mt-1.5 text-sm text-ink-muted">{imci.action}</p>
          {imci.citation && <CiteChip c={imci.citation} />}
        </div>
      )}

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

      <div className="card p-5">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <Sparkles className="h-4 w-4 text-brand-500" /> Plain-Bangla summary
          (sent)
        </div>
        <p className="bn mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-ink-soft ring-1 ring-inset ring-slate-200">
          {a.answer_bn}
        </p>
        {a.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {a.citations.map((c, i) => (
              <CiteChip key={i} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FusedTranscript({
  segments,
}: {
  segments: SessionAnalyzeResult["fused_transcript"];
}) {
  if (!segments || segments.length === 0) return null;
  const totalRecovered = segments.reduce(
    (n, s) => n + (s.recovered_tokens?.length ?? 0),
    0
  );
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 font-semibold text-ink">
        <Languages className="h-4 w-4 text-brand-500" /> Fused transcript
        <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          {totalRecovered} word{totalRecovered === 1 ? "" : "s"} recovered
        </span>
      </div>
      <p className="mt-1 text-[11px] text-ink-faint">
        One high-confidence transcript reconciled from both phones. Highlighted
        words were missed by one mic and recovered from the other.
      </p>
      <div className="mt-3 space-y-2">
        {segments.map((s, i) => (
          <div
            key={i}
            className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200"
          >
            <p className="bn text-sm leading-relaxed text-ink-soft">
              {highlightRecovered(s.text, s.recovered_tokens)}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-faint">
              <span>
                {s.sources.length === 2
                  ? "both phones"
                  : `phone ${s.sources[0]}`}
              </span>
              {s.recovered && (
                <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600">
                  <Mic className="h-2.5 w-2.5" /> recovered
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Render text with the recovered tokens visually emphasized. */
function highlightRecovered(text: string, recovered?: string[]) {
  if (!recovered || recovered.length === 0) return text;
  const set = new Set(recovered);
  return text.split(/(\s+)/).map((tok, i) =>
    set.has(tok) ? (
      <mark
        key={i}
        className="rounded bg-emerald-200/70 px-0.5 font-semibold text-emerald-900"
      >
        {tok}
      </mark>
    ) : (
      <span key={i}>{tok}</span>
    )
  );
}

function CiteChip({ c }: { c: { source: string; ref: string } }) {
  const href = citationHref(c.source);
  const className =
    "mt-2 inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-ink-muted ring-1 ring-inset ring-slate-200";
  const body = (
    <>
      <ScrollText className="h-3 w-3 text-brand-500" />
      {c.source} · {c.ref}
    </>
  );
  if (!href) return <span className={className}>{body}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(className, "transition hover:text-brand-700 hover:ring-brand-300")}
      title={`Open source: ${c.source}`}
    >
      {body}
    </a>
  );
}
