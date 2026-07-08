// Codoctor API client — adapted from the web app for React Native fetch
// Falls back to scripted demo mode when the backend is unavailable

export const API_URL = 'https://codoctor-api-afdkbhe8d4bpffb5.centralindia-01.azurewebsites.net';

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

export interface MissingDatum {
  field: string;
  en: string;
  bn: string;
  citation?: Citation;
}

export interface ConsultResult {
  grounded: boolean;
  refused: boolean;
  confidence?: 'high' | 'moderate' | 'low' | 'insufficient';
  missing_data?: MissingDatum[];
  answer_bn: string;
  answer_en: string;
  citations: Citation[];
  safety: SafetyResult;
  differential?: DifferentialItem[];
  retrieval_passes: number;
  trace: TraceStep[];
  llm_narration: boolean;
}

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
  tone: 'red' | 'amber' | 'brand';
  refer: boolean;
  citations: Citation[];
}

export interface SessionState {
  id: string;
  status: 'waiting' | 'ready';
  patient: { allergies?: string[]; current_meds?: string[] };
  devices: { doctor: boolean; patient: boolean };
  counts: { doctor: number; patient: number };
  summary: PatientSummary | null;
  created_at: number;
}

async function withTimeout<T>(
  url: string,
  init: RequestInit,
  ms: number
): Promise<T | null> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

const jsonHeaders = { 'Content-Type': 'application/json' };

/** Transcribe an audio chunk from the device. Returns null if unavailable. */
export async function transcribeAudio(
  uri: string,
  language = 'bn'
): Promise<{ text: string; conf: number } | null> {
  if (!API_URL) return null;
  try {
    const filename = uri.split('/').pop() ?? 'audio.m4a';
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: 'audio/m4a',
    } as unknown as Blob);
    formData.append('language', language);
    const res = await fetch(`${API_URL}/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return null;
    return await res.json() as { text: string; conf: number };
  } catch {
    return null;
  }
}

export function warmBackend(): void {
  fetch(`${API_URL}/health`).catch(() => {});
}

export interface ReportExtract {
  conditions: string[];
  medications: string[];
  allergies: string[];
  summary_en: string;
  summary_bn: string;
  source: string;
}

/**
 * Upload a previous medical report (photo or PDF) so the backend can extract
 * conditions / medications / allergies to inform the consultation.
 * Returns null on any failure (no key, unreadable file, network) so the caller
 * can carry on without the report.
 */
export async function extractReport(
  uri: string,
  mimeType = 'image/jpeg',
  name = 'report.jpg'
): Promise<ReportExtract | null> {
  if (!API_URL) return null;
  try {
    const formData = new FormData();
    formData.append('file', { uri, name, type: mimeType } as unknown as Blob);
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch(`${API_URL}/extract-report`, {
        method: 'POST',
        body: formData,
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      return (await res.json()) as ReportExtract;
    } finally {
      clearTimeout(id);
    }
  } catch {
    return null;
  }
}

export async function createSession(patient: {
  allergies?: string[];
  current_meds?: string[];
}): Promise<SessionState | null> {
  return withTimeout<SessionState>(
    `${API_URL}/session/create`,
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ patient }) },
    75000
  );
}

export async function getSession(sid: string): Promise<SessionState | null> {
  return withTimeout<SessionState>(`${API_URL}/session/${sid}`, {}, 12000);
}

export async function joinSession(
  sid: string,
  role: 'doctor' | 'patient'
): Promise<SessionState | null> {
  return withTimeout<SessionState>(
    `${API_URL}/session/${sid}/join`,
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ role }) },
    12000
  );
}

export async function appendTranscript(
  sid: string,
  role: 'doctor' | 'patient',
  text: string,
  conf = 0.9
): Promise<SessionState | null> {
  return withTimeout<SessionState>(
    `${API_URL}/session/${sid}/transcript`,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ role, text, conf }),
    },
    12000
  );
}

export interface SessionAnalyzeResult {
  fused_transcript: unknown[];
  extracted_encounter: unknown;
  analysis: ConsultResult;
  session: SessionState;
  summary: PatientSummary;
  seeded?: boolean;
}

export async function runSessionDemo(
  sid: string,
  timeoutMs = 45000
): Promise<SessionAnalyzeResult | null> {
  return withTimeout<SessionAnalyzeResult>(
    `${API_URL}/session/${sid}/demo`,
    { method: 'POST', headers: jsonHeaders },
    timeoutMs
  );
}

export async function analyzeSession(
  sid: string,
  payload: {
    patient: { allergies?: string[]; current_meds?: string[] };
    age_months?: number;
    proposed_meds?: string[];
  },
  timeoutMs = 35000
): Promise<SessionAnalyzeResult | null> {
  return withTimeout<SessionAnalyzeResult>(
    `${API_URL}/session/${sid}/analyze`,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    },
    timeoutMs
  );
}

export async function resetSession(sid: string): Promise<SessionState | null> {
  return withTimeout<SessionState>(
    `${API_URL}/session/${sid}/reset`,
    { method: 'POST', headers: jsonHeaders },
    12000
  );
}

// ── New AI-feature clients ───────────────────────────────────────────────────

export interface LivePrompts {
  ask_these: MissingDatum[];
  red_flags: { title: string; detail: string; citation?: Citation }[];
  extracted: Record<string, unknown>;
}

/** Real-time co-pilot: partial transcript → next guideline questions + red flags. */
export async function livePrompts(
  transcript: string,
  ageMonths?: number,
  allergies: string[] = [],
  currentMeds: string[] = []
): Promise<LivePrompts | null> {
  return withTimeout<LivePrompts>(
    `${API_URL}/consult/live-prompts`,
    {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({ transcript, age_months: ageMonths, allergies, current_meds: currentMeds }),
    },
    12000
  );
}

export interface ReconcileResult {
  findings: MedFinding[];
  notes: { type: string; severity: string; reason: string; citation?: Citation }[];
  blocked: boolean;
}

/** Reconcile a proposed prescription against current + previous-report meds. */
export async function reconcileMeds(payload: {
  proposed: string[]; allergies?: string[]; current_meds?: string[]; past_meds?: string[];
}): Promise<ReconcileResult | null> {
  return withTimeout<ReconcileResult>(
    `${API_URL}/assess/reconcile`,
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify(payload) },
    12000
  );
}

export interface RrEstimate { ok: boolean; rr: number | null; confidence: number; reason?: string; note?: string }

/** Estimate breaths/min from a per-frame chest breathing signal. */
export async function estimateRR(samples: number[], fps: number): Promise<RrEstimate | null> {
  return withTimeout<RrEstimate>(
    `${API_URL}/estimate-rr`,
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ samples, fps }) },
    12000
  );
}
