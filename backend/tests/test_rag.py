"""Tests for the RAG retriever and the agentic orchestrator."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.rag.retriever import HybridRetriever  # noqa: E402
from app.agents.graph import run_consultation  # noqa: E402

R = HybridRetriever()

DEMO_PATIENT = {"allergies": ["Penicillin"], "current_meds": ["Salbutamol"]}
DEMO_ENCOUNTER = {
    "age_months": 36,
    "symptoms": ["fever", "cough"],
    "vitals": {"respiratory_rate": 52},
    "chest_indrawing": True,
    "proposed_meds": ["Amoxicillin"],
}


# --- retrieval ---------------------------------------------------------------

def test_retrieval_finds_imci_for_symptoms():
    ids = [c["id"] for c in R.search("child fast breathing chest indrawing", k=4)]
    assert any(i.startswith("imci") for i in ids), ids


def test_retrieval_finds_formulary_for_drug():
    ids = [c["id"] for c in R.search("amoxicillin penicillin allergy", k=3)]
    assert "nf-amoxicillin" in ids, ids


def test_retrieval_handles_bangla():
    ids = [c["id"] for c in R.search("নিউমোনিয়া শ্বাস", k=3)]
    assert len(ids) > 0


# --- orchestrator ------------------------------------------------------------

def test_orchestrator_demo_is_grounded_and_cited():
    res = run_consultation(DEMO_PATIENT, DEMO_ENCOUNTER)
    assert res["grounded"] is True
    assert res["refused"] is False
    assert res["safety"]["imci"]["refer"] is True
    sources = {c["source"] for c in res["citations"]}
    assert any(s.startswith("WHO IMCI") for s in sources), sources
    assert any("Formulary" in s for s in sources), sources
    assert "নিউমোনিয়া" in res["answer_bn"]


def test_orchestrator_self_reflective_loop_runs():
    # The medication contraindication isn't grounded on the first (symptom-only)
    # pass, so the critic forces a second, expanded retrieval.
    res = run_consultation(DEMO_PATIENT, DEMO_ENCOUNTER)
    assert res["retrieval_passes"] >= 2
    statuses = [t["status"] for t in res["trace"] if t["agent"] == "critic"]
    assert "flag" in statuses and "ok" in statuses, statuses


def test_orchestrator_refuses_without_data():
    res = run_consultation({}, {"age_months": 36})
    assert res["refused"] is True


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items())
             if k.startswith("test_") and callable(v)]
    passed = 0
    for fn in tests:
        try:
            fn()
            print(f"PASS  {fn.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"FAIL  {fn.__name__}: {e}")
        except Exception as e:  # noqa: BLE001
            print(f"ERROR {fn.__name__}: {e!r}")
    print(f"\n{passed}/{len(tests)} passed")
    sys.exit(0 if passed == len(tests) else 1)
