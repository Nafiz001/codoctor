"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Pill,
  Mic,
  ScrollText,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ArrowRight,
  ArrowLeft,
  User,
  Activity,
  Sparkles,
  Languages,
  Cloud,
  CloudOff,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { TONES } from "@/components/tone";
import { cn, fmtTime } from "@/lib/utils";
import {
  PATIENT,
  TRANSCRIPT,
  AGENT_EVENTS,
  AGENT_BY_KEY,
  DANGER_ALERT,
  MEDSAFETY_ALERT,
  SOAP_NOTE,
  DEVICE_A,
  DEVICE_B,
  type AgentEvent,
  type TranscriptLine,
} from "@/lib/demo-data";
import {
  analyzeFromTranscript,
  API_URL,
  type FromTranscriptResult,
} from "@/lib/api";

const LAST = TRANSCRIPT[TRANSCRIPT.length - 1].id;
const STEP_MS = 2000;

// The same case the scripted consultation walks through — sent to the live backend.
const LIVE_PAYLOAD = {
  patient: { allergies: ["Penicillin"], current_meds: ["Salbutamol"] },
  device_a: DEVICE_A,
  device_b: DEVICE_B,
  age_months: 36,
};

export default function DoctorPage() {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [qrUrl, setQrUrl] = useState("/patient");
  const [live, setLive] = useState<FromTranscriptResult | null>(null);
  const [liveState, setLiveState] = useState<"idle" | "loading" | "live" | "demo">(
    "idle"
  );

  const done = cursor >= LAST;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQrUrl(window.location.origin + "/patient");
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCursor((c) => (c >= LAST ? c : c + 1));
    }, STEP_MS);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (cursor >= LAST) setPlaying(false);
  }, [cursor]);

  // When the consultation finishes, call the live backend (falls back to demo).
  useEffect(() => {
    if (!done || liveState !== "idle") return;
    setLiveState("loading");
    analyzeFromTranscript(LIVE_PAYLOAD).then((res) => {
      if (res) {
        setLive(res);
        setLiveState("live");
      } else {
        setLiveState("demo");
      }
    });
  }, [done, liveState]);

  const onPrimary = () => {
    if (done) {
      setCursor(0);
      setConfirmed(false);
      setLive(null);
      setLiveState("idle");
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };
  const onStep = () => {
    setPlaying(false);
    setCursor((c) => Math.min(LAST, c + 1));
  };
  const onRestart = () => {
    setPlaying(false);
    setCursor(0);
    setConfirmed(false);
    setLive(null);
    setLiveState("idle");
  };

  const runLive = () => {
    setLiveState("loading");
    analyzeFromTranscript(LIVE_PAYLOAD).then((res) => {
      if (res) {
        setLive(res);
        setLiveState("live");
      } else {
        setLiveState("demo");
      }
    });
  };

  const lines = TRANSCRIPT.filter((l) => l.id <= cursor);
  const events = AGENT_EVENTS.filter((e) => e.afterLine <= cursor);
  const showDanger = cursor >= 8;
  const showMed = cursor >= 9;

  const primaryLabel = done
    ? "Replay"
    : playing
    ? "Pause"
    : cursor === 0
    ? "Play consultation"
    : "Resume";
  const PrimaryIcon = done ? RotateCcw : playing ? Pause : Play;

  return (
    <div className="min-h-screen pb-16">
      {/* App bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden h-6 w-px bg-slate-200 sm:block" />
            <span className="hidden items-center gap-2 text-sm font-medium text-ink-muted sm:flex">
              <Activity className="h-4 w-4 text-brand-500" />
              Consultation cockpit
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip hidden bg-brand-50 text-brand-700 ring-brand-200 sm:inline-flex">
              <Sparkles className="h-3 w-3" /> Demo mode · scripted
            </span>
            <Link href="/room" className="btn-secondary">
              <Activity className="h-4 w-4" /> Go live
            </Link>
            <Link href="/" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
          </div>
        </div>
      </header>

      {/* Transport controls */}
      <div className="border-b border-slate-200/70 bg-white/60">
        <div className="container-page flex flex-wrap items-center gap-3 py-3">
          <button onClick={onPrimary} className="btn-primary min-w-[12rem]">
            <PrimaryIcon className="h-4 w-4" />
            {primaryLabel}
          </button>
          <button onClick={onStep} disabled={done} className="btn-secondary">
            Step <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={onRestart} className="btn-ghost">
            <RotateCcw className="h-4 w-4" /> Restart
          </button>

          <div className="ml-auto flex items-center gap-3">
            {playing && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                Recording
              </span>
            )}
            <span className="text-xs font-medium text-ink-faint">
              {cursor}/{LAST}
            </span>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${(cursor / LAST) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cockpit grid */}
      <div className="container-page grid gap-5 py-6 lg:grid-cols-12">
        {/* Left — patient context */}
        <aside className="space-y-5 lg:col-span-3">
          <PatientCard qrUrl={qrUrl} />
          <CaptureCard fused={lines.some((l) => l.fused)} />
        </aside>

        {/* Middle — transcript */}
        <section className="lg:col-span-5">
          <TranscriptPanel lines={lines} empty={cursor === 0} />
        </section>

        {/* Right — reasoning + alerts + note */}
        <section className="space-y-5 lg:col-span-4">
          {showDanger && <DangerCard />}
          {showMed && <MedSafetyCard />}
          <ReasoningPanel events={events} empty={cursor === 0} />
          {done && (
            <SoapCard confirmed={confirmed} onConfirm={() => setConfirmed(true)} />
          )}
          {done && (
            <LiveAnalysisCard state={liveState} result={live} onRetry={runLive} />
          )}
        </section>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- patient context */

function PatientCard({ qrUrl }: { qrUrl: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-600">
        <User className="h-3.5 w-3.5" /> Patient record
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
          <User className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold text-ink">
            {PATIENT.name} · {PATIENT.age}
          </div>
          <div className="bn text-xs text-ink-muted">
            {PATIENT.nameBn} · {PATIENT.ageBn}
          </div>
        </div>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        <Row label="Allergies" danger>
          {PATIENT.allergies.join(", ")}
        </Row>
        <Row label="Chronic">{PATIENT.chronic.join(", ")}</Row>
        <Row label="Current meds">{PATIENT.meds.join(", ")}</Row>
        <Row label="Last visit">
          {PATIENT.lastVisit.date} — {PATIENT.lastVisit.reason}
        </Row>
      </dl>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
        <div className="rounded-lg bg-white p-1.5 ring-1 ring-slate-200">
          <QRCodeSVG value={qrUrl} size={64} bgColor="#ffffff" fgColor="#0f172a" level="M" />
        </div>
        <div className="text-xs leading-relaxed text-ink-muted">
          <span className="font-semibold text-ink-soft">Scan to join.</span> The
          patient opens their view & spoken summary on their phone.
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd
        className={cn(
          "text-right font-medium",
          danger ? "text-red-600" : "text-ink-soft"
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function CaptureCard({ fused }: { fused: boolean }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-600">
        <Mic className="h-3.5 w-3.5" /> Dual-device capture
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        {[0.5, 0.8, 0.4, 1, 0.6, 0.9, 0.5, 0.75, 0.45].map((h, i) => (
          <span
            key={i}
            className={cn(
              "w-1.5 rounded-full",
              fused ? "bg-brand-400 animate-wave" : "bg-slate-200"
            )}
            style={{ height: `${h * 28}px`, animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        Two phones transcribe in parallel; Codoctor reconciles them into one
        high-confidence transcript — if one mic misses a word, the other fills
        it.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ transcript */

function TranscriptPanel({
  lines,
  empty,
}: {
  lines: TranscriptLine[];
  empty: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="card flex h-[640px] flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <Languages className="h-4 w-4 text-brand-500" /> Live transcript
        </div>
        <span className="bn chip bg-slate-100 text-ink-muted ring-slate-200">
          বাংলা · fused
        </span>
      </div>
      <div ref={ref} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {empty ? (
          <EmptyHint
            icon={Mic}
            text="Press Play to begin the consultation. Two devices start listening."
          />
        ) : (
          lines.map((l) => <Bubble key={l.id} line={l} />)
        )}
      </div>
    </div>
  );
}

function Bubble({ line }: { line: TranscriptLine }) {
  const isDoctor = line.speaker === "doctor";
  const lowConf = line.conf < 0.75;
  return (
    <div className={cn("flex animate-fade-up", isDoctor ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[88%]", isDoctor ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isDoctor
              ? "rounded-tr-sm bg-brand-600 text-white"
              : "rounded-tl-sm bg-slate-100 text-ink-soft"
          )}
        >
          <div className="bn text-sm leading-relaxed">{line.bn}</div>
          <div
            className={cn(
              "mt-1 text-[11px] italic",
              isDoctor ? "text-brand-100" : "text-ink-faint"
            )}
          >
            {line.en}
          </div>
        </div>
        <div
          className={cn(
            "mt-1 flex items-center gap-2 px-1 text-[10px] text-ink-faint",
            isDoctor ? "justify-end" : "justify-start"
          )}
        >
          <span>{fmtTime(line.t)}</span>
          <span>· {isDoctor ? "Doctor" : "Patient"}</span>
          {line.fused && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-brand-600">
              <Mic className="h-2.5 w-2.5" /> fused
            </span>
          )}
          {lowConf && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
              <AlertTriangle className="h-2.5 w-2.5" /> read-back
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- reasoning trace */

function ReasoningPanel({
  events,
  empty,
}: {
  events: AgentEvent[];
  empty: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="card flex h-[360px] flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <Sparkles className="h-4 w-4 text-brand-500" /> Agent reasoning trace
        </div>
        <span className="chip bg-slate-100 text-ink-muted ring-slate-200">
          {events.length} steps
        </span>
      </div>
      <div ref={ref} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {empty ? (
          <EmptyHint
            icon={Sparkles}
            text="The agents' step-by-step reasoning appears here as the conversation unfolds."
          />
        ) : (
          events.map((e) => <TraceRow key={e.id} event={e} />)
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status, tone }: { status: AgentEvent["status"]; tone: string }) {
  if (status === "working")
    return <Loader2 className="h-4 w-4 animate-spin text-brand-500" />;
  if (status === "critical")
    return <ShieldAlert className="h-4 w-4 text-red-600" />;
  if (status === "flag")
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (status === "ok")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  return <span className={cn("h-2.5 w-2.5 rounded-full", tone)} />;
}

function TraceRow({ event }: { event: AgentEvent }) {
  const a = AGENT_BY_KEY[event.agent];
  const t = TONES[a.tone];
  const critical = event.status === "critical";
  return (
    <div
      className={cn(
        "animate-slide-in rounded-xl border p-3",
        critical ? "border-red-200 bg-red-50" : "border-slate-200/80 bg-white"
      )}
    >
      <div className="flex items-center gap-2">
        <StatusIcon status={event.status} tone={t.dot} />
        <span className={cn("text-xs font-bold", critical ? "text-red-700" : t.text)}>
          {a.name}
        </span>
        <span className="bn text-[10px] text-ink-faint">{a.nameBn}</span>
        {a.deterministic && (
          <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-faint">
            rule
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-1.5 text-sm font-semibold leading-snug",
          critical ? "text-red-800" : "text-ink-soft"
        )}
      >
        {event.title}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{event.detail}</p>
      {event.citation && (
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-ink-muted ring-1 ring-inset ring-slate-200">
          <ScrollText className="h-3 w-3 text-brand-500" />
          {event.citation.source} · {event.citation.ref}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- alert cards */

function DangerCard() {
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border-2 border-red-300 bg-red-50 shadow-card">
      <div className="flex items-center gap-2 bg-red-600 px-5 py-2.5 text-white">
        <ShieldAlert className="h-5 w-5" />
        <span className="text-sm font-bold uppercase tracking-wide">
          Danger sign · urgent
        </span>
        <span className="ml-auto rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">
          deterministic
        </span>
      </div>
      <div className="px-5 py-4">
        <div className="bn text-lg font-bold text-red-800">
          {DANGER_ALERT.titleBn}
        </div>
        <div className="text-sm font-semibold text-red-700">
          {DANGER_ALERT.titleEn}
        </div>
        <dl className="mt-3 space-y-1.5 text-xs">
          <AlertRow k="Trigger">{DANGER_ALERT.trigger}</AlertRow>
          <AlertRow k="Classify">{DANGER_ALERT.classification}</AlertRow>
          <AlertRow k="Action">{DANGER_ALERT.action}</AlertRow>
        </dl>
        <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
          <ScrollText className="h-3 w-3" />
          {DANGER_ALERT.citation.source} · {DANGER_ALERT.citation.ref}
        </p>
      </div>
    </div>
  );
}

function MedSafetyCard() {
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50 shadow-card">
      <div className="flex items-center gap-2 bg-amber-500 px-5 py-2.5 text-white">
        <Pill className="h-5 w-5" />
        <span className="text-sm font-bold uppercase tracking-wide">
          Medication safety
        </span>
        <span className="ml-auto rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">
          deterministic
        </span>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white px-2 py-1 text-sm font-bold text-amber-800 line-through ring-1 ring-inset ring-amber-200">
            {MEDSAFETY_ALERT.drug}
          </span>
          <span className="bn text-sm font-bold text-amber-800">
            {MEDSAFETY_ALERT.titleBn}
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-amber-800">
          {MEDSAFETY_ALERT.reason}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          <span className="font-semibold">Alternative: </span>
          {MEDSAFETY_ALERT.alternative}
        </p>
        <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
          <ScrollText className="h-3 w-3" />
          {MEDSAFETY_ALERT.citation.source} · {MEDSAFETY_ALERT.citation.ref}
        </p>
      </div>
    </div>
  );
}

function AlertRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 font-bold uppercase tracking-wide text-red-500">
        {k}
      </dt>
      <dd className="text-red-800">{children}</dd>
    </div>
  );
}

/* --------------------------------------------------------------------- SOAP note */

function SoapCard({
  confirmed,
  onConfirm,
}: {
  confirmed: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="card animate-fade-up p-5">
      <div className="flex items-center gap-2 font-semibold text-ink">
        <FileText className="h-4 w-4 text-brand-500" /> Auto-drafted note
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <SoapRow k="S">{SOAP_NOTE.subjective}</SoapRow>
        <SoapRow k="O">{SOAP_NOTE.objective}</SoapRow>
        <SoapRow k="A">{SOAP_NOTE.assessment}</SoapRow>
        <div className="flex gap-2">
          <dt className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-100 text-[11px] font-bold text-brand-700">
            P
          </dt>
          <dd>
            <ul className="space-y-1 text-ink-soft">
              {SOAP_NOTE.plan.map((p) => (
                <li key={p} className="flex gap-1.5">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-brand-400" />
                  {p}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      {confirmed ? (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-inset ring-emerald-200">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" /> Saved to patient record
          </span>
          <Link href="/patient" className="btn-primary">
            Open patient summary <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <button onClick={onConfirm} className="btn-primary mt-4 w-full">
          <CheckCircle2 className="h-4 w-4" /> Confirm &amp; save note
        </button>
      )}
    </div>
  );
}

function SoapRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-100 text-[11px] font-bold text-brand-700">
        {k}
      </dt>
      <dd className="text-ink-soft">{children}</dd>
    </div>
  );
}

/* ----------------------------------------------------------- live backend card */

const SYMPTOM_LABELS: Record<string, string> = {
  fever: "Fever",
  cough: "Cough",
  fast_breathing: "Fast breathing",
  poor_feeding: "Poor feeding",
  vomiting: "Vomiting",
};

function LiveAnalysisCard({
  state,
  result,
  onRetry,
}: {
  state: "idle" | "loading" | "live" | "demo";
  result: FromTranscriptResult | null;
  onRetry: () => void;
}) {
  return (
    <div className="card animate-fade-up p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-500" />
        <span className="font-semibold text-ink">Live agent analysis</span>
        {state === "live" ? (
          <span className="chip ml-auto bg-emerald-50 text-emerald-700 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live backend
          </span>
        ) : state === "loading" ? (
          <span className="chip ml-auto bg-slate-100 text-ink-muted ring-slate-200">
            <Loader2 className="h-3 w-3 animate-spin" /> Connecting
          </span>
        ) : (
          <span className="chip ml-auto bg-amber-50 text-amber-700 ring-amber-200">
            <CloudOff className="h-3 w-3" /> Scripted demo
          </span>
        )}
      </div>

      {state === "loading" && (
        <p className="mt-3 text-sm text-ink-muted">
          Contacting the Codoctor backend… a sleeping free-tier server can take ~30s
          to wake.
        </p>
      )}

      {state === "live" && result && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="chip bg-indigo-50 text-indigo-700 ring-indigo-200">
              <Mic className="h-3 w-3" /> Fused 2 devices ·{" "}
              {result.fused_transcript.filter((s) => s.recovered).length} recovered
            </span>
            <span className="chip bg-emerald-50 text-emerald-700 ring-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              {result.analysis.grounded ? "grounded" : "ungrounded"}
            </span>
            <span className="chip bg-brand-50 text-brand-700 ring-brand-200">
              {result.analysis.retrieval_passes} retrieval pass
              {result.analysis.retrieval_passes === 1 ? "" : "es"}
            </span>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Scribe extracted — from the fused transcript
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(result.extracted_encounter.symptoms ?? []).map((s) => (
                <span key={s} className="chip bg-slate-100 text-ink-muted ring-slate-200">
                  {SYMPTOM_LABELS[s] ?? s}
                </span>
              ))}
              {result.extracted_encounter.vitals?.respiratory_rate ? (
                <span className="chip bg-slate-100 text-ink-muted ring-slate-200">
                  RR {result.extracted_encounter.vitals.respiratory_rate}
                </span>
              ) : null}
              {result.extracted_encounter.chest_indrawing && (
                <span className="chip bg-red-50 text-red-700 ring-red-200">
                  chest indrawing
                </span>
              )}
              {(result.extracted_encounter.proposed_meds ?? []).map((m) => (
                <span key={m} className="chip bg-amber-50 text-amber-700 ring-amber-200">
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </span>
              ))}
            </div>
          </div>

          {result.analysis.differential &&
            result.analysis.differential.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Differential — consider
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.analysis.differential.map((d, i) => (
                    <span
                      key={i}
                      className="chip bg-brand-50 text-brand-700 ring-brand-200"
                    >
                      {d.condition}
                    </span>
                  ))}
                </div>
              </div>
            )}

          <p className="bn rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-ink-soft ring-1 ring-inset ring-slate-200">
            {result.analysis.answer_bn}
          </p>
          {result.analysis.citations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.analysis.citations.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-ink-muted ring-1 ring-inset ring-slate-200"
                >
                  <ScrollText className="h-3 w-3 text-brand-500" />
                  {c.source} · {c.ref}
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink-faint">
            Live: two device transcripts fused → Scribe-extracted → orchestrated
            (retrieve → tools → critic → synthesize).
          </p>
        </div>
      )}

      {state === "demo" && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-ink-muted">
            {API_URL
              ? "Couldn't reach the live backend — the cards above are the scripted demo. The free-tier server may be asleep."
              : "Backend not connected — the cards above are the scripted demo. Set NEXT_PUBLIC_API_URL to call the live agents."}
          </p>
          {API_URL && (
            <button onClick={onRetry} className="btn-secondary">
              <Cloud className="h-4 w-4" /> Retry live backend
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ misc */

function EmptyHint({
  icon: Icon,
  text,
}: {
  icon: typeof Mic;
  text: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 max-w-xs text-sm text-ink-faint">{text}</p>
    </div>
  );
}
