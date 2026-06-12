"""Tests for the Differential and Completeness agents + their place in the graph."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents.differential import differential  # noqa: E402
from app.agents.completeness import completeness  # noqa: E402
from app.agents.graph import run_consultation, doctor_alerts  # noqa: E402

DEMO_ENC = {
    "age_months": 36,
    "symptoms": ["fever", "cough", "fast_breathing"],
    "vitals": {"respiratory_rate": 52},
    "chest_indrawing": True,
}


def test_differential_ranks_severe_top_and_cites():
    dx = differential(DEMO_ENC, {"current_meds": ["Salbutamol"]})
    assert dx[0]["condition"].startswith("Severe pneumonia")
    assert any(d["condition"] == "Pneumonia" for d in dx)
    assert all("citation" in d and d["citation"]["source"] for d in dx)
    assert len(dx) <= 3


def test_completeness_flags_unconfirmed_checks():
    comp = completeness(DEMO_ENC)
    # RR + indrawing are positive; stridor + danger signs are not yet confirmed
    assert any("stridor" in x for x in comp["also_check"])
    assert any("danger" in x for x in comp["also_check"])
    assert any("breaths" in x for x in comp["confirmed"])  # RR was counted


def test_completeness_silent_when_not_respiratory():
    comp = completeness({"symptoms": [], "vitals": {}})
    assert comp["also_check"] == []


def test_orchestrator_emits_differential_and_completeness():
    res = run_consultation(
        {"allergies": ["Penicillin"], "current_meds": ["Salbutamol"]},
        {"age_months": 36, "symptoms": ["fever", "cough"], "vitals": {"respiratory_rate": 52},
         "chest_indrawing": True, "proposed_meds": ["Amoxicillin"]},
    )
    assert len(res["differential"]) >= 2
    assert "also_check" in res["completeness"]
    agents = [t["agent"] for t in res["trace"]]
    assert "differential" in agents and "completeness" in agents
    # still grounded + cited + refer
    assert res["grounded"] and res["safety"]["imci"]["refer"]


def test_doctor_alerts_surfaces_danger_and_allergy():
    res = run_consultation(
        {"allergies": ["Penicillin"]},
        {"age_months": 36, "symptoms": ["fever", "cough"], "vitals": {"respiratory_rate": 52},
         "chest_indrawing": True, "proposed_meds": ["Amoxicillin"]},
    )
    da = res["doctor_alerts"]
    kinds = {f["kind"] for f in da["red_flags"]}
    # the danger sign AND the drug-allergy block both surface as red flags
    assert "danger_sign" in kinds
    assert "allergy" in kinds
    assert any("Amoxicillin" in f["title"] for f in da["red_flags"])
    # every red flag carries a citation; unconfirmed checks are surfaced to ask
    assert all(f.get("citation") for f in da["red_flags"])
    assert len(da["ask_these"]) >= 1
    assert da["count"] >= 2


def test_doctor_alerts_quiet_when_nothing_flagged():
    # a plain cold with no proposed meds and no allergies → no red flags
    da = doctor_alerts(
        {"imci": {"refer": False, "classification": "Cough or cold (no pneumonia)"},
         "medication": []},
        [], {"also_check": []},
    )
    assert da["red_flags"] == []
    assert da["cautions"] == []
    assert da["count"] == 0


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
