"""Codoctor evaluation harness.

Produces honest, reproducible numbers on our OWN system for the report's Results
section: the deterministic safety engines (IMCI classification, danger-sign
recall/specificity, medication catch-rate / false-positives) and the agentic
orchestrator (grounding rate, citation presence, refusal accuracy).

    python eval/run_eval.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.safety.imci import classify_ari  # noqa: E402
from app.safety.medsafety import check_medication  # noqa: E402

# The orchestrator pulls in langgraph. The deterministic safety engines above do
# not — so if langgraph isn't installed we still report the IMCI and medication
# numbers rather than crashing. (`pip install -r requirements.txt` enables the
# full run including the orchestrator section.)
try:
    from app.agents.graph import run_consultation  # noqa: E402
    ORCH_AVAILABLE = True
except Exception as _exc:  # pragma: no cover - environment-dependent
    run_consultation = None
    ORCH_AVAILABLE = False
    _ORCH_IMPORT_ERROR = _exc


def kw(classification: str) -> str:
    if classification.startswith("Severe"):
        return "severe"
    if classification == "Pneumonia":
        return "pneumonia"
    return "none"


# (age_months, rr, indrawing, stridor, danger_signs, expected_kw, expected_refer)
IMCI_CASES = [
    (36, 52, True, False, [], "severe", True),     # demo case
    (36, 44, False, False, [], "pneumonia", False),
    (36, 30, False, False, [], "none", False),
    (6, 48, False, False, [], "none", False),       # threshold 50
    (6, 52, False, False, [], "pneumonia", False),
    (24, 20, False, False, ["convulsions"], "severe", True),
    (48, 60, True, False, [], "severe", True),
    (11, 55, False, False, [], "pneumonia", False),  # infant threshold 50
    (11, 45, False, False, [], "none", False),
    (36, 40, False, False, [], "pneumonia", False),  # exactly at threshold
    (36, 39, False, False, [], "none", False),
    (30, 30, False, True, [], "severe", True),       # stridor
    (6, 50, False, False, [], "pneumonia", False),   # exactly at infant threshold (50)
    (59, 40, False, False, [], "pneumonia", False),  # oldest band, exactly at threshold (40)
    (59, 39, False, False, [], "none", False),       # just below the child threshold
    (12, 40, False, False, [], "pneumonia", False),  # band boundary: 12mo uses the 40 cut-off
    (24, 35, True, False, [], "severe", True),        # indrawing drives severe with a NORMAL rate
]

# (proposed, allergies, current, expected_blocked)
MED_CASES = [
    (["amoxicillin"], ["penicillin"], [], True),       # demo allergy
    (["ciprofloxacin"], [], ["tizanidine"], True),     # interaction
    (["warfarin"], [], ["aspirin"], True),             # interaction
    (["ampicillin"], ["amoxicillin"], [], True),       # same-class allergy
    (["azithromycin"], ["penicillin"], [], False),     # safe alternative
    (["paracetamol"], ["penicillin"], [], False),      # unrelated
    (["ceftriaxone"], ["penicillin"], [], False),      # caution, not blocked
    (["salbutamol"], [], [], False),                   # safe
    (["warfarin"], [], ["ibuprofen"], True),           # NSAID + anticoagulant interaction
    (["clarithromycin"], [], ["warfarin"], True),      # macrolide potentiates warfarin
    (["co-amoxiclav"], ["penicillin"], [], True),      # penicillin-class allergy
    (["cephalexin"], ["penicillin"], [], False),       # cross-sensitivity = caution, not blocked
    (["levofloxacin"], [], ["tizanidine"], False),     # not the ciprofloxacin pair -> safe
]

# (patient, encounter, expect_grounded, expect_refused)
ORCH_CASES = [
    (
        {"allergies": ["Penicillin"], "current_meds": ["Salbutamol"]},
        {"age_months": 36, "symptoms": ["fever", "cough"], "vitals": {"respiratory_rate": 52},
         "chest_indrawing": True, "proposed_meds": ["Amoxicillin"]},
        True, False,
    ),
    (
        {},
        {"age_months": 36, "symptoms": ["cough"], "vitals": {"respiratory_rate": 44}},
        True, False,
    ),
    (
        {},
        {"age_months": 11, "symptoms": ["fever", "cough"], "vitals": {"respiratory_rate": 55}},
        True, False,  # infant pneumonia (RR 55 >= 50)
    ),
    ({}, {"age_months": 36}, False, True),  # no data -> honest refusal
]


def pct(n, d):
    return f"{(100.0 * n / d):.0f}%" if d else "n/a"


def main():
    # ---- IMCI ----
    imci_correct = refer_tp = refer_fn = refer_fp = refer_tn = 0
    refer_pos = refer_neg = 0
    for age, rr, ind, strid, ds, ekw, erefer in IMCI_CASES:
        r = classify_ari(age_months=age, respiratory_rate=rr, chest_indrawing=ind,
                         stridor=strid, general_danger_signs=ds)
        if kw(r["classification"]) == ekw:
            imci_correct += 1
        if erefer:
            refer_pos += 1
            refer_tp += 1 if r["refer"] else 0
            refer_fn += 0 if r["refer"] else 1
        else:
            refer_neg += 1
            refer_fp += 1 if r["refer"] else 0
            refer_tn += 1 if not r["refer"] else 0

    # ---- Medication ----
    med_caught = med_unsafe = med_fp = med_safe = 0
    for proposed, allergies, current, eblocked in MED_CASES:
        f = check_medication(proposed=proposed, allergies=allergies, current_meds=current)
        blocked = any(x["severity"] == "critical" for x in f)
        if eblocked:
            med_unsafe += 1
            med_caught += 1 if blocked else 0
        else:
            med_safe += 1
            med_fp += 1 if blocked else 0

    # ---- Orchestrator ----
    orch_ground_ok = orch_ground_total = 0
    orch_refuse_ok = orch_refuse_total = 0
    orch_cited = orch_cited_total = 0
    if ORCH_AVAILABLE:
        for patient, enc, eg, er in ORCH_CASES:
            res = run_consultation(patient, enc)
            if er:
                orch_refuse_total += 1
                orch_refuse_ok += 1 if res["refused"] else 0
            else:
                orch_ground_total += 1
                orch_ground_ok += 1 if res["grounded"] else 0
                orch_cited_total += 1
                orch_cited += 1 if len(res["citations"]) > 0 else 0

    # ---- Report ----
    print("=" * 60)
    print("CODOCTOR — EVALUATION RESULTS")
    print("=" * 60)
    print(f"\nIMCI danger-sign engine (N={len(IMCI_CASES)})")
    print(f"  Classification accuracy : {imci_correct}/{len(IMCI_CASES)} ({pct(imci_correct, len(IMCI_CASES))})")
    print(f"  Danger-sign recall      : {refer_tp}/{refer_pos} ({pct(refer_tp, refer_pos)})  [missed referrals: {refer_fn}]")
    print(f"  Specificity (no false referral): {refer_tn}/{refer_neg} ({pct(refer_tn, refer_neg)})  [false referrals: {refer_fp}]")
    print(f"\nMedication-safety engine (N={len(MED_CASES)})")
    print(f"  Catch rate (unsafe blocked): {med_caught}/{med_unsafe} ({pct(med_caught, med_unsafe)})")
    print(f"  False-positive (safe blocked): {med_fp}/{med_safe} ({pct(med_fp, med_safe)})")
    print(f"\nAgentic orchestrator (N={len(ORCH_CASES)})")
    if ORCH_AVAILABLE:
        print(f"  Grounding rate          : {orch_ground_ok}/{orch_ground_total} ({pct(orch_ground_ok, orch_ground_total)})")
        print(f"  Citation present        : {orch_cited}/{orch_cited_total} ({pct(orch_cited, orch_cited_total)})")
        print(f"  Refusal accuracy        : {orch_refuse_ok}/{orch_refuse_total} ({pct(orch_refuse_ok, orch_refuse_total)})")
    else:
        print(f"  SKIPPED — orchestrator deps not installed ({type(_ORCH_IMPORT_ERROR).__name__}: {_ORCH_IMPORT_ERROR}).")
        print("  Run `pip install -r requirements.txt` to include this section.")
    print("=" * 60)

    safety_ok = (
        imci_correct == len(IMCI_CASES)
        and refer_fn == 0
        and med_caught == med_unsafe
        and med_fp == 0
    )
    orch_ok = (
        orch_ground_ok == orch_ground_total
        and orch_refuse_ok == orch_refuse_total
    )
    ok = safety_ok and (orch_ok if ORCH_AVAILABLE else True)
    print("ALL TARGETS MET" if ok else "SOME TARGETS MISSED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
