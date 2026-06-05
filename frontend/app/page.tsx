import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  Mic,
  ShieldAlert,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Pill,
  Sparkles,
  ScrollText,
  Languages,
  Lock,
  Scale,
  Stethoscope,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TONES } from "@/components/tone";
import {
  AGENTS,
  PROBLEM_STATS,
  HOW_IT_WORKS,
} from "@/lib/demo-data";

const HOW_ICONS = [QrCode, Mic, ShieldAlert, Volume2];

export default function Home() {
  return (
    <div className="grain">
      <SiteHeader />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-fade-up">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              SciBlitz AI Challenge 2026 · Track A
            </span>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.08] text-ink sm:text-5xl lg:text-6xl">
              A second pair of ears in{" "}
              <span className="text-gradient">every consultation.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              In Bangladesh&apos;s OPDs a doctor gets 90 seconds per patient.
              Codoctor listens to the conversation in Bangla, cross-checks every
              step against official clinical guidelines — <strong className="font-semibold text-ink-soft">with citations</strong> —
              and makes sure no danger sign, drug interaction, or key question is
              missed.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/doctor" className="btn-primary text-base">
                <Stethoscope className="h-4 w-4" />
                Open the doctor demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/patient" className="btn-secondary text-base">
                See the patient view
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
              {[
                ["Grounded + cited", CheckCircle2],
                ["Bangla voice-first", Languages],
                ["Deterministic safety checks", Scale],
              ].map(([label, Icon]) => {
                const I = Icon as typeof CheckCircle2;
                return (
                  <span key={label as string} className="inline-flex items-center gap-1.5">
                    <I className="h-4 w-4 text-brand-500" />
                    {label as string}
                  </span>
                );
              })}
            </div>
          </div>

          <HeroVisual />
        </div>

        {/* grounded-in strip */}
        <div className="border-y border-slate-200/70 bg-white/60">
          <div className="container-page flex flex-wrap items-center gap-x-8 gap-y-2 py-4 text-sm">
            <span className="font-semibold text-ink-soft">Grounded in:</span>
            {["WHO IMCI", "DGHS Standard Treatment Guidelines", "National Drug Formulary (BD)"].map(
              (s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-ink-muted">
                  <ScrollText className="h-4 w-4 text-brand-400" />
                  {s}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Problem */}
      <section id="problem" className="container-page py-20">
        <SectionHeading
          kicker="The problem"
          title="The 90-second consultation"
          sub="Bangladesh's government OPDs run on volume. In that window, things get missed — and nothing gets written down."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEM_STATS.map((s) => (
            <div key={s.label} className="card p-6">
              <div className="text-3xl font-bold tracking-tight text-gradient">
                {s.value}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-pretty text-base leading-relaxed text-ink-muted">
          Ambient clinical scribes (Abridge, Nuance DAX, Nabla) became a proven,
          billion-dollar category abroad. <strong className="font-semibold text-ink-soft">None</strong> work
          in Bangla, for the 90-second consultation, or as a patient-held record.
          Codoctor localizes that proven pattern to the one setting it was never
          built for.
        </p>
      </section>

      {/* ------------------------------------------------------------- How it works */}
      <section id="how" className="border-y border-slate-200/70 bg-white/50">
        <div className="container-page py-20">
          <SectionHeading
            kicker="How it works"
            title="One QR scan to a record they keep"
            sub="A guided flow — not a blank chat box — from the door to the patient's phone."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((s, i) => {
              const Icon = HOW_ICONS[i];
              return (
                <div key={s.step} className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-brand-500">
                    Step {s.step}
                  </div>
                  <h3 className="mt-1.5 text-lg font-semibold text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {s.desc}
                  </p>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <ArrowRight className="absolute -right-4 top-3.5 hidden h-5 w-5 text-slate-300 lg:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Agents */}
      <section id="agents" className="container-page py-20">
        <SectionHeading
          kicker="The agent team"
          title="An orchestrator and its specialists"
          sub="Division of labour that reads as genuinely agentic — and stays explainable in a 3-minute demo. The decisive checks are deterministic; the LLM only narrates in Bangla."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => {
            const t = TONES[a.tone];
            return (
              <div key={a.key} className="card group p-5 transition-shadow hover:shadow-card">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.softBg} ring-1 ring-inset ${t.ring}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />
                  </span>
                  <div>
                    <h3 className="font-semibold leading-tight text-ink">
                      {a.name}
                    </h3>
                    <span className={`bn text-xs ${t.text}`}>{a.nameBn}</span>
                  </div>
                  {a.deterministic && (
                    <span className="chip ml-auto bg-slate-100 text-ink-muted ring-slate-200">
                      <Scale className="h-3 w-3" /> deterministic
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {a.role}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------- Safety */}
      <section
        id="safety"
        className="relative overflow-hidden border-y border-brand-200/60 bg-gradient-to-br from-brand-50 to-white"
      >
        <div className="container-page py-20">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="eyebrow">
                <Lock className="h-3.5 w-3.5" /> Safety by design
              </span>
              <h2 className="mt-5 text-3xl font-bold text-ink sm:text-4xl">
                The doctor always decides.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-muted">
                Codoctor is a clinical safety-net, not an autonomous
                diagnostician. It surfaces cited, dismissible prompts — and runs
                the dangerous checks on provable, deterministic tools.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [Scale, "Deterministic tools decide", "Danger signs & drug safety come from rule engines, never an LLM guess."],
                [ScrollText, "Every claim is cited", "A guideline clause, a formulary row — or it isn't shown at all."],
                [AlertTriangle, "Honest refusal", "“No guideline match — clinician judgment.” Refusing is a feature."],
                [Lock, "Consent-first & private", "Recording starts on consent; the record belongs to the patient."],
              ].map(([Icon, title, desc]) => {
                const I = Icon as typeof Scale;
                return (
                  <div key={title as string} className="card p-5">
                    <I className="h-5 w-5 text-brand-600" />
                    <h3 className="mt-3 font-semibold text-ink">{title as string}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                      {desc as string}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="container-page py-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-14 text-center shadow-card sm:px-16">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-brand-400/10 blur-3xl" />
          <h2 className="relative text-balance text-3xl font-bold text-white sm:text-4xl">
            Watch Codoctor catch a missed danger sign.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base text-slate-300">
            A live pediatric consultation, in Bangla — fast breathing, chest
            indrawing, and an antibiotic the patient is allergic to. Two catches,
            both cited.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/doctor" className="btn-primary text-base">
              <Stethoscope className="h-4 w-4" /> Open the doctor demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/patient"
              className="btn text-base text-white ring-1 ring-white/25 hover:bg-white/10"
            >
              See the patient view
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- helpers */

function SectionHeading({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600">
        {kicker}
      </div>
      <h2 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
      {sub && (
        <p className="mt-3 text-base leading-relaxed text-ink-muted">{sub}</p>
      )}
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative animate-fade-up [animation-delay:120ms]">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-brand-200/50 via-transparent to-sky-200/40 blur-2xl" />

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            Live consultation
          </div>
          <span className="chip bg-slate-100 text-ink-muted ring-slate-200">
            <Mic className="h-3 w-3" /> 2 devices · fused
          </span>
        </div>

        <div className="space-y-3 px-5 py-5">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5">
              <div className="bn text-sm text-ink-soft">
                দুই দিন ধরে খুব দ্রুত শ্বাস নিচ্ছে, বুকটা টেনে যাচ্ছে।
              </div>
              <div className="mt-1 text-[11px] text-ink-faint">
                Patient · recovered from device 2
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-2.5 text-white">
              <div className="bn text-sm">শ্বাসের হার মিনিটে ৫২, বুকের নিচের অংশ টেনে যাচ্ছে।</div>
              <div className="mt-1 text-[11px] text-brand-100">Doctor · vitals captured</div>
            </div>
          </div>
        </div>

        <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <span className="text-sm font-bold text-red-800">
              Danger sign — Severe pneumonia
            </span>
            <span className="chip ml-auto bg-red-100 text-red-700 ring-red-200">
              refer now
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-red-700/90">
            RR 52 ≥ 40/min (age 1–5y) + chest indrawing → urgent referral.
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-red-600/80">
            <ScrollText className="h-3 w-3" /> WHO IMCI · Cough or difficult
            breathing
          </p>
        </div>
      </div>

      {/* floating med-safety chip */}
      <div className="absolute -bottom-5 -left-4 w-60 animate-float rounded-2xl border border-amber-200 bg-white p-3.5 shadow-card sm:-left-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-inset ring-amber-200">
            <Pill className="h-4 w-4 text-amber-600" />
          </span>
          <div>
            <div className="text-xs font-bold text-ink">Amoxicillin blocked</div>
            <div className="text-[11px] text-ink-muted">Penicillin allergy on file</div>
          </div>
        </div>
      </div>
    </div>
  );
}
