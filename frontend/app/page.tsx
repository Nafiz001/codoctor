import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  Mic,
  ShieldAlert,
  Volume2,
  Check,
  ScrollText,
  Scale,
  Lock,
  AlertTriangle,
  Languages,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TONES } from "@/components/tone";
import { AGENTS, PROBLEM_STATS, HOW_IT_WORKS } from "@/lib/demo-data";

const HOW_ICONS = [QrCode, Mic, ShieldAlert, Volume2];

export default function Home() {
  return (
    <div>
      <SiteHeader />

      {/* ----------------------------------------------------------- Hero */}
      <section className="container-page pb-20 pt-14 lg:pt-20">
        <div className="grid items-center gap-x-12 gap-y-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <div className="eyebrow">SciBlitz AI Challenge 2026 — Track A</div>
            <h1 className="mt-5 text-[2.6rem] leading-[1.04] text-ink sm:text-[3.5rem] lg:text-6xl">
              A second pair of ears in{" "}
              <span className="text-brand-600">every consultation.</span>
            </h1>
            <p className="measure mt-6 text-lg leading-relaxed text-ink-muted">
              In Bangladesh&apos;s outpatient departments a doctor gets ninety
              seconds per patient. Codoctor listens in Bangla, checks every step
              against official clinical guidelines — with citations — and makes
              sure no danger sign, drug interaction, or question is missed.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/room" className="btn-primary text-base">
                See it work
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/live" className="btn-secondary text-base">
                Try the voice check
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-ink-muted">
              {[
                "Cited to official guidelines",
                "Bangla voice-first",
                "Deterministic safety checks",
              ].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <HeroNote />
        </div>
      </section>

      {/* grounded-in strip */}
      <div className="border-y border-slate-200">
        <div className="container-page flex flex-wrap items-center gap-x-8 gap-y-2 py-4 text-sm">
          <span className="font-medium text-ink-soft">Grounded in</span>
          {[
            "WHO IMCI",
            "DGHS Standard Treatment Guidelines",
            "National Drug Formulary (BD)",
          ].map((s, i) => (
            <span
              key={s}
              className="inline-flex items-center gap-2 text-ink-muted"
            >
              {i > 0 && <span className="h-1 w-1 rounded-full bg-slate-300" />}
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------- Problem */}
      <section id="problem" className="container-page py-20">
        <div className="eyebrow">The problem</div>
        <h2 className="mt-3 max-w-3xl text-3xl text-ink sm:text-[2.6rem] sm:leading-[1.1]">
          The ninety-second consultation
        </h2>
        <p className="measure mt-5 text-lg text-ink-muted">
          Bangladesh&apos;s government OPDs run on volume. In that window, things
          get missed — and nothing gets written down.
        </p>

        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEM_STATS.map((s) => (
            <div key={s.label} className="border-t-2 border-brand-300 pt-4">
              <div className="font-display text-4xl font-medium text-ink">
                {s.value}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <p className="measure mt-12 text-base leading-relaxed text-ink-muted">
          Ambient clinical scribes became a proven, billion-dollar category
          abroad. <span className="font-semibold text-ink-soft">None</span> work
          in Bangla, for the ninety-second consultation, or as a patient-held
          record. Codoctor localizes that proven pattern to the one setting it
          was never built for.
        </p>
      </section>

      {/* ------------------------------------------------------- How it works */}
      <section id="how" className="border-t border-slate-200">
        <div className="container-page py-20">
          <div className="eyebrow">How it works</div>
          <h2 className="mt-3 max-w-3xl text-3xl text-ink sm:text-[2.6rem] sm:leading-[1.1]">
            From one QR scan to a record they keep
          </h2>

          <div className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((s, i) => {
              const Icon = HOW_ICONS[i];
              return (
                <div key={s.step}>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl font-medium text-brand-500">
                      {s.step}
                    </span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <Icon className="mt-5 h-5 w-5 text-brand-600" />
                  <h3 className="mt-3 text-lg font-semibold text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Agents */}
      <section id="agents" className="border-t border-slate-200">
        <div className="container-page py-20">
          <div className="eyebrow">The agent team</div>
          <h2 className="mt-3 max-w-3xl text-3xl text-ink sm:text-[2.6rem] sm:leading-[1.1]">
            An orchestrator and its specialists
          </h2>
          <p className="measure mt-5 text-lg text-ink-muted">
            Division of labour that stays explainable in a three-minute demo. The
            decisive checks are deterministic; the model only narrates, in Bangla.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((a) => {
              const t = TONES[a.tone];
              return (
                <div key={a.key} className="card p-5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${t.softBg} ring-1 ring-inset ${t.ring}`}
                    >
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
                        <Scale className="h-3 w-3" /> rule
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
        </div>
      </section>

      {/* ---------------------------------------------------------- Safety */}
      <section id="safety" className="border-t border-slate-200 bg-brand-50/60">
        <div className="container-page py-20">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="eyebrow">Safety by design</div>
              <h2 className="mt-3 text-3xl text-ink sm:text-[2.6rem] sm:leading-[1.05]">
                The doctor always decides.
              </h2>
              <p className="measure mt-5 text-lg leading-relaxed text-ink-muted">
                Codoctor is a clinical safety-net, not an autonomous
                diagnostician. It surfaces cited, dismissible prompts — and runs
                the dangerous checks on provable, deterministic tools.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                [Scale, "Deterministic tools decide", "Danger signs & drug safety come from rule engines, never a model's guess."],
                [ScrollText, "Every claim is cited", "A guideline clause, a formulary row — or it isn't shown at all."],
                [AlertTriangle, "Honest refusal", "“Not in the source — clinician judgment.” Refusing is a feature."],
                [Lock, "Consent-first & private", "Recording starts on consent; the record belongs to the patient."],
              ].map(([Icon, title, desc]) => {
                const I = Icon as typeof Scale;
                return (
                  <div key={title as string} className="card p-5">
                    <I className="h-5 w-5 text-brand-600" />
                    <h3 className="mt-3 font-semibold text-ink">
                      {title as string}
                    </h3>
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
        <div className="rounded-3xl bg-brand-600 px-8 py-16 text-center shadow-card sm:px-16">
          <h2 className="mx-auto max-w-2xl text-3xl text-white sm:text-[2.6rem] sm:leading-[1.08]">
            Watch Codoctor catch a missed danger sign.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-brand-100">
            A live pediatric consultation, in Bangla — fast breathing, chest
            indrawing, and an antibiotic the patient is allergic to. Two catches,
            both cited.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/room"
              className="btn bg-white text-base text-brand-700 hover:bg-brand-50"
            >
              See it work <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/live"
              className="btn text-base text-white ring-1 ring-inset ring-white/30 hover:bg-white/10"
            >
              Voice quick-check
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ----------------------------------------------------------------- hero note */

function HeroNote() {
  return (
    <div className="animate-fade-up [animation-delay:120ms]">
      <div className="relative">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
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
              <div className="max-w-[86%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5">
                <div className="bn text-sm text-ink-soft">
                  দুই দিন ধরে খুব দ্রুত শ্বাস নিচ্ছে, বুকটা টেনে যাচ্ছে।
                </div>
                <div className="mt-1 text-[11px] text-ink-faint">
                  Patient · recovered from device 2
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[86%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-2.5 text-white">
                <div className="bn text-sm">
                  শ্বাসের হার মিনিটে ৫২, বুকের নিচের অংশ টেনে যাচ্ছে।
                </div>
                <div className="mt-1 text-[11px] text-brand-100">
                  Doctor · vitals captured
                </div>
              </div>
            </div>
          </div>

          <div className="mx-5 mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">
                Danger sign — severe pneumonia
              </span>
              <span className="chip ml-auto bg-red-100 text-red-700 ring-red-200">
                refer now
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-red-700">
              RR 52 ≥ 40/min (age 1–5y) + chest indrawing → urgent referral.
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
              <ScrollText className="h-3 w-3" /> WHO IMCI · Cough or difficult
              breathing
            </p>
          </div>
        </div>

        <div className="absolute -bottom-5 -left-4 w-60 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-card sm:-left-7">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200">
              <Languages className="h-4 w-4 text-brand-600" />
            </span>
            <div>
              <div className="text-xs font-semibold text-ink">
                Read aloud in Bangla
              </div>
              <div className="text-[11px] text-ink-muted">
                for the patient to keep
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
