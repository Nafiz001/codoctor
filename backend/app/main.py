"""Codoctor Safety API.

The deterministic, provable core of Codoctor. The frontend's two "catches" — the
WHO IMCI severe-pneumonia danger sign and the penicillin-allergy block — are
served by the rule engines here, not by an LLM.

Run locally:
    uvicorn app.main:app --reload --port 8000
Interactive docs at http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    ChildAssessment,
    MedicationCheck,
    RagQuery,
    ConsultRequest,
    FuseRequest,
    FromTranscriptRequest,
)
from .safety.imci import classify_ari
from .safety.medsafety import check_medication
from .rag.retriever import HybridRetriever
from .agents.graph import run_consultation
from .asr.fusion import fuse, transcript_text
from .asr.scribe import extract

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


@app.post("/consult/from-transcript", tags=["asr"])
def consult_from_transcript(req: FromTranscriptRequest) -> dict:
    """End-to-end: fuse two device transcripts → extract structure → analyze."""
    fused = fuse(
        [s.model_dump() for s in req.device_a],
        [s.model_dump() for s in req.device_b],
    )
    encounter = extract(transcript_text(fused))
    if req.age_months is not None:
        encounter["age_months"] = req.age_months
    analysis = run_consultation(req.patient.model_dump(), encounter)
    return {
        "fused_transcript": fused,
        "extracted_encounter": encounter,
        "analysis": analysis,
    }
