"""Tests for the deterministic safety engines.

Runs with zero dependencies (stdlib only):
    python tests/test_safety.py
or under pytest:
    pytest
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.safety.imci import classify_ari  # noqa: E402
from app.safety.medsafety import check_medication  # noqa: E402


# --- IMCI danger-sign engine -------------------------------------------------

def test_demo_case_severe_pneumonia():
    """The frontend demo: 3y/o, RR 52, chest indrawing -> severe, refer."""
    r = classify_ari(age_months=36, respiratory_rate=52, chest_indrawing=True)
    assert r["classification"].startswith("Severe pneumonia")
    assert r["refer"] is True
    assert r["severity"] == "critical"


def test_pneumonia_fast_breathing_only():
    r = classify_ari(age_months=36, respiratory_rate=44)
    assert r["classification"] == "Pneumonia"
    assert r["refer"] is False


def test_no_pneumonia():
    r = classify_ari(age_months=36, respiratory_rate=30)
    assert r["classification"].startswith("Cough or cold")


def test_no_rate_is_honest_not_no_pneumonia():
    """No breathing rate + no other sign → 'not classified' (ask for the count),
    NEVER a false 'no pneumonia' all-clear."""
    r = classify_ari(age_months=36, respiratory_rate=None)
    assert r["severity"] == "unknown"
    assert "no pneumonia" not in r["classification"].lower()
    assert r["refer"] is False  # not a refer, but not an all-clear either


def test_age_specific_threshold():
    # 6-month-old: threshold is 50, so RR 48 is NOT fast but RR 52 IS.
    assert classify_ari(age_months=6, respiratory_rate=48)["fast_breathing"] is False
    assert classify_ari(age_months=6, respiratory_rate=52)["classification"] == "Pneumonia"


def test_general_danger_sign_overrides():
    r = classify_ari(age_months=24, respiratory_rate=20,
                     general_danger_signs=["convulsions"])
    assert r["refer"] is True


# --- Medication-safety engine ------------------------------------------------

def test_demo_case_penicillin_allergy():
    """The frontend demo: Amoxicillin blocked by a penicillin allergy."""
    findings = check_medication(proposed=["Amoxicillin"], allergies=["Penicillin"])
    assert any(f["type"] == "allergy" and f["severity"] == "critical" for f in findings)


def test_dangerous_interaction():
    findings = check_medication(proposed=["ciprofloxacin"], current_meds=["tizanidine"])
    assert any(f["type"] == "interaction" for f in findings)


def test_cross_sensitivity_caution():
    findings = check_medication(proposed=["ceftriaxone"], allergies=["penicillin"])
    assert any(f["type"] == "cross-sensitivity" for f in findings)


def test_safe_alternative_passes():
    findings = check_medication(proposed=["azithromycin"], allergies=["penicillin"])
    assert all(f["severity"] != "critical" for f in findings)


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
