"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Volume2,
  Square,
  ArrowLeft,
  HeartPulse,
  Hospital,
  Pill,
  TriangleAlert,
  ShieldCheck,
  Languages,
  CheckCircle2,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { PATIENT_SUMMARY, PATIENT_SUMMARY_SPEECH } from "@/lib/demo-data";

export default function PatientPage() {
  const [speaking, setSpeaking] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setCanSpeak(true);
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(PATIENT_SUMMARY_SPEECH);
    u.lang = "bn-BD";
    const bn = voicesRef.current.find((v) =>
      v.lang?.toLowerCase().startsWith("bn")
    );
    if (bn) u.voice = bn;
    u.rate = 0.94;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 shadow-card">
        {/* top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-slate-50/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <div className="leading-tight">
              <div className="text-sm font-bold text-ink">Codoctor</div>
              <div className="text-[11px] text-ink-muted">Your health record</div>
            </div>
          </div>
          <button
            onClick={() => setShowEn((v) => !v)}
            className={cn(
              "chip ring-1",
              showEn
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-ink-muted ring-slate-200"
            )}
          >
            <Languages className="h-3 w-3" /> EN
          </button>
        </header>

        {/* connected banner */}
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-semibold">
            Connected to Dr. Rahman · OPD Room 4
          </span>
        </div>

        <div className="space-y-4 px-4 py-5">
          {/* heading */}
          <div>
            <div className="bn text-xs font-semibold uppercase tracking-wide text-brand-600">
              আপনার ভিজিটের সারাংশ
            </div>
            <h1 className="bn mt-1 text-xl font-bold text-ink">
              বাচ্চার স্বাস্থ্য রিপোর্ট
            </h1>
            {showEn && (
              <p className="mt-1 text-sm text-ink-muted">
                Your visit summary — child&apos;s health report
              </p>
            )}
          </div>

          {/* Listen button */}
          <button
            onClick={speaking ? stop : speak}
            disabled={!canSpeak}
            className={cn(
              "flex min-h-[3.5rem] w-full items-center justify-center gap-3 rounded-2xl px-5 text-base font-bold shadow-soft transition-all",
              speaking
                ? "bg-ink text-white"
                : "bg-brand-600 text-white hover:bg-brand-700",
              !canSpeak && "cursor-not-allowed opacity-50"
            )}
          >
            {speaking ? (
              <>
                <span className="flex items-end gap-0.5">
                  {[0.5, 1, 0.6, 0.9].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 animate-wave rounded-full bg-white"
                      style={{ height: `${h * 18}px`, animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </span>
                <span className="bn">থামুন</span>
                <Square className="h-4 w-4 fill-white" />
              </>
            ) : (
              <>
                <Volume2 className="h-5 w-5" />
                <span className="bn">সারাংশ শুনুন</span>
                <span className="text-sm font-medium opacity-80">Listen</span>
              </>
            )}
          </button>

          {/* condition (severe) */}
          <Card tone="red" icon={HeartPulse} titleBn="রোগ নির্ণয়" titleEn={showEn ? "Condition" : undefined}>
            <p className="bn text-base font-semibold leading-relaxed text-red-800">
              {PATIENT_SUMMARY.conditionBn}
            </p>
            {showEn && (
              <p className="mt-1.5 text-sm text-ink-muted">
                {PATIENT_SUMMARY.conditionEn}
              </p>
            )}
            <p className="bn mt-3 text-sm leading-relaxed text-ink-soft">
              {PATIENT_SUMMARY.meaningBn}
            </p>
            {showEn && (
              <p className="mt-1 text-xs text-ink-muted">
                {PATIENT_SUMMARY.meaningEn}
              </p>
            )}
          </Card>

          {/* action — go to hospital now */}
          <div className="overflow-hidden rounded-2xl border-2 border-red-300 bg-red-600 text-white shadow-card">
            <div className="flex items-center gap-3 px-5 py-4">
              <Hospital className="h-7 w-7 shrink-0" />
              <div>
                <div className="bn text-lg font-bold leading-snug">
                  {PATIENT_SUMMARY.actionBn}
                </div>
                {showEn && (
                  <div className="mt-0.5 text-sm text-red-100">
                    {PATIENT_SUMMARY.actionEn}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* medicines */}
          <Card tone="amber" icon={Pill} titleBn="ওষুধ" titleEn={showEn ? "Medicines" : undefined}>
            <p className="bn text-sm leading-relaxed text-ink-soft">
              {PATIENT_SUMMARY.medsBn}
            </p>
            {showEn && (
              <p className="mt-1.5 text-xs text-ink-muted">
                {PATIENT_SUMMARY.medsEn}
              </p>
            )}
          </Card>

          {/* danger signs */}
          <Card
            tone="red"
            icon={TriangleAlert}
            titleBn="বিপদের লক্ষণ — সাথে সাথে হাসপাতালে যান"
            titleEn={showEn ? "Danger signs — go to hospital immediately" : undefined}
          >
            <ul className="space-y-2">
              {PATIENT_SUMMARY.dangerSignsBn.map((s, i) => (
                <li key={s} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <div>
                    <span className="bn text-sm font-medium text-ink-soft">{s}</span>
                    {showEn && (
                      <span className="block text-xs text-ink-muted">
                        {PATIENT_SUMMARY.dangerSignsEn[i]}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* privacy */}
          <div className="flex items-start gap-2 rounded-xl bg-white p-4 text-xs text-ink-muted ring-1 ring-inset ring-slate-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <p>
              Processed during your visit and saved to your phone — your record
              stays with you. Codoctor is advisory and does not replace your
              doctor.
            </p>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-ink-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Codoctor
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({
  tone,
  icon: Icon,
  titleBn,
  titleEn,
  children,
}: {
  tone: "red" | "amber" | "brand";
  icon: typeof Pill;
  titleBn: string;
  titleEn?: string;
  children: React.ReactNode;
}) {
  const ring =
    tone === "red"
      ? "ring-red-100"
      : tone === "amber"
      ? "ring-amber-100"
      : "ring-brand-100";
  const iconWrap =
    tone === "red"
      ? "bg-red-50 text-red-600 ring-red-200"
      : tone === "amber"
      ? "bg-amber-50 text-amber-600 ring-amber-200"
      : "bg-brand-50 text-brand-600 ring-brand-200";
  return (
    <div className={cn("rounded-2xl bg-white p-5 shadow-soft ring-1", ring)}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset",
            iconWrap
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="bn text-sm font-bold text-ink">{titleBn}</div>
          {titleEn && (
            <div className="text-[11px] text-ink-faint">{titleEn}</div>
          )}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
