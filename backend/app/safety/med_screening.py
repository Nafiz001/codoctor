"""Medication screening prompts — the questions to ask BEFORE prescribing.

The med-safety engine (medsafety.py) blocks a drug when a risk is already KNOWN
(a recorded allergy, an interacting current med). This complements it: when the
doctor proposes a drug and the relevant history is still UNKNOWN, surface the
question they should ask first — "check for a penicillin allergy", "ask about
asthma / stomach ulcer before an NSAID" — so a side effect isn't missed.

Deterministic lookup by drug class; each prompt carries its citation.
"""

from .data import DRUG_CLASS, CITATION_FORMULARY
from .medsafety import check_medication, _norm

# class -> (english prompt, bangla prompt) — {drug} is filled with the drug name
SCREENING = {
    "penicillin": (
        "Before {drug}: ask whether the patient has a penicillin allergy.",
        "{drug} দেওয়ার আগে: রোগীর পেনিসিলিন অ্যালার্জি আছে কিনা জিজ্ঞাসা করুন।",
    ),
    "cephalosporin": (
        "Before {drug}: ask about a penicillin / cephalosporin allergy.",
        "{drug} দেওয়ার আগে: পেনিসিলিন/সেফালোস্পোরিন অ্যালার্জি আছে কিনা জিজ্ঞাসা করুন।",
    ),
    "nsaid": (
        "Before {drug}: ask about asthma, stomach ulcer/bleeding, and dehydration or kidney problems.",
        "{drug} দেওয়ার আগে: হাঁপানি, পেটে আলসার/রক্তপাত, এবং পানিশূন্যতা বা কিডনি সমস্যা আছে কিনা জিজ্ঞাসা করুন।",
    ),
    "macrolide": (
        "Before {drug}: review the current medicines — macrolides interact with several drugs.",
        "{drug} দেওয়ার আগে: বর্তমান ওষুধ যাচাই করুন — ম্যাক্রোলাইড অনেক ওষুধের সাথে বিক্রিয়া করে।",
    ),
    "fluoroquinolone": (
        "Before {drug}: avoid in children where possible; check current medicines for interactions.",
        "{drug} দেওয়ার আগে: শিশুদের জন্য যথাসম্ভব এড়িয়ে চলুন; বর্তমান ওষুধের সাথে বিক্রিয়া যাচাই করুন।",
    ),
}


def screening_questions(proposed, allergies=None, current_meds=None) -> list:
    """For each proposed drug whose risk isn't already flagged, return the
    history question the doctor should ask before prescribing it."""
    proposed = proposed or []
    # Drugs whose risk is already KNOWN are handled by the red-flag path — skip them.
    findings = check_medication(proposed=proposed, allergies=allergies, current_meds=current_meds)
    blocked = {f["drug"] for f in findings if f["severity"] == "critical"}

    out, seen = [], set()
    for p in proposed:
        d = _norm(p)
        if d in blocked:
            continue
        cls = DRUG_CLASS.get(d)
        tmpl = SCREENING.get(cls)
        if not tmpl or cls in seen:
            continue
        seen.add(cls)
        en, bn = tmpl
        out.append({
            "field": f"med_screen_{cls}",
            "en": en.format(drug=p.title()),
            "bn": bn.format(drug=p.title()),
            "citation": CITATION_FORMULARY,
        })
    return out
