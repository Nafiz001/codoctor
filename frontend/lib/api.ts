// Client for the Codoctor backend (FastAPI on Render).
// If NEXT_PUBLIC_API_URL is unset or the call fails/times out, callers fall back
// to the scripted demo — so the cockpit never breaks if the backend is asleep.

// Sanitize the env value: a BOM / zero-width char or stray whitespace at the
// front (easy to introduce when setting the var) makes the URL lose its scheme,
// so the browser resolves it relative to the Vercel origin and every call 404s.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "")
  .replace(/\s/g, "") // strip BOM/zero-width/whitespace (a BOM here drops the URL scheme → 404)
  .replace(/\/+$/, "");

export interface Citation {
  source: string;
  ref: string;
}

export interface TraceStep {
  agent: string;
  title: string;
  detail: string;
  status: string;
  citation?: Citation;
}

export interface ImciResult {
  classification: string;
  severity: string;
  refer: boolean;
  reasons: string[];
  action: string;
  citation?: Citation;
}

export interface MedFinding {
  type: string;
  severity: string;
  drug: string;
  reason: string;
  action?: string;
  interacts_with?: string;
  citation?: Citation;
}

export interface SafetyResult {
  imci?: ImciResult;
  medication?: MedFinding[];
}

export interface DifferentialItem {
  condition: string;
  score: number;
  rationale: string;
  citation: Citation;
}

export interface Completeness {
  recommended?: string[];
  confirmed?: string[];
  also_check?: string[];
  citation?: Citation;
}

export interface DoctorRedFlag {
  kind: string;
  title: string;
  detail: string;
  action?: string;
  citation?: Citation;
}

export interface DoctorAsk {
  text: string;
  citation?: Citation;
}

export interface DoctorConsider {
  condition: string;
  rationale: string;
  citation?: Citation;
}

/** Prioritised, doctor-facing helper — the "second pair of eyes" for the clinician. */
export interface DoctorAlerts {
  red_flags: DoctorRedFlag[];
  ask_these: DoctorAsk[];
  cautions: DoctorRedFlag[];
  consider: DoctorConsider[];
  count: number;
}

export interface ConsultResult {
  grounded: boolean;
  refused: boolean;
  answer_bn: string;
  answer_en: string;
  citations: Citation[];
  safety: SafetyResult;
  differential?: DifferentialItem[];
  completeness?: Completeness;
  doctor_alerts?: DoctorAlerts;
  retrieval_passes: number;
  trace: TraceStep[];
  llm_narration: boolean;
}

export interface ConsultPayload {
  patient: { allergies?: string[]; current_meds?: string[] };
  encounter: {
    age_months: number;
    symptoms?: string[];
    vitals?: Record<string, number>;
    chest_indrawing?: boolean;
    stridor?: boolean;
    general_danger_signs?: string[];
    proposed_meds?: string[];
  };
}

async function withTimeout(input: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

/** Run the live agentic orchestrator. Returns null if the backend is unavailable. */
export async function analyzeConsultation(
  payload: ConsultPayload,
  timeoutMs = 15000
): Promise<ConsultResult | null> {
  if (!API_URL) return null;
  try {
    const res = await withTimeout(
      `${API_URL}/consult/analyze`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      timeoutMs
    );
    if (!res.ok) return null;
    return (await res.json()) as ConsultResult;
  } catch {
    return null;
  }
}

export interface FusedSegment {
  t: number;
  speaker: string;
  text: string;
  conf: number;
  recovered: boolean;
  recovered_tokens?: string[];
  sources: string[];
}

export interface ExtractedEncounter {
  symptoms?: string[];
  vitals?: Record<string, number>;
  chest_indrawing?: boolean;
  general_danger_signs?: string[];
  proposed_meds?: string[];
  age_months?: number;
}

export interface FromTranscriptResult {
  fused_transcript: FusedSegment[];
  extracted_encounter: ExtractedEncounter;
  analysis: ConsultResult;
}

export interface FromTranscriptPayload {
  patient: { allergies?: string[]; current_meds?: string[] };
  device_a: { t: number; speaker: string; text: string; conf: number }[];
  device_b: { t: number; speaker: string; text: string; conf: number }[];
  age_months?: number;
}

/** Full pipeline: fuse two device transcripts → extract → analyze. Null if unavailable. */
export async function analyzeFromTranscript(
  payload: FromTranscriptPayload,
  timeoutMs = 20000
): Promise<FromTranscriptResult | null> {
  if (!API_URL) return null;
  try {
    const res = await withTimeout(
      `${API_URL}/consult/from-transcript`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      timeoutMs
    );
    if (!res.ok) return null;
    return (await res.json()) as FromTranscriptResult;
  } catch {
    return null;
  }
}

// --- Live session: the real two-device flow joined by a QR code -------------

/** Patient-facing summary, built by the backend from the live analysis. */
export interface PatientSummary {
  conditionBn: string;
  conditionEn: string;
  meaningBn: string;
  meaningEn: string;
  actionBn: string;
  actionEn: string;
  medsBn: string;
  medsEn: string;
  dangerSignsBn: string[];
  dangerSignsEn: string[];
  tone: "red" | "amber" | "brand";
  refer: boolean;
  citations: Citation[];
}

export interface SessionState {
  id: string;
  status: "waiting" | "ready";
  patient: { allergies?: string[]; current_meds?: string[] };
  devices: { doctor: boolean; patient: boolean };
  counts: { doctor: number; patient: number };
  summary: PatientSummary | null;
  created_at: number;
}

export interface SessionAnalyzeResult extends FromTranscriptResult {
  session: SessionState;
  summary: PatientSummary;
  seeded?: boolean;
}

const jsonHeaders = { "Content-Type": "application/json" };

/** Fire-and-forget ping to wake a sleeping free-tier backend ahead of use. */
export function warmBackend(): void {
  if (!API_URL) return;
  fetch(`${API_URL}/health`).catch(() => {});
}

/** Open a new live session (doctor console). Null if backend unavailable. */
export async function createSession(patient: {
  allergies?: string[];
  current_meds?: string[];
}): Promise<SessionState | null> {
  if (!API_URL) return null;
  try {
    const res = await withTimeout(
      `${API_URL}/session/create`,
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ patient }) },
      75000 // a cold Render free-tier server can take ~50–60s to wake
    );
    if (!res.ok) return null;
    return (await res.json()) as SessionState;
  } catch {
    return null;
  }
}

/** Poll a session's state (status, who's joined, published summary). */
export async function getSession(sid: string): Promise<SessionState | null> {
  if (!API_URL) return null;
  try {
    const res = await withTimeout(`${API_URL}/session/${sid}`, {}, 12000);
    if (!res.ok) return null;
    return (await res.json()) as SessionState;
  } catch {
    return null;
  }
}

/** Announce that a device has joined the session. */
export async function joinSession(
  sid: string,
  role: "doctor" | "patient"
): Promise<SessionState | null> {
  if (!API_URL) return null;
  try {
    const res = await withTimeout(
      `${API_URL}/session/${sid}/join`,
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ role }) },
      12000
    );
    if (!res.ok) return null;
    return (await res.json()) as SessionState;
  } catch {
    return null;
  }
}

/** Stream one recognized utterance from a device into the session. */
export async function appendTranscript(
  sid: string,
  role: "doctor" | "patient",
  text: string,
  conf = 0.9
): Promise<SessionState | null> {
  if (!API_URL) return null;
  try {
    const res = await withTimeout(
      `${API_URL}/session/${sid}/transcript`,
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ role, text, conf }) },
      12000
    );
    if (!res.ok) return null;
    return (await res.json()) as SessionState;
  } catch {
    return null;
  }
}

/** Fuse both devices' transcripts → analyze → publish summary to the session. */
export async function analyzeSession(
  sid: string,
  payload: {
    patient: { allergies?: string[]; current_meds?: string[] };
    age_months?: number;
    proposed_meds?: string[];
  },
  timeoutMs = 35000
): Promise<SessionAnalyzeResult | null> {
  if (!API_URL) return null;
  try {
    const res = await withTimeout(
      `${API_URL}/session/${sid}/analyze`,
      { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) },
      timeoutMs
    );
    if (!res.ok) return null;
    return (await res.json()) as SessionAnalyzeResult;
  } catch {
    return null;
  }
}

/** One-tap golden-path replay: run the canonical seeded consultation through the
 *  real pipeline and publish its summary to the session. No second device needed. */
export async function runSessionDemo(
  sid: string,
  timeoutMs = 45000
): Promise<SessionAnalyzeResult | null> {
  if (!API_URL) return null;
  try {
    const res = await withTimeout(
      `${API_URL}/session/${sid}/demo`,
      { method: "POST", headers: jsonHeaders },
      timeoutMs
    );
    if (!res.ok) return null;
    return (await res.json()) as SessionAnalyzeResult;
  } catch {
    return null;
  }
}

/** Clear the transcript to run another consultation in the same session. */
export async function resetSession(sid: string): Promise<SessionState | null> {
  if (!API_URL) return null;
  try {
    const res = await withTimeout(
      `${API_URL}/session/${sid}/reset`,
      { method: "POST", headers: jsonHeaders },
      12000
    );
    if (!res.ok) return null;
    return (await res.json()) as SessionState;
  } catch {
    return null;
  }
}
