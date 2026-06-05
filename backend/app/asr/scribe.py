"""Scribe — deterministic clinical entity extraction.

Turns a (fused) Bangla/English consultation transcript into the structured
encounter the orchestrator expects: symptoms, vitals, chest indrawing, general
danger signs, proposed medicines, and age. Lexicon + regex based, scoped to the
pediatric ARI domain (an LLM/NER model is a drop-in upgrade; this runs keyless).
"""

import re
from typing import Dict, List, Optional

BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

_NUM_WORDS = {
    "এক": 1, "দুই": 2, "তিন": 3, "চার": 4, "পাঁচ": 5, "ছয়": 6, "সাত": 7,
    "আট": 8, "নয়": 9, "দশ": 10,
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
}

# canonical symptom -> trigger phrases (English + Bangla)
SYMPTOM_LEX = {
    "fever": ["fever", "জ্বর"],
    "cough": ["cough", "কাশি"],
    "fast_breathing": [
        "fast breathing", "rapid breathing", "দ্রুত শ্বাস", "শ্বাস দ্রুত",
        "দ্রুত শ্বাস নিচ্ছে", "শ্বাস কষ্ট",
    ],
    "poor_feeding": [
        "poor feeding", "not eating", "খেতে চাইছে না", "খাচ্ছে না", "খেতে পারছে না",
    ],
    "vomiting": ["vomit", "বমি"],
}

DANGER_LEX = {
    "convulsions": ["convulsion", "fit", "খিঁচুনি"],
    "lethargic_or_unconscious": ["lethargic", "unconscious", "নিস্তেজ", "অজ্ঞান"],
    "vomits_everything": ["vomits everything", "সব বমি", "সবকিছু বমি"],
    "not_able_to_drink_or_breastfeed": [
        "cannot drink", "can't drink", "unable to drink", "পান করতে পারছে না",
        "কিছুই খেতে পারছে না",
    ],
}

INDRAWING = [
    "chest indrawing", "indrawing", "retraction", "বুক টেনে", "বুক টানা",
    "বুকের নিচের অংশ টেনে", "বুকটা টেনে",
]

DRUG_LEX = {
    "amoxicillin": ["amoxicillin", "অ্যামোক্সিসিলিন", "অ্যামক্সিসিলিন", "এমোক্সিসিলিন"],
    "azithromycin": ["azithromycin", "অ্যাজিথ্রোমাইসিন"],
    "paracetamol": ["paracetamol", "প্যারাসিটামল"],
    "ciprofloxacin": ["ciprofloxacin", "সিপ্রোফ্লক্সাসিন"],
    "salbutamol": ["salbutamol", "সালবিউটামল"],
    "ceftriaxone": ["ceftriaxone", "সেফট্রিয়াক্সোন"],
}


def _to_int(token: str) -> Optional[int]:
    token = token.strip()
    if token in _NUM_WORDS:
        return _NUM_WORDS[token]
    t = token.translate(BN_DIGITS)
    try:
        return int(float(t))
    except ValueError:
        return None


def _find_any(text: str, phrases: List[str]) -> bool:
    return any(p in text for p in phrases)


def _extract_vital(text: str, keys: List[str], decimal: bool = False) -> Optional[float]:
    digit = "[0-9০-৯]"
    num = f"{digit}{{2,3}}" + (f"(?:[.,]{digit})?" if decimal else "")
    for key in keys:
        m = re.search(re.escape(key) + r"[^0-9০-৯]{0,14}(" + num + ")", text)
        if m:
            raw = m.group(1).replace(",", ".").translate(BN_DIGITS)
            try:
                return float(raw) if decimal else int(float(raw))
            except ValueError:
                continue
    return None


def _extract_age_months(text: str) -> Optional[int]:
    # years
    m = re.search(r"([0-9০-৯]+|" + "|".join(_NUM_WORDS) + r")\s*(?:বছর|years?|yrs?)", text)
    if m:
        n = _to_int(m.group(1))
        if n is not None:
            return n * 12
    # months
    m = re.search(r"([0-9০-৯]+|" + "|".join(_NUM_WORDS) + r")\s*(?:মাস|months?|mo)", text)
    if m:
        n = _to_int(m.group(1))
        if n is not None:
            return n
    return None


def extract(text: str) -> Dict:
    """Extract a structured encounter from transcript text."""
    low = text.lower()  # English matching; Bangla unaffected by lower()

    symptoms = [name for name, phrases in SYMPTOM_LEX.items() if _find_any(low, phrases)]
    danger = [name for name, phrases in DANGER_LEX.items() if _find_any(low, phrases)]
    meds = [name for name, phrases in DRUG_LEX.items() if _find_any(low, phrases)]
    chest_indrawing = _find_any(low, INDRAWING) or ("বুক" in text and "টেনে" in text)

    rr = _extract_vital(low, ["শ্বাসের হার", "respiratory rate", "rr", "শ্বাস"])
    temp = _extract_vital(low, ["তাপমাত্রা", "temperature", "temp", "জ্বর"], decimal=True)

    vitals: Dict = {}
    if rr is not None:
        vitals["respiratory_rate"] = int(rr)
    if temp is not None and 30 <= temp <= 45:
        vitals["temp_c"] = round(float(temp), 1)

    encounter: Dict = {
        "symptoms": symptoms,
        "vitals": vitals,
        "chest_indrawing": chest_indrawing,
        "general_danger_signs": danger,
        "proposed_meds": meds,
    }
    age = _extract_age_months(text)
    if age is not None:
        encounter["age_months"] = age
    return encounter
