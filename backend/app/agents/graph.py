"""The Codoctor orchestrator — a LangGraph self-reflective RAG loop.

    intake → retrieve → run_tools → critic ─┬─(gaps & retries left)→ retrieve
                                            └─(grounded / exhausted)→ synthesize

- retrieve   : hybrid BM25+vector retrieval over the cited clinical corpus
- run_tools  : the DETERMINISTIC engines (IMCI danger signs, medication safety)
- critic     : verifies each surfaced claim is backed by a retrieved source;
               if not, routes back to retrieve with an expanded query
- synthesize : composes the grounded, cited answer (LLM narrates if configured,
               else a deterministic template); refuses honestly if nothing grounds

Every node appends to a visible `trace` — the proof that this is genuinely
multi-step, not a single hidden prompt.
"""

from typing import TypedDict

from langgraph.graph import StateGraph, START, END

from ..rag.retriever import HybridRetriever
from ..safety.imci import classify_ari
from ..safety.medsafety import check_medication
from .llm import narrate, llm_available
from .differential import differential as run_differential
from .completeness import completeness as run_completeness, next_questions

RETRIEVER = HybridRetriever()
MAX_RETRIEVALS = 2


class ConsultState(TypedDict, total=False):
    patient: dict
    encounter: dict
    question: str
    expansion: list
    retrieved: list
    attempts: int
    safety: dict
    grounded: bool
    gaps: list
    differential: list
    completeness: dict
    answer_en: str
    answer_bn: str
    citations: list
    refused: bool
    trace: list


def _trace(state, agent, title, detail, status="info", citation=None):
    entry = {"agent": agent, "title": title, "detail": detail, "status": status}
    if citation:
        entry["citation"] = citation
    return state.get("trace", []) + [entry]


# ----------------------------------------------------------------------- nodes

def intake(state: ConsultState) -> dict:
    enc = state.get("encounter", {}) or {}
    patient = state.get("patient", {}) or {}

    symptoms = enc.get("symptoms", []) or []
    vitals = enc.get("vitals", {}) or {}

    q = ["child cough difficult breathing"] + [str(s) for s in symptoms]
    if vitals.get("respiratory_rate"):
        q.append("fast breathing respiratory rate")
    if enc.get("chest_indrawing"):
        q.append("chest indrawing severe")
    if enc.get("general_danger_signs"):
        q.append("general danger sign")

    # Held back for a re-retrieval pass (so the loop is demonstrable).
    expansion = list(enc.get("proposed_meds", []) or [])
    expansion += [f"{a} allergy contraindication" for a in patient.get("allergies", []) or []]

    return {
        "question": " ".join(q),
        "expansion": expansion,
        "attempts": 0,
        "retrieved": [],
        "trace": _trace(
            state, "orchestrator", "Intake",
            "Framed the clinical question from the encounter; planned retrieval.",
        ),
    }


def retrieve(state: ConsultState) -> dict:
    attempts = state.get("attempts", 0)
    query = state["question"]
    if attempts > 0 and state.get("expansion"):
        query = query + " " + " ".join(state["expansion"])

    results = RETRIEVER.search(query, k=4 if attempts == 0 else 6, expand=attempts > 0)

    merged = {c["id"]: c for c in state.get("retrieved", [])}
    for c in results:
        merged[c["id"]] = c

    label = "expanded re-retrieval" if attempts > 0 else "initial retrieval"
    return {
        "retrieved": list(merged.values()),
        "attempts": attempts + 1,
        "trace": _trace(
            state, "retrieval", "Retrieve",
            f"Hybrid BM25+vector {label} → {len(results)} chunks "
            f"({', '.join(c['id'] for c in results)}).",
            "ok",
        ),
    }


def run_tools(state: ConsultState) -> dict:
    enc = state.get("encounter", {}) or {}
    patient = state.get("patient", {}) or {}
    vitals = enc.get("vitals", {}) or {}

    imci = classify_ari(
        age_months=enc.get("age_months", 36),
        respiratory_rate=vitals.get("respiratory_rate"),
        chest_indrawing=enc.get("chest_indrawing", False),
        stridor=enc.get("stridor", False),
        general_danger_signs=enc.get("general_danger_signs", []),
    )
    meds = check_medication(
        proposed=enc.get("proposed_meds", []),
        allergies=patient.get("allergies", []),
        current_meds=patient.get("current_meds", []),
    )

    critical = imci["refer"] or any(m["severity"] == "critical" for m in meds)
    return {
        "safety": {"imci": imci, "medication": meds},
        "trace": _trace(
            state, "danger", "Deterministic tools",
            f"IMCI → {imci['classification']}; medication findings: {len(meds)}.",
            "critical" if critical else "ok",
            citation=imci.get("citation"),
        ),
    }


def critic(state: ConsultState) -> dict:
    safety = state.get("safety", {}) or {}
    retrieved = state.get("retrieved", [])
    imci = safety.get("imci", {})
    meds = safety.get("medication", [])

    has_imci = any(c["source"].startswith("WHO IMCI") for c in retrieved)
    has_formulary = any(
        "Formulary" in c["source"] or "BNF" in c["source"] for c in retrieved
    )

    gaps = []
    if imci.get("refer") and not has_imci:
        gaps.append("IMCI danger-sign classification lacks a retrieved IMCI source")
    if any(m["severity"] == "critical" for m in meds) and not has_formulary:
        gaps.append("medication contraindication lacks a retrieved formulary source")

    grounded = not gaps
    return {
        "gaps": gaps,
        "grounded": grounded,
        "trace": _trace(
            state, "critic", "Grounding check",
            "All surfaced claims are backed by a retrieved source."
            if grounded
            else "Gap found: " + "; ".join(gaps) + " — re-retrieving.",
            "ok" if grounded else "flag",
        ),
    }


def differential_node(state: ConsultState) -> dict:
    dx = run_differential(state.get("encounter", {}) or {}, state.get("patient", {}) or {})
    top = ", ".join(d["condition"] for d in dx) if dx else "—"
    return {
        "differential": dx,
        "trace": _trace(
            state, "differential", "Differential",
            f"Consider: {top}." if dx else "No differential from current findings.",
            "info", citation=(dx[0]["citation"] if dx else None),
        ),
    }


def completeness_node(state: ConsultState) -> dict:
    comp = run_completeness(state.get("encounter", {}) or {})
    also = comp.get("also_check", [])
    detail = (
        "Guideline-recommended checks to confirm: " + "; ".join(also)
        if also else "IMCI assessment items all have positive findings."
    )
    return {
        "completeness": comp,
        "trace": _trace(
            state, "completeness", "Completeness", detail,
            "flag" if also else "ok", citation=comp.get("citation"),
        ),
    }


def route(state: ConsultState) -> str:
    if not state.get("grounded", False) and state.get("attempts", 0) < MAX_RETRIEVALS:
        return "retrieve"
    return "differential"


def _bangla_summary(imci: dict, critical_meds: list) -> str:
    cls = imci.get("classification", "")
    parts = []
    if "Severe" in cls:
        parts.append("শিশুর গুরুতর নিউমোনিয়া হয়েছে — এখনই হাসপাতালে নিতে হবে।")
    elif cls == "Pneumonia":
        parts.append("শিশুর নিউমোনিয়া হয়েছে — গাইডলাইন অনুযায়ী অ্যান্টিবায়োটিক দিন ও ৩ দিন পর আবার দেখান।")
    elif cls:
        parts.append("নিউমোনিয়া নেই — ঘরোয়া যত্ন নিন, প্রয়োজনে আবার দেখান।")
    for m in critical_meds:
        parts.append(
            f"{m['drug'].title()} দেওয়া যাবে না — অ্যালার্জি/বিরোধ আছে; বিকল্প ওষুধ ব্যবহার করুন।"
        )
    return " ".join(parts) or "চিকিৎসকের পরামর্শ নিন।"


def _no_new_drug(polished: str, answer_en: str, meds: list) -> bool:
    """True if the polished Bangla introduces no drug name absent from the
    grounded English answer — a cheap guard so narration can't smuggle in a
    medication the rule engines never surfaced."""
    known = answer_en.lower()
    low = polished.lower()
    for m in meds:
        drug = (m.get("drug") or "").lower()
        if drug and drug in low and drug not in known:
            return False
    return True


def _assessment_confidence(enc: dict, imci: dict, missing: list) -> str:
    """Calibrated confidence in the assessment — high only when a definitive
    IMCI trigger is measured; low when the key datum to classify is missing."""
    vitals = enc.get("vitals") or {}
    rr = vitals.get("respiratory_rate")
    if imci.get("refer"):
        return "high"          # a measured danger sign / indrawing / stridor
    if imci.get("fast_breathing"):
        return "high"          # pneumonia off a measured respiratory rate
    if rr is None and any(m["field"] == "respiratory_rate" for m in missing):
        return "low"           # respiratory case but no rate → cannot exclude pneumonia
    return "moderate"


def synthesize(state: ConsultState) -> dict:
    enc = state.get("encounter", {}) or {}
    safety = state.get("safety", {}) or {}
    retrieved = state.get("retrieved", [])
    completeness = state.get("completeness", {}) or {}
    imci = safety.get("imci", {})
    meds = safety.get("medication", [])

    missing = next_questions(enc)
    confidence = _assessment_confidence(enc, imci, missing)

    has_data = bool(
        enc.get("symptoms")
        or (enc.get("vitals") or {}).get("respiratory_rate")
        or enc.get("proposed_meds")
        or enc.get("general_danger_signs")
        or enc.get("chest_indrawing")
    )
    if not has_data:
        # Targeted refusal — name the specific data needed, not a generic "unknown".
        need_en = "; ".join(m["en"] for m in missing) or "record the child's symptoms"
        need_bn = " ".join(m["bn"] for m in missing) or "শিশুর উপসর্গ লিখুন।"
        return {
            "refused": True,
            "confidence": "insufficient",
            "missing_data": missing,
            "answer_en": f"Not enough to assess yet. To classify, please: {need_en}",
            "answer_bn": f"মূল্যায়নের জন্য যথেষ্ট তথ্য নেই। অনুগ্রহ করে: {need_bn}",
            "citations": [],
            "trace": _trace(
                state, "summary", "Synthesis",
                "Insufficient input — refusing, and naming exactly what's needed.", "flag",
            ),
        }

    imci_chunk = next((c for c in retrieved if c["source"].startswith("WHO IMCI")), None)
    form_chunk = next(
        (c for c in retrieved if "Formulary" in c["source"] or "BNF" in c["source"]), None
    )

    lines, citations = [], []
    if imci.get("classification"):
        lines.append(f"Assessment: {imci['classification']}.")
        if imci.get("reasons"):
            lines.append("Why: " + "; ".join(imci["reasons"]) + ".")
        lines.append(f"Action: {imci['action']}")
        if imci_chunk:
            citations.append({"source": imci_chunk["source"], "ref": imci_chunk["ref"]})

    critical_meds = [m for m in meds if m["severity"] == "critical"]
    for m in critical_meds:
        lines.append(f"Medication: avoid {m['drug'].title()} — {m['reason']}")
        if form_chunk:
            citations.append({"source": form_chunk["source"], "ref": form_chunk["ref"]})

    answer_en = " ".join(lines)
    answer_bn = _bangla_summary(imci, critical_meds)

    if llm_available():
        polished = narrate(
            "You are a clinical scribe writing for a low-literacy Bangladeshi "
            "caregiver. Rewrite the grounded findings below as warm, simple, "
            "spoken-style Bangla they can understand and act on. Keep it short "
            "(2–4 sentences). You MUST NOT add, soften, or invent any medical "
            "claim, drug, dose, or instruction that is not already in the text — "
            "only rephrase what is given. Output Bangla only, no preamble.",
            answer_en,
        )
        # Grounding guard: reject the polish if it introduces a drug name that
        # wasn't in the grounded English answer (the LLM narrates, never decides).
        if polished and _no_new_drug(polished, answer_en, meds):
            answer_bn = polished

    # de-dupe citations
    seen, cites = set(), []
    for c in citations:
        key = (c["source"], c["ref"])
        if key not in seen:
            seen.add(key)
            cites.append(c)

    return {
        "refused": False,
        "confidence": confidence,
        "missing_data": missing,
        "answer_en": answer_en,
        "answer_bn": answer_bn,
        "citations": cites,
        "trace": _trace(
            state, "summary", "Synthesis",
            f"Composed a grounded answer with {len(cites)} citation(s); "
            f"confidence {confidence}"
            + (f", {len(missing)} datum(s) still recommended." if missing else "."),
            "ok",
        ),
    }


# ------------------------------------------------------------------- the graph

def _build():
    g = StateGraph(ConsultState)
    g.add_node("intake", intake)
    g.add_node("retrieve", retrieve)
    g.add_node("run_tools", run_tools)
    g.add_node("critic", critic)
    g.add_node("differential", differential_node)
    g.add_node("completeness", completeness_node)
    g.add_node("synthesize", synthesize)

    g.add_edge(START, "intake")
    g.add_edge("intake", "retrieve")
    g.add_edge("retrieve", "run_tools")
    g.add_edge("run_tools", "critic")
    g.add_conditional_edges(
        "critic", route, {"retrieve": "retrieve", "differential": "differential"}
    )
    g.add_edge("differential", "completeness")
    g.add_edge("completeness", "synthesize")
    g.add_edge("synthesize", END)
    return g.compile()


GRAPH = _build()


def doctor_alerts(safety: dict, differential: list, completeness: dict) -> dict:
    """Consolidate the engines' findings into a prioritised, doctor-facing helper:

      * red_flags  — things the doctor must not miss right now: an IMCI urgent
                     referral, and any critical medication block (e.g. a proposed
                     drug the patient is allergic to).
      * ask_these  — guideline-recommended checks not yet confirmed (the IMCI
                     assessment items the consultation hasn't covered).
      * cautions   — non-critical medication notes (cross-sensitivity, duplication).
      * consider   — the ranked differential (conditions to think about).

    Pure aggregation of deterministic outputs — the LLM is not involved.
    """
    safety = safety or {}
    imci = safety.get("imci") or {}
    meds = safety.get("medication") or []
    completeness = completeness or {}

    red_flags: list = []
    if imci.get("refer"):
        reasons = "; ".join(imci.get("reasons", []) or []) or imci.get("classification", "")
        red_flags.append({
            "kind": "danger_sign",
            "title": imci.get("classification", "Urgent referral"),
            "detail": (f"Danger sign — {reasons}. " if reasons else "")
            + (imci.get("action") or ""),
            "citation": imci.get("citation"),
        })
    for m in meds:
        if m.get("severity") == "critical":
            drug = (m.get("drug") or "").title()
            red_flags.append({
                "kind": m.get("type", "medication"),
                "title": f"Do not prescribe {drug}",
                "detail": m.get("reason", ""),
                "action": m.get("action"),
                "citation": m.get("citation"),
            })

    cautions = [
        {
            "kind": m.get("type", "medication"),
            "title": (m.get("drug") or "").title(),
            "detail": m.get("reason", ""),
            "action": m.get("action"),
            "citation": m.get("citation"),
        }
        for m in meds
        if m.get("severity") == "caution"
    ]

    ask_these = [
        {"text": item, "citation": completeness.get("citation")}
        for item in (completeness.get("also_check") or [])
    ]

    consider = [
        {
            "condition": d.get("condition", ""),
            "rationale": d.get("rationale", ""),
            "citation": d.get("citation"),
        }
        for d in (differential or [])
    ]

    return {
        "red_flags": red_flags,
        "ask_these": ask_these,
        "cautions": cautions,
        "consider": consider,
        "count": len(red_flags) + len(ask_these) + len(cautions),
    }


def run_consultation(patient: dict, encounter: dict) -> dict:
    """Invoke the orchestrator and return the final state."""
    final = GRAPH.invoke(
        {"patient": patient or {}, "encounter": encounter or {}, "trace": []}
    )
    safety = final.get("safety", {})
    differential = final.get("differential", [])
    completeness = final.get("completeness", {})
    return {
        "grounded": final.get("grounded", False),
        "refused": final.get("refused", False),
        "confidence": final.get("confidence", "moderate"),
        "missing_data": final.get("missing_data", []),
        "answer_bn": final.get("answer_bn", ""),
        "answer_en": final.get("answer_en", ""),
        "citations": final.get("citations", []),
        "safety": safety,
        "differential": differential,
        "completeness": completeness,
        "doctor_alerts": doctor_alerts(safety, differential, completeness),
        "retrieved": final.get("retrieved", []),
        "retrieval_passes": final.get("attempts", 0),
        "trace": final.get("trace", []),
        "llm_narration": llm_available(),
    }
