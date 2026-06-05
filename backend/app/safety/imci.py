"""WHO IMCI danger-sign classifier for cough / difficult breathing.

Deterministic decision tree — the same logic a trained health worker applies with
the IMCI chart booklet. No ML, no LLM: given the measured signs it returns a
classification, an urgency, the action, and the exact reasons that fired.
"""

from typing import Optional

from .data import FAST_BREATHING, GENERAL_DANGER_SIGNS, CITATION_IMCI


def fast_breathing_threshold(age_months: int) -> Optional[int]:
    """Return the breaths/min threshold for the child's age band, or None if
    outside the IMCI 2-month–5-year window."""
    for low, high, threshold in FAST_BREATHING:
        if low <= age_months < high:
            return threshold
    return None


def classify_ari(
    age_months: int,
    respiratory_rate: Optional[int] = None,
    chest_indrawing: bool = False,
    stridor: bool = False,
    general_danger_signs: Optional[list] = None,
) -> dict:
    """Classify a child with cough or difficult breathing per WHO IMCI."""
    present_danger = sorted(set(general_danger_signs or []) & GENERAL_DANGER_SIGNS)
    threshold = fast_breathing_threshold(age_months)
    fast = (
        respiratory_rate is not None
        and threshold is not None
        and respiratory_rate >= threshold
    )

    reasons: list[str] = []
    if present_danger:
        reasons.append("general danger sign: " + ", ".join(present_danger))
    if chest_indrawing:
        reasons.append("lower chest-wall indrawing")
    if stridor:
        reasons.append("stridor in a calm child")

    # 1) Severe — any general danger sign, chest indrawing, or stridor
    if present_danger or chest_indrawing or stridor:
        classification = "Severe pneumonia or very severe disease"
        severity = "critical"
        refer = True
        action = (
            "URGENT referral to hospital. Give the first pre-referral antibiotic "
            "dose per protocol, keep the child warm, and treat to prevent low "
            "blood sugar."
        )
    # 2) Pneumonia — fast breathing only
    elif fast:
        classification = "Pneumonia"
        severity = "moderate"
        refer = False
        action = (
            "Oral antibiotic per guideline; soothe the throat; advise return "
            "signs; follow up in 3 days."
        )
        reasons.append(
            f"fast breathing: RR {respiratory_rate} ≥ {threshold}/min for age"
        )
    # 3) No pneumonia
    else:
        classification = "Cough or cold (no pneumonia)"
        severity = "low"
        refer = False
        action = "Home care; soothe the throat; advise when to return. No antibiotic."
        if respiratory_rate is not None and threshold is not None:
            reasons.append(
                f"RR {respiratory_rate} < {threshold}/min — not fast for age"
            )

    return {
        "classification": classification,
        "severity": severity,
        "refer": refer,
        "fast_breathing": fast,
        "age_threshold": threshold,
        "reasons": reasons,
        "action": action,
        "citation": CITATION_IMCI,
    }
