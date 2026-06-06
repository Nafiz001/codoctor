"""Codoctor Safety API.

The deterministic, provable core of Codoctor. The frontend's two "catches" — the
WHO IMCI severe-pneumonia danger sign and the penicillin-allergy block — are
served by the rule engines here, not by an LLM.

Run locally:
    uvicorn app.main:app --reload --port 8000
Interactive docs at http://localhost:8000/docs
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    ChildAssessment,
    MedicationCheck,
    RagQuery,
    ConsultRequest,
    FuseRequest,
    FromTranscriptRequest,
    SessionCreateRequest,
    JoinRequest,
    TranscriptAppend,
    SessionAnalyzeRequest,
)
from .safety.imci import classify_ari
from .safety.medsafety import check_medication
from .rag.retriever import HybridRetriever
from .agents.graph import run_consultation
from .asr.fusion import fuse, transcript_text
from .asr.scribe import extract
from .sessions import store as sessions
from .sessions.summary import build_summary
from .sessions.demo_seed import (
    DEMO_PATIENT,
    DEMO_AGE_MONTHS,
    DEMO_PROPOSED_MEDS,
    DEMO_DEVICE_A,
    DEMO_DEVICE_B,
)

RETRIEVER = HybridRetriever()

app = FastAPI(
    title="Codoctor Safety API",
    version="0.1.0",
    description=(
        "Deterministic clinical safety tools — WHO IMCI danger-sign "
        "classification and medication-safety checks. Advisory & non-diagnostic; "
        "the clinician is always the decision-maker."
    ),
)

# Open CORS for the public demo (frontend on Vercel + localhost).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
def root() -> dict:
    return {
        "name": "Codoctor Safety API",
        "status": "ok",
        "advisory": "Deterministic decision support. Not a diagnosis. Confirm with a clinician.",
        "endpoints": [
            "/health",
            "/assess/danger-signs",
            "/assess/medication",
            "/rag/search",
            "/consult/analyze",
            "/transcript/fuse",
            "/consult/from-transcript",
            "/session/create",
            "/session/{id}",
            "/docs",
        ],
    }


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}


@app.post("/assess/danger-signs", tags=["safety"])
def assess_danger_signs(assessment: ChildAssessment) -> dict:
    """Run the WHO IMCI cough/difficult-breathing decision tree."""
    return classify_ari(
        age_months=assessment.age_months,
        respiratory_rate=assessment.respiratory_rate,
        chest_indrawing=assessment.chest_indrawing,
        stridor=assessment.stridor,
        general_danger_signs=assessment.general_danger_signs,
    )


@app.post("/assess/medication", tags=["safety"])
def assess_medication(check: MedicationCheck) -> dict:
    """Check a proposed prescription for allergy, interaction & duplication risk."""
    findings = check_medication(
        proposed=check.proposed,
        allergies=check.allergies,
        current_meds=check.current_meds,
    )
    return {
        "findings": findings,
        "blocked": any(f["severity"] == "critical" for f in findings),
    }


@app.post("/rag/search", tags=["rag"])
def rag_search(q: RagQuery) -> dict:
    """Hybrid retrieval over the cited clinical corpus."""
    return {"query": q.query, "results": RETRIEVER.search(q.query, k=q.k)}


@app.post("/consult/analyze", tags=["agents"])
def consult_analyze(req: ConsultRequest) -> dict:
    """Run the full agentic RAG orchestrator (retrieve → tools → critic → synthesize)."""
    return run_consultation(req.patient.model_dump(), req.encounter.model_dump())


@app.post("/transcript/fuse", tags=["asr"])
def transcript_fuse(req: FuseRequest) -> dict:
    """Reconcile two device transcripts into one high-confidence transcript."""
    fused = fuse(
        [s.model_dump() for s in req.device_a],
        [s.model_dump() for s in req.device_b],
    )
    return {
        "fused": fused,
        "segments": len(fused),
        "recovered_count": sum(1 for s in fused if s["recovered"]),
    }


def _from_transcript(
    patient: dict,
    device_a: list,
    device_b: list,
    age_months=None,
    extra_meds=None,
) -> dict:
    """Shared pipeline: fuse two device transcripts → extract → analyze."""
    fused = fuse(device_a, device_b)
    encounter = extract(transcript_text(fused))
    if age_months is not None:
        encounter["age_months"] = age_months
    if extra_meds:
        seen, merged = set(), []
        for m in (encounter.get("proposed_meds") or []) + list(extra_meds):
            key = m.strip().lower()
            if key and key not in seen:
                seen.add(key)
                merged.append(m)
        encounter["proposed_meds"] = merged
    analysis = run_consultation(patient, encounter)
    return {
        "fused_transcript": fused,
        "extracted_encounter": encounter,
        "analysis": analysis,
    }


@app.post("/consult/from-transcript", tags=["asr"])
def consult_from_transcript(req: FromTranscriptRequest) -> dict:
    """End-to-end: fuse two device transcripts → extract structure → analyze."""
    return _from_transcript(
        req.patient.model_dump(),
        [s.model_dump() for s in req.device_a],
        [s.model_dump() for s in req.device_b],
        age_months=req.age_months,
    )


# --- Live session: the real two-device flow joined by a QR code ------------


@app.post("/session/create", tags=["session"])
def session_create(req: SessionCreateRequest) -> dict:
    """Doctor console opens a session; the QR encodes its id for the patient."""
    return sessions.create(req.patient.model_dump())


@app.get("/session/{sid}", tags=["session"])
def session_get(sid: str) -> dict:
    """Both devices poll this for status, who's joined, and the published summary."""
    rec = sessions.get(sid)
    if not rec:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return rec


@app.post("/session/{sid}/join", tags=["session"])
def session_join(sid: str, req: JoinRequest) -> dict:
    """A device announces it has joined (doctor or patient)."""
    rec = sessions.join(sid, req.role)
    if not rec:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return rec


@app.post("/session/{sid}/transcript", tags=["session"])
def session_transcript(sid: str, req: TranscriptAppend) -> dict:
    """Stream one recognized utterance from a device into the session."""
    rec = sessions.append(sid, req.role, req.text, req.conf)
    if not rec:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return rec


@app.post("/session/{sid}/analyze", tags=["session"])
def session_analyze(sid: str, req: SessionAnalyzeRequest) -> dict:
    """Fuse both devices' live transcripts → extract → orchestrate → publish the
    patient summary into the session for the phone to pick up."""
    tr = sessions.transcripts(sid)
    if tr is None:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    device_a, device_b = tr
    if not device_a and not device_b:
        raise HTTPException(
            status_code=400, detail="No speech captured yet — start listening first."
        )
    result = _from_transcript(
        req.patient.model_dump(),
        device_a,
        device_b,
        age_months=req.age_months,
        extra_meds=req.proposed_meds,
    )
    summary = build_summary(result["analysis"], req.patient.model_dump())
    session = sessions.publish(sid, summary, result["analysis"])
    return {"session": session, "summary": summary, **result}


@app.post("/session/{sid}/reset", tags=["session"])
def session_reset(sid: str) -> dict:
    """Clear the transcript to run another consultation in the same session."""
    rec = sessions.reset(sid)
    if not rec:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return rec


@app.post("/session/{sid}/demo", tags=["session"])
def session_demo(sid: str) -> dict:
    """One-tap golden-path replay: run the canonical seeded pediatric-ARI
    consultation through the REAL pipeline (fuse → Scribe → orchestrate),
    publish the patient summary into the session, and return the full result.
    Deterministic — no second device, live ASR, or room noise required."""
    result = _from_transcript(
        dict(DEMO_PATIENT),
        list(DEMO_DEVICE_A),
        list(DEMO_DEVICE_B),
        age_months=DEMO_AGE_MONTHS,
        extra_meds=list(DEMO_PROPOSED_MEDS),
    )
    summary = build_summary(result["analysis"], dict(DEMO_PATIENT))
    session = sessions.publish(sid, summary, result["analysis"])
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return {"session": session, "summary": summary, "seeded": True, **result}
