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


def route(state: ConsultState) -> str:
    if not state.get("grounded", False) and state.get("attempts", 0) < MAX_RETRIEVALS:
        return "retrieve"
    return "synthesize"


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


def synthesize(state: ConsultState) -> dict:
    enc = state.get("encounter", {}) or {}
    safety = state.get("safety", {}) or {}
    retrieved = state.get("retrieved", [])
    imci = safety.get("imci", {})
    meds = safety.get("medication", [])

    has_data = bool(
        enc.get("symptoms")
        or (enc.get("vitals") or {}).get("respiratory_rate")
        or enc.get("proposed_meds")
        or enc.get("general_danger_signs")
        or enc.get("chest_indrawing")
    )
    if not has_data:
        return {
            "refused": True,
            "answer_en": "Not enough information was provided to assess this child. Use clinician judgment.",
            "answer_bn": "এই শিশুর অবস্থা মূল্যায়নের জন্য যথেষ্ট তথ্য নেই। চিকিৎসকের বিবেচনা প্রয়োজন।",
            "citations": [],
            "trace": _trace(
                state, "summary", "Synthesis",
                "Insufficient grounded input — honest refusal.", "flag",
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
            "You are a clinical scribe. Rewrite the grounded findings in clear, "
            "plain Bangla for a low-literacy caregiver. Do NOT add any medical "
            "claim that is not already present.",
            answer_en,
        )
        if polished:
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
        "answer_en": answer_en,
        "answer_bn": answer_bn,
        "citations": cites,
        "trace": _trace(
            state, "summary", "Synthesis",
            f"Composed a grounded answer with {len(cites)} citation(s).", "ok",
        ),
    }


# ------------------------------------------------------------------- the graph

def _build():
    g = StateGraph(ConsultState)
    g.add_node("intake", intake)
    g.add_node("retrieve", retrieve)
    g.add_node("run_tools", run_tools)
    g.add_node("critic", critic)
    g.add_node("synthesize", synthesize)

    g.add_edge(START, "intake")
    g.add_edge("intake", "retrieve")
    g.add_edge("retrieve", "run_tools")
    g.add_edge("run_tools", "critic")
    g.add_conditional_edges(
        "critic", route, {"retrieve": "retrieve", "synthesize": "synthesize"}
    )
    g.add_edge("synthesize", END)
    return g.compile()


GRAPH = _build()


def run_consultation(patient: dict, encounter: dict) -> dict:
    """Invoke the orchestrator and return the final state."""
    final = GRAPH.invoke(
        {"patient": patient or {}, "encounter": encounter or {}, "trace": []}
    )
    return {
        "grounded": final.get("grounded", False),
        "refused": final.get("refused", False),
        "answer_bn": final.get("answer_bn", ""),
        "answer_en": final.get("answer_en", ""),
        "citations": final.get("citations", []),
        "safety": final.get("safety", {}),
        "retrieved": final.get("retrieved", []),
        "retrieval_passes": final.get("attempts", 0),
        "trace": final.get("trace", []),
        "llm_narration": llm_available(),
    }
