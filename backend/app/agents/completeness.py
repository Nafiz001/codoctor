"""Completeness agent.

For a child presenting with cough / difficult breathing, WHO IMCI prescribes a
fixed assessment: count the breaths, look for chest indrawing, look/listen for
stridor, and check the general danger signs. This agent lists those recommended
checks and surfaces the ones that don't yet have a positive finding — a quiet
co-pilot checklist, not a grade. Cited to the IMCI assess step.
"""

from typing import Dict

RECOMMENDED = [
    ("respiratory_rate", "count the breaths in one minute"),
    ("chest_indrawing", "look for lower chest-wall indrawing"),
    ("stridor", "look and listen for stridor in a calm child"),
    ("danger_signs", "check the general danger signs (drink/feed, vomiting, convulsions, consciousness)"),
]

# Bilingual phrasing for a real-time prompt the doctor sees mid-consultation.
ASKS = {
    "respiratory_rate": (
        "Count the breaths in one full minute.",
        "এক মিনিটে শ্বাসের হার গুনুন।",
    ),
    "chest_indrawing": (
        "Look for lower chest-wall indrawing.",
        "বুকের নিচের অংশ টেনে শ্বাস নিচ্ছে কিনা দেখুন।",
    ),
    "stridor": (
        "Listen for stridor in a calm child.",
        "শান্ত অবস্থায় স্ট্রিডর (শ্বাসে শোঁ শোঁ শব্দ) আছে কিনা শুনুন।",
    ),
    "danger_signs": (
        "Check the general danger signs (able to drink, vomiting, convulsions, consciousness).",
        "সাধারণ বিপদ-চিহ্ন যাচাই করুন (পান করতে পারছে কিনা, বমি, খিঁচুনি, অচেতন)।",
    ),
}


def next_questions(encounter: Dict) -> list:
    """The guideline-recommended IMCI checks not yet positively confirmed —
    phrased as short bilingual prompts. Drives the live 'ask this next' co-pilot
    and the targeted-refusal message. Empty when the assessment is complete or
    the case isn't a respiratory one."""
    comp = completeness(encounter)
    pending = set(comp.get("also_check", []))
    out = []
    for key, label in RECOMMENDED:
        if label in pending and key in ASKS:
            en, bn = ASKS[key]
            out.append({"field": key, "en": en, "bn": bn, "citation": comp["citation"]})
    return out


def completeness(encounter: Dict) -> Dict:
    vitals = encounter.get("vitals") or {}
    symptoms = set(encounter.get("symptoms", []) or [])
    respiratory = bool(symptoms & {"fast_breathing", "cough"}) or (
        vitals.get("respiratory_rate") is not None
    )

    positive = {
        "respiratory_rate": vitals.get("respiratory_rate") is not None,
        "chest_indrawing": bool(encounter.get("chest_indrawing")),
        "stridor": bool(encounter.get("stridor")),
        "danger_signs": bool(encounter.get("general_danger_signs")),
    }

    if not respiratory:
        return {"recommended": [], "also_check": [], "confirmed": [], "citation": _cite()}

    confirmed = [label for key, label in RECOMMENDED if positive[key]]
    also_check = [label for key, label in RECOMMENDED if not positive[key]]
    return {
        "recommended": [label for _, label in RECOMMENDED],
        "confirmed": confirmed,
        "also_check": also_check,
        "citation": _cite(),
    }


def _cite() -> Dict:
    return {"source": "WHO IMCI chart booklet", "ref": "Cough or difficult breathing — Assess"}
