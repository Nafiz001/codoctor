"""Codoctor Safety API.

The deterministic, provable core of Codoctor. The frontend's two "catches" — the
WHO IMCI severe-pneumonia danger sign and the penicillin-allergy block — are
served by the rule engines here, not by an LLM.

Run locally:
    uvicorn app.main:app --reload --port 8000
Interactive docs at http://localhost:8000/docs
"""

import io
import os

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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
    LivePromptRequest,
    DoseRequest,
    ReconcileRequest,
    RREstimateRequest,
    SeedCaseRequest,
)
from .safety.imci import classify_ari
from .safety.medsafety import check_medication
from .safety.dosing import dose as compute_dose
from .safety.reconcile import reconcile as reconcile_meds
from .safety.med_screening import screening_questions
from .rag.retriever import HybridRetriever
from .agents.graph import run_consultation, doctor_alerts
from .agents.completeness import next_questions
from .asr.fusion import fuse, transcript_text
from .asr.scribe import extract
from .asr.rr import estimate_rr
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


@app.post("/consult/live-prompts", tags=["agents"])
def consult_live_prompts(req: LivePromptRequest) -> dict:
    """Real-time co-pilot: from the conversation so far, return the guideline
    questions the doctor has not asked yet, plus any danger sign already audible.
    Called every few seconds during the consultation."""
    enc = extract(req.transcript)
    if req.age_months is not None:
        enc["age_months"] = req.age_months
    vitals = enc.get("vitals") or {}
    imci = classify_ari(
        age_months=enc.get("age_months", 36),
        respiratory_rate=vitals.get("respiratory_rate"),
        chest_indrawing=enc.get("chest_indrawing", False),
        stridor=enc.get("stridor", False),
        general_danger_signs=enc.get("general_danger_signs", []),
    )
    red_flags = []
    if imci["refer"]:
        red_flags.append({
            "title": imci["classification"],
            "detail": "; ".join(imci.get("reasons", [])) or imci.get("action", ""),
            "citation": imci.get("citation"),
        })
    # IMCI assessment gaps + medication-screening questions for any drug the
    # doctor has just proposed (e.g. "ask about penicillin allergy before Amoxicillin").
    ask = next_questions(enc) + screening_questions(
        enc.get("proposed_meds", []), req.allergies, req.current_meds
    )
    return {
        "ask_these": ask,
        "red_flags": red_flags,
        "extracted": enc,
    }


@app.post("/assess/dose", tags=["safety"])
def assess_dose(req: DoseRequest) -> dict:
    """Weight-based paediatric dose for a drug (deterministic)."""
    return compute_dose(req.drug, req.weight_kg, req.age_months)


@app.post("/assess/reconcile", tags=["safety"])
def assess_reconcile(req: ReconcileRequest) -> dict:
    """Reconcile a proposed prescription against current + previous-report meds."""
    return reconcile_meds(
        proposed=req.proposed,
        allergies=req.allergies,
        current_meds=req.current_meds,
        past_meds=req.past_meds,
    )


@app.post("/estimate-rr", tags=["asr"])
def estimate_respiratory_rate(req: RREstimateRequest) -> dict:
    """Estimate breaths/min from a per-frame chest breathing signal."""
    return estimate_rr(req.samples, req.fps)


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


# --- Audio transcription (mobile devices upload chunks here) ----------------

@app.post("/transcribe", tags=["asr"])
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form(default="bn"),
) -> dict:
    """Transcribe an audio chunk from a mobile device (m4a/mp4/wav) using
    OpenAI Whisper. Returns {text, conf, language}.

    If OPENAI_API_KEY is not set the endpoint returns a 503 so the mobile
    can fall back to manual text input gracefully.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Speech recognition not configured on this server (OPENAI_API_KEY missing).",
        )

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)

        audio_bytes = await file.read()
        # Whisper needs a filename to infer the format
        filename = file.filename or "audio.m4a"
        audio_buffer = io.BytesIO(audio_bytes)
        audio_buffer.name = filename

        result = await client.audio.transcriptions.create(
            model="whisper-1",
            file=(filename, audio_buffer, file.content_type or "audio/m4a"),
        )
        text = (result.text or "").strip()
        return {"text": text, "conf": 0.85, "language": language}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc


# --- Previous medical report extraction (photo / PDF) -----------------------

_REPORT_PROMPT = (
    "You are a clinical assistant reading a patient's previous medical document "
    "(a prescription, lab report, or discharge slip) that may be in Bangla, "
    "English, or both, and may be handwritten. Extract only what is clearly "
    "present. Respond as compact JSON with exactly these keys: "
    '"conditions" (array of diagnoses/problems), '
    '"medications" (array of drug names, generic if possible), '
    '"allergies" (array), '
    '"summary_en" (one short plain sentence), '
    '"summary_bn" (the same short sentence in simple Bangla). '
    "Use empty arrays/strings when nothing is found. Do not invent anything."
)


def _structure_report_text(client, text: str) -> dict:
    """Ask the LLM to structure already-extracted document text."""
    import json

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _REPORT_PROMPT},
            {"role": "user", "content": f"Document text:\n\n{text[:6000]}"},
        ],
    )
    return json.loads(resp.choices[0].message.content or "{}")


@app.post("/extract-report", tags=["asr"])
async def extract_report(
    file: UploadFile = File(...),
) -> dict:
    """Extract structured medical info from a patient's previous report.

    Accepts a photo (jpg/png — e.g. the doctor photographs a paper slip in the
    field) or a PDF. Uses OpenAI vision for images and text extraction for PDFs.
    Returns {conditions, medications, allergies, summary_en, summary_bn, source}.
    503 if OPENAI_API_KEY is not configured so the app can degrade gracefully.
    """
    import base64
    import json

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Report reading not configured on this server (OPENAI_API_KEY missing).",
        )

    data = await file.read()
    content_type = (file.content_type or "").lower()
    name = (file.filename or "").lower()
    is_pdf = "pdf" in content_type or name.endswith(".pdf")

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        if is_pdf:
            # Text-based PDF → pull text, then structure it.
            try:
                import io as _io
                from pypdf import PdfReader

                reader = PdfReader(_io.BytesIO(data))
                text = "\n".join((p.extract_text() or "") for p in reader.pages)
            except Exception:
                text = ""
            if not text.strip():
                raise HTTPException(
                    status_code=422,
                    detail="Could not read text from this PDF. Try a photo of the report instead.",
                )
            result = _structure_report_text(client, text)
            source = "pdf"
        else:
            # Image → vision extraction.
            mime = content_type if content_type.startswith("image/") else "image/jpeg"
            b64 = base64.b64encode(data).decode()
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": _REPORT_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract from this document image."},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:{mime};base64,{b64}"},
                            },
                        ],
                    },
                ],
            )
            result = json.loads(resp.choices[0].message.content or "{}")
            source = "image"

        # Normalize the shape so the client can rely on it.
        def _as_list(v):
            if isinstance(v, list):
                return [str(x).strip() for x in v if str(x).strip()]
            if isinstance(v, str) and v.strip():
                return [v.strip()]
            return []

        return {
            "conditions": _as_list(result.get("conditions")),
            "medications": _as_list(result.get("medications")),
            "allergies": _as_list(result.get("allergies")),
            "summary_en": str(result.get("summary_en") or "").strip(),
            "summary_bn": str(result.get("summary_bn") or "").strip(),
            "source": source,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report extraction failed: {exc}") from exc


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


@app.get("/session/{sid}/live-transcript", tags=["session"])
def session_live_transcript(sid: str) -> dict:
    """Fuse both devices' live transcripts on demand so the doctor's screen can
    show one reconciled conversation in real time (source-tagged: A=doctor,
    B=patient). Deterministic fusion only — no LLM, cheap to poll."""
    tr = sessions.transcripts(sid)
    if tr is None:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    device_a, device_b = tr
    fused = fuse(device_a, device_b)
    return {
        "fused": fused,
        "counts": {"doctor": len(device_a), "patient": len(device_b)},
        "recovered_count": sum(1 for s in fused if s["recovered"]),
    }


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


@app.post("/session/{sid}/seed-case", tags=["session"])
def session_seed_case(sid: str, req: SeedCaseRequest) -> dict:
    """Load a reproducible demo case: seed the transcript with the dialogue (so
    the live conversation view fills in) and run the analysis on the structured
    encounter — deterministic, independent of live ASR — then publish the summary
    to the patient's phone. Returns the same shape as /session/{id}/analyze."""
    if sessions.get(sid) is None:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    for seg in req.transcript:
        sessions.append(sid, seg.role, seg.text, 0.95)

    patient = req.patient.model_dump()
    encounter = req.encounter.model_dump()
    analysis = run_consultation(patient, encounter)
    summary = build_summary(analysis, patient)
    session = sessions.publish(sid, summary, analysis)

    device_a, device_b = sessions.transcripts(sid) or ([], [])
    fused = fuse(device_a, device_b)
    return {
        "session": session,
        "summary": summary,
        "analysis": analysis,
        "fused_transcript": fused,
        "extracted_encounter": encounter,
        "seeded": True,
    }


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
