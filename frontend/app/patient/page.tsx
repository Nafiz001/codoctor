"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Volume2,
  Square,
  ArrowLeft,
  ArrowRight,
  HeartPulse,
  Hospital,
  Pill,
  TriangleAlert,
  ShieldCheck,
  Languages,
  CheckCircle2,
  Mic,
  Loader2,
  ScrollText,
  Radio,
  Download,
  QrCode,
  KeyRound,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { PATIENT_SUMMARY } from "@/lib/demo-data";
import { useDictation } from "@/lib/use-dictation";
import { citationHref } from "@/lib/citations";
import {
  joinSession,
  getSession,
  appendTranscript,
  updatePatientContext,
  API_URL,
  type PatientSummary,
  type SessionState,
} from "@/lib/api";

/** One continuous Bangla paragraph for the text-to-speech read-aloud. */
function speechText(s: PatientSummary): string {
  return [
    s.conditionBn,
    s.meaningBn,
    s.actionBn,
    s.medsBn,
    "বিপদের লক্ষণ: " + s.dangerSignsBn.join("; ") + "।",
  ].join(" ");
}

/** Build a standalone, printable HTML record and download it to the device, so
 *  the patient keeps their own copy — "the record stays with you." */
function downloadRecord(s: PatientSummary): void {
  const esc = (x: string) =>
    x.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] as string));
  const danger = s.dangerSignsBn
    .map(
      (d, i) =>
        `<li>${esc(d)}${
          s.dangerSignsEn[i] ? ` <span class="en">(${esc(s.dangerSignsEn[i])})</span>` : ""
        }</li>`
    )
    .join("");
  const cites = (s.citations || [])
    .map((c) => `<li>${esc(c.source)} — ${esc(c.ref)}</li>`)
    .join("");
  const html = `<!doctype html><html lang="bn"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Codoctor — আপনার স্বাস্থ্য রেকর্ড</title>
<style>body{font-family:system-ui,'Noto Sans Bengali',Arial,sans-serif;max-width:640px;margin:24px auto;padding:0 16px;line-height:1.6;color:#1c1917}
h1{font-size:20px;margin:0}h2{font-size:14px;margin:18px 0 4px;color:#9F4E2E;text-transform:uppercase;letter-spacing:.04em}
.box{border:1px solid #e7e5e4;border-radius:12px;padding:12px 16px;margin:10px 0}
.danger{border-color:#fca5a5;background:#fef2f2}.en{color:#78716c}small{color:#78716c}ul{margin:6px 0;padding-left:18px}</style></head>
<body>
<h1>Codoctor — আপনার স্বাস্থ্য রেকর্ড</h1>
<small>Advisory only · ডাক্তারের পরামর্শের বিকল্প নয়</small>
<div class="box"><h2>রোগ নির্ণয় · Condition</h2><b>${esc(s.conditionBn)}</b><br><span class="en">${esc(
    s.conditionEn
  )}</span><p>${esc(s.meaningBn)}</p></div>
<div class="box danger"><h2>করণীয় · Action</h2><b>${esc(s.actionBn)}</b><br><span class="en">${esc(
    s.actionEn
  )}</span></div>
<div class="box"><h2>ওষুধ · Medicines</h2>${esc(s.medsBn)}<br><span class="en">${esc(
    s.medsEn
  )}</span></div>
<div class="box danger"><h2>বিপদের লক্ষণ · Danger signs</h2><ul>${danger}</ul></div>
${cites ? `<div class="box"><h2>Based on</h2><ul>${cites}</ul></div>` : ""}
</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "codoctor-health-record.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function PatientPage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 py-10 text-center text-sm text-ink-faint">Loading…</div></Shell>}>
      <PatientInner />
    </Suspense>
  );
}

function PatientInner() {
  const params = useSearchParams();
  const sid = params.get("s");
  // No session id → let the patient join by code or QR (or view a sample).
  if (!sid) return <JoinScreen />;
  return <LiveSession sid={sid} />;
}

/* -------------------------------------------------------------- join screen */

function JoinScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [showSample, setShowSample] = useState(false);

  if (showSample) {
    return <SummaryScreen summary={PATIENT_SUMMARY as PatientSummary} mode="demo" />;
  }

  const join = () => {
    const c = code.trim().toUpperCase();
    if (c) router.push(`/patient?s=${encodeURIComponent(c)}`);
  };

  return (
    <Shell>
      <div className="space-y-6 px-4 py-8">
        <div className="text-center">
          <div className="bn text-xs font-semibold uppercase tracking-wide text-brand-600">
            রোগীর মোড
          </div>
          <h1 className="bn mt-1 text-2xl font-bold text-ink">আপনার ভিজিটে যোগ দিন</h1>
          <p className="mt-1 text-sm text-ink-muted">Join your visit</p>
        </div>

        {/* Option 1 — scan the QR */}
        <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <QrCode className="h-4 w-4 text-brand-500" /> Scan the QR
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Point your phone camera at the QR code the doctor shows. It opens this
            page and joins you automatically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-ink-faint">OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Option 2 — type the code */}
        <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <KeyRound className="h-4 w-4 text-brand-500" /> Enter the session code
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            The doctor&apos;s screen shows a 5-character code (e.g. FEU76).
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="FEU76"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-2xl font-bold uppercase tracking-[0.3em] text-ink outline-none focus:border-brand-400"
          />
          <button
            onClick={join}
            disabled={!code.trim()}
            className="btn-primary mt-3 w-full disabled:opacity-50"
          >
            Join visit <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => setShowSample(true)}
          className="w-full text-center text-sm font-medium text-ink-muted underline-offset-2 hover:underline"
        >
          Or view a sample record
        </button>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------ live session */

function LiveSession({ sid }: { sid: string }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [consented, setConsented] = useState(false);

  // Stream the patient phone's recognized speech into the shared session.
  const dictation = useDictation((text, conf) => {
    appendTranscript(sid, "patient", text, conf);
  }, "bn-BD");

  // Join, then poll for the doctor's published summary.
  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await joinSession(sid, "patient");
      if (!alive) return;
      if (s) setSession(s);
      else setNotFound(true);
    })();
    const id = setInterval(async () => {
      const s = await getSession(sid);
      if (!alive) return;
      if (s) {
        setSession(s);
        setNotFound(false);
      }
    }, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [sid]);

  // Doctor finished → show the real, spoken summary.
  if (session?.status === "ready" && session.summary) {
    return <SummaryScreen summary={session.summary} mode="live" />;
  }

  if (notFound && !session) {
    return (
      <Shell>
        <div className="space-y-4 px-4 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <TriangleAlert className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-ink">Session not found</h1>
          <p className="mx-auto max-w-xs text-sm text-ink-muted">
            {API_URL
              ? `We couldn't find session ${sid}. It may have expired — ask the doctor to scan again.`
              : "Live sessions need the backend, which isn't configured for this build."}
          </p>
          <Link href="/" className="btn-secondary mx-auto">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs font-semibold">
          Connected · session {sid}
        </span>
      </div>

      <div className="space-y-5 px-4 py-6">
        <div>
          <div className="bn text-xs font-semibold uppercase tracking-wide text-brand-600">
            ভিজিট চলছে
          </div>
          <h1 className="bn mt-1 text-xl font-bold text-ink">
            ডাক্তারের সাথে সংযুক্ত
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Connected to your doctor. Allow the mic so this phone can also listen
            — it helps catch words the other phone misses.
          </p>
        </div>

        {!consented ? (
          <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-brand-500" /> Consent to record
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              This visit will be transcribed on your phone to build your health
              record. Audio is processed during the visit only. You can stop any
              time.
            </p>
            <button
              onClick={() => {
                setConsented(true);
                dictation.start();
              }}
              className="btn-primary mt-4 w-full"
            >
              <Mic className="h-4 w-4" /> I agree — start listening
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                {dictation.listening ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    Listening…
                  </>
                ) : (
                  <>
                    <Radio className="h-4 w-4 text-ink-faint" /> Paused
                  </>
                )}
              </span>
              <button
                onClick={dictation.listening ? dictation.stop : dictation.start}
                className={cn(
                  "chip ring-1",
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
                    <Mic className="h-3 w-3" /> Resume
                  </>
                )}
              </button>
            </div>
            {dictation.interim && (
              <p className="bn mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-ink-faint">
                {dictation.interim}…
              </p>
            )}
            {!dictation.supported && (
              <p className="mt-3 text-xs text-amber-700">
                Voice input needs Chrome. The doctor&apos;s phone is still
                listening — your summary will appear here when ready.
              </p>
            )}
          </div>
        )}

        <PatientContextForm sid={sid} />

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
          <p className="bn mt-3 text-sm font-medium text-ink-soft">
            ডাক্তার শেষ করলে আপনার সারাংশ এখানে আসবে
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Waiting for your doctor to finish the assessment…
          </p>
          {session && (
            <p className="mt-3 text-[11px] text-ink-faint">
              Captured on this phone: {session.counts.patient} · doctor&apos;s
              phone: {session.counts.doctor}
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* -------------------------------------------------- patient's own history */

function PatientContextForm({ sid }: { sid: string }) {
  const [allergies, setAllergies] = useState("");
  const [meds, setMeds] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const split = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink outline-none focus:border-brand-400";

  const save = async () => {
    setSaving(true);
    const ok = await updatePatientContext(sid, {
      allergies: split(allergies),
      current_meds: split(meds),
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex items-center gap-2 font-semibold text-ink">
        <Pill className="h-4 w-4 text-brand-500" />
        <span className="bn">আপনার তথ্য দিন</span>
        <span className="text-xs font-normal text-ink-faint">· Your details</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Fill what you know — it appears on the doctor&apos;s screen and saves them
        asking. (Optional.)
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <label className="text-xs font-semibold text-ink-muted">
            <span className="bn">অ্যালার্জি</span> · Allergies
          </label>
          <input
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted">
            <span className="bn">বর্তমান ওষুধ</span> · Current medicines
          </label>
          <input
            value={meds}
            onChange={(e) => setMeds(e.target.value)}
            placeholder="e.g. Salbutamol"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-muted">
            <span className="bn">অন্য কিছু</span> · Anything else
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Other history, symptoms, concerns…"
            className={cn(inputCls, "resize-none")}
          />
        </div>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-3 flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="h-4 w-4" /> Sent to doctor
          </>
        ) : (
          "Send to doctor"
        )}
      </button>
    </div>
  );
}

/* --------------------------------------------------------- summary screen */

function SummaryScreen({
  summary,
  mode,
}: {
  summary: PatientSummary;
  mode: "demo" | "live";
}) {
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
    const u = new SpeechSynthesisUtterance(speechText(summary));
    u.lang = "bn-BD";
    const bn = voicesRef.current.find((v) => v.lang?.toLowerCase().startsWith("bn"));
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

  // A real consultation result is the patient's to keep — persist it on-device.
  useEffect(() => {
    if (mode !== "live") return;
    try {
      localStorage.setItem(
        "codoctor:record",
        JSON.stringify({ summary, savedAt: new Date().toISOString() })
      );
    } catch {}
  }, [mode, summary]);

  const isSevere = summary.tone === "red" || summary.refer;

  return (
    <Shell onToggleEn={() => setShowEn((v) => !v)} showEn={showEn}>
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5",
          mode === "live"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-emerald-50 text-emerald-700"
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs font-semibold">
          {mode === "live"
            ? "Live summary from your visit · saved to this phone"
            : "Connected to Dr. Rahman · OPD Room 4"}
        </span>
      </div>

      <div className="space-y-4 px-4 py-5">
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

        <button
          onClick={speaking ? stop : speak}
          disabled={!canSpeak}
          className={cn(
            "flex min-h-[3.5rem] w-full items-center justify-center gap-3 rounded-2xl px-5 text-base font-bold shadow-soft transition-all",
            speaking ? "bg-ink text-white" : "bg-brand-600 text-white hover:bg-brand-700",
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

        <Card tone="red" icon={HeartPulse} titleBn="রোগ নির্ণয়" titleEn={showEn ? "Condition" : undefined}>
          <p className="bn text-base font-semibold leading-relaxed text-red-800">
            {summary.conditionBn}
          </p>
          {showEn && <p className="mt-1.5 text-sm text-ink-muted">{summary.conditionEn}</p>}
          <p className="bn mt-3 text-sm leading-relaxed text-ink-soft">{summary.meaningBn}</p>
          {showEn && <p className="mt-1 text-xs text-ink-muted">{summary.meaningEn}</p>}
        </Card>

        <div
          className={cn(
            "overflow-hidden rounded-2xl border-2 shadow-card",
            isSevere ? "border-red-300 bg-red-600 text-white" : "border-brand-200 bg-brand-600 text-white"
          )}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <Hospital className="h-7 w-7 shrink-0" />
            <div>
              <div className="bn text-lg font-bold leading-snug">{summary.actionBn}</div>
              {showEn && <div className="mt-0.5 text-sm text-white/85">{summary.actionEn}</div>}
            </div>
          </div>
        </div>

        <Card tone="amber" icon={Pill} titleBn="ওষুধ" titleEn={showEn ? "Medicines" : undefined}>
          <p className="bn text-sm leading-relaxed text-ink-soft">{summary.medsBn}</p>
          {showEn && <p className="mt-1.5 text-xs text-ink-muted">{summary.medsEn}</p>}
        </Card>

        {summary.prescription && (
          <Card
            tone="brand"
            icon={Pill}
            titleBn="প্রেসক্রিপশন"
            titleEn={showEn ? "Prescription from the doctor" : undefined}
          >
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
              {summary.prescription}
            </p>
          </Card>
        )}

        <Card
          tone="red"
          icon={TriangleAlert}
          titleBn="বিপদের লক্ষণ — সাথে সাথে হাসপাতালে যান"
          titleEn={showEn ? "Danger signs — go to hospital immediately" : undefined}
        >
          <ul className="space-y-2">
            {summary.dangerSignsBn.map((s, i) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                <div>
                  <span className="bn text-sm font-medium text-ink-soft">{s}</span>
                  {showEn && summary.dangerSignsEn[i] && (
                    <span className="block text-xs text-ink-muted">{summary.dangerSignsEn[i]}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {summary.conversation && summary.conversation.length > 0 && (
          <details className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              <span className="bn">কথোপকথন</span>{" "}
              <span className="font-normal text-ink-faint">· Conversation</span>
            </summary>
            <div className="mt-3 space-y-1.5">
              {summary.conversation.map((line, i) => (
                <p
                  key={i}
                  className="bn rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-ink-soft"
                >
                  {line}
                </p>
              ))}
            </div>
          </details>
        )}

        {mode === "live" && summary.citations?.length > 0 && (
          <div className="rounded-xl bg-white p-4 ring-1 ring-inset ring-slate-200">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Based on
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {summary.citations.map((c, i) => {
                const href = citationHref(c.source);
                const cls =
                  "inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-ink-muted ring-1 ring-inset ring-slate-200";
                const body = (
                  <>
                    <ScrollText className="h-3 w-3 text-brand-500" />
                    {c.source} · {c.ref}
                  </>
                );
                return href ? (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(cls, "transition hover:text-brand-700 hover:ring-brand-300")}
                  >
                    {body}
                  </a>
                ) : (
                  <span key={i} className={cls}>
                    {body}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => downloadRecord(summary)}
          className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-ink-soft shadow-soft ring-1 ring-inset ring-slate-200 transition hover:ring-brand-300"
        >
          <Download className="h-4 w-4 text-brand-600" />
          <span className="bn">রেকর্ড সংরক্ষণ করুন</span>
          <span className="font-medium text-ink-muted">Save record</span>
        </button>

        <div className="flex items-start gap-2 rounded-xl bg-white p-4 text-xs text-ink-muted ring-1 ring-inset ring-slate-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <p>
            Processed during your visit and saved to your phone — your record
            stays with you. Codoctor is advisory and does not replace your doctor.
          </p>
        </div>

        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-ink-muted"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Codoctor
        </Link>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ shell */

function Shell({
  children,
  onToggleEn,
  showEn,
}: {
  children: React.ReactNode;
  onToggleEn?: () => void;
  showEn?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 shadow-card">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-slate-50/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <div className="leading-tight">
              <div className="text-sm font-bold text-ink">Codoctor</div>
              <div className="text-[11px] text-ink-muted">Your health record</div>
            </div>
          </div>
          {onToggleEn && (
            <button
              onClick={onToggleEn}
              className={cn(
                "chip ring-1",
                showEn
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-ink-muted ring-slate-200"
              )}
            >
              <Languages className="h-3 w-3" /> EN
            </button>
          )}
        </header>
        {children}
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
    tone === "red" ? "ring-red-100" : tone === "amber" ? "ring-amber-100" : "ring-brand-100";
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
          {titleEn && <div className="text-[11px] text-ink-faint">{titleEn}</div>}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
