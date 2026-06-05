// Client for the Codoctor backend (FastAPI on Render).
// If NEXT_PUBLIC_API_URL is unset or the call fails/times out, callers fall back
// to the scripted demo — so the cockpit never breaks if the backend is asleep.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

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

export interface ConsultResult {
  grounded: boolean;
  refused: boolean;
  answer_bn: string;
  answer_en: string;
  citations: Citation[];
  safety: Record<string, unknown>;
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
