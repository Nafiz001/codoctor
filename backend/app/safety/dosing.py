"""Deterministic weight-based paediatric dosing helper.

Given a drug and the child's weight, it computes the guideline dose range,
frequency, and daily maximum, and flags when a proposed amount would exceed the
ceiling. Pure arithmetic against a small formulary table — no LLM, no guessing;
an unknown drug returns `known: False` rather than an invented dose.
"""

from typing import Optional

CITATION_DOSING = {
    "source": "WHO Pocket Book of Hospital Care for Children / BNF for Children",
    "ref": "Paediatric weight-based dosing",
}

# per_dose_mg_per_kg: (low, high) per single dose
# freq: doses per day · max_mg_per_kg_day: daily ceiling
DOSING = {
    "paracetamol": {"per_dose_mg_per_kg": (10, 15), "freq": 4, "max_mg_per_kg_day": 60,
                    "note": "For fever/pain. Every 4–6 hours as needed."},
    "ibuprofen": {"per_dose_mg_per_kg": (5, 10), "freq": 3, "max_mg_per_kg_day": 30,
                  "note": "Give with food. Avoid in dehydration or asthma with NSAID sensitivity."},
    "amoxicillin": {"per_dose_mg_per_kg": (25, 40), "freq": 2, "max_mg_per_kg_day": 90,
                    "note": "High-dose oral amoxicillin for pneumonia, twice daily."},
    "azithromycin": {"per_dose_mg_per_kg": (10, 10), "freq": 1, "max_mg_per_kg_day": 10,
                     "note": "Once daily, typically 3–5 days."},
    "cefixime": {"per_dose_mg_per_kg": (4, 4), "freq": 2, "max_mg_per_kg_day": 8,
                 "note": "Twice daily."},
    "zinc": {"per_dose_mg_per_kg": (0, 0), "freq": 1, "max_mg_per_kg_day": 0,
             "note": "Age-based, not weight-based: 10 mg/day if <6 months, 20 mg/day if ≥6 months, for 10–14 days."},
}


def _round(x: float) -> float:
    return round(x, 1)


def dose(drug: str, weight_kg: Optional[float], age_months: Optional[int] = None) -> dict:
    key = (drug or "").strip().lower()
    spec = DOSING.get(key)
    if not spec:
        return {
            "known": False,
            "drug": drug,
            "note": f"No standard weight-based paediatric dose on file for {drug}. "
                    "Confirm against the formulary.",
            "citation": CITATION_DOSING,
        }

    if key == "zinc":
        return {
            "known": True, "drug": drug, "weight_based": False,
            "recommendation": spec["note"], "note": spec["note"], "citation": CITATION_DOSING,
        }

    if not weight_kg or weight_kg <= 0:
        return {
            "known": True, "drug": drug, "weight_based": True, "need_weight": True,
            "note": "Enter the child's weight (kg) to compute the dose.",
            "citation": CITATION_DOSING,
        }

    lo, hi = spec["per_dose_mg_per_kg"]
    per_dose_low = _round(lo * weight_kg)
    per_dose_high = _round(hi * weight_kg)
    daily_high = _round(per_dose_high * spec["freq"])
    max_daily = _round(spec["max_mg_per_kg_day"] * weight_kg)
    exceeds = max_daily > 0 and daily_high > max_daily

    return {
        "known": True,
        "drug": drug,
        "weight_based": True,
        "weight_kg": weight_kg,
        "per_dose_mg": [per_dose_low, per_dose_high],
        "frequency_per_day": spec["freq"],
        "daily_mg_estimate": daily_high,
        "max_daily_mg": max_daily,
        "exceeds_max": exceeds,
        "note": (
            f"{spec['note']} "
            + (f"⚠️ The upper range reaches {daily_high} mg/day — cap at "
               f"{max_daily} mg/day." if exceeds else "")
        ).strip(),
        "citation": CITATION_DOSING,
    }
