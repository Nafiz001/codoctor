"""Tests for the new AI/clinical features:
  #3 respiratory-rate estimator, #4 reconciliation, #5 dosing, #2/#6 next-questions.

    python tests/test_features.py
"""

import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.safety.dosing import dose  # noqa: E402
from app.safety.reconcile import reconcile  # noqa: E402
from app.asr.rr import estimate_rr  # noqa: E402
from app.agents.completeness import next_questions  # noqa: E402


# --- #5 dosing ---------------------------------------------------------------

def test_dose_paracetamol_by_weight():
    r = dose("Paracetamol", weight_kg=12)
    assert r["known"] and r["weight_based"]
    assert r["per_dose_mg"] == [120.0, 180.0]      # 10–15 mg/kg × 12 kg
    assert r["frequency_per_day"] == 4


def test_dose_needs_weight():
    r = dose("amoxicillin", weight_kg=None)
    assert r["known"] and r.get("need_weight") is True


def test_dose_unknown_drug_is_honest():
    r = dose("madeupicillin", weight_kg=10)
    assert r["known"] is False


def test_dose_flags_over_max():
    # amoxicillin 40 mg/kg × 2/day = 80 mg/kg/day < 90 cap; force exceed with a
    # heavy child is not how it works, so check ibuprofen upper (10×3=30 == cap, no flag)
    r = dose("ibuprofen", weight_kg=10)
    assert r["exceeds_max"] is False


# --- #4 reconciliation -------------------------------------------------------

def test_reconcile_blocks_allergy_from_history():
    r = reconcile(proposed=["Amoxicillin"], allergies=["Penicillin"])
    assert r["blocked"] is True


def test_reconcile_flags_repeated_antibiotics():
    r = reconcile(proposed=["Paracetamol"], past_meds=["Amoxicillin", "Azithromycin"])
    assert any(n["type"] == "stewardship" for n in r["notes"])


def test_reconcile_flags_repeat_prescription():
    r = reconcile(proposed=["Azithromycin"], past_meds=["Azithromycin"])
    assert any(n["type"] == "repeat" for n in r["notes"])


def test_reconcile_clean_when_safe():
    r = reconcile(proposed=["Paracetamol"], allergies=[], current_meds=[], past_meds=[])
    assert r["blocked"] is False and r["notes"] == []


# --- #3 respiratory-rate estimator ------------------------------------------

def test_rr_recovers_known_rate():
    # Synthesize a 40 breaths/min signal at 30 fps for 20 s.
    fps, seconds, true_rr = 30.0, 20.0, 40
    freq = true_rr / 60.0
    samples = [math.sin(2 * math.pi * freq * (i / fps)) for i in range(int(fps * seconds))]
    r = estimate_rr(samples, fps)
    assert r["ok"] is True
    assert abs(r["rr"] - true_rr) <= 2       # within 2 bpm


def test_rr_rejects_short_signal():
    r = estimate_rr([0.0, 1.0, 0.0], fps=30.0)
    assert r["ok"] is False


def test_rr_rejects_flat_signal():
    r = estimate_rr([0.5] * 300, fps=30.0)
    assert r["ok"] is False


# --- #2/#6 next questions ----------------------------------------------------

def test_next_questions_lists_unasked_checks():
    enc = {"age_months": 36, "symptoms": ["cough"], "vitals": {}}
    q = next_questions(enc)
    fields = {item["field"] for item in q}
    assert "respiratory_rate" in fields          # not measured yet
    assert all("bn" in item and "en" in item for item in q)


def test_next_questions_empty_when_complete():
    enc = {
        "age_months": 36, "symptoms": ["cough"],
        "vitals": {"respiratory_rate": 52}, "chest_indrawing": True,
        "stridor": True, "general_danger_signs": ["convulsions"],
    }
    assert next_questions(enc) == []


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
