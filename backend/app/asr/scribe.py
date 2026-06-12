"""Scribe — clinical entity extraction (LLM-assisted, regex-grounded).

Turns a (fused) Bangla/English consultation transcript into the structured
encounter the orchestrator expects: symptoms, vitals, chest indrawing, general
danger signs, proposed medicines, and age.

Two stages, with the deterministic one as a safety floor:

  1. A lexicon + regex pass (`_extract_regex`) — keyless, fast, exact. Whatever it
     catches is *guaranteed* to survive into the final encounter.
  2. If an LLM key is configured, a structured-extraction pass (`_extract_llm`)
     reads the free-text the regex can't — paraphrased or colloquial Bangla — and
     its findings are *merged on top of* the regex result. The LLM can only add to
     the controlled vocabulary; it can never delete a deterministic catch, and the
     life-or-death decisions still belong to the rule engines, not the Scribe.

With no key the Scribe is exactly the original deterministic extractor.
"""

import re
from typing import Dict, List, Optional

from ..agents.llm import extract_json, llm_available

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


def _extract_regex(text: str) -> Dict:
    """Deterministic lexicon + regex extraction — the safety floor."""
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


# Controlled vocabulary the LLM must map free text onto — so its output plugs
# straight into the deterministic engines without a translation layer.
_SYMPTOM_VOCAB = sorted(SYMPTOM_LEX.keys())
_DANGER_VOCAB = sorted(DANGER_LEX.keys())

_LLM_SYSTEM = (
    "You are a clinical scribe for a Bangladeshi pediatric (under-5) outpatient "
    "visit. Read the Bangla/English doctor–patient transcript and extract ONLY "
    "findings that are explicitly stated. Do not infer, diagnose, or invent. "
    "Return a single JSON object with these keys:\n"
    f"  symptoms: array, subset of {_SYMPTOM_VOCAB}\n"
    f"  general_danger_signs: array, subset of {_DANGER_VOCAB}\n"
    "  proposed_meds: array of lowercase generic drug names the doctor proposes\n"
    "  chest_indrawing: boolean (lower chest-wall indrawing/retraction)\n"
    "  stridor: boolean (stridor in a calm child)\n"
    "  age_months: integer child age in months, or null\n"
    "  respiratory_rate: integer breaths/min, or null\n"
    "  temp_c: number temperature in Celsius, or null\n"
    "Use ONLY the listed enum values for symptoms and danger signs; omit anything "
    "not clearly present. Never include a value that was not actually said."
)


def _extract_llm(text: str) -> Optional[Dict]:
    """Structured LLM extraction over free text. None if no key / failure."""
    if not llm_available():
        return None
    data = extract_json(_LLM_SYSTEM, text)
    if not isinstance(data, dict):
        return None

    def _clean_list(value, allowed=None) -> List[str]:
        out: List[str] = []
        for item in value or []:
            if not isinstance(item, str):
                continue
            v = item.strip().lower()
            if not v:
                continue
            if allowed is not None and v not in allowed:
                continue
            if v not in out:
                out.append(v)
        return out

    enc: Dict = {
        "symptoms": _clean_list(data.get("symptoms"), set(_SYMPTOM_VOCAB)),
        "general_danger_signs": _clean_list(
            data.get("general_danger_signs"), set(_DANGER_VOCAB)
        ),
        "proposed_meds": _clean_list(data.get("proposed_meds")),
        "chest_indrawing": bool(data.get("chest_indrawing")),
        "stridor": bool(data.get("stridor")),
        "vitals": {},
    }
    rr = data.get("respiratory_rate")
    if isinstance(rr, (int, float)) and 0 < rr <= 200:
        enc["vitals"]["respiratory_rate"] = int(rr)
    temp = data.get("temp_c")
    if isinstance(temp, (int, float)) and 30 <= temp <= 45:
        enc["vitals"]["temp_c"] = round(float(temp), 1)
    age = data.get("age_months")
    if isinstance(age, (int, float)) and 0 <= age <= 60:
        enc["age_months"] = int(age)
    return enc


def _merge(base: Dict, extra: Optional[Dict]) -> Dict:
    """Merge the LLM result on top of the regex result. The regex (base) result
    is the floor: list findings are unioned (LLM can add, never remove), scalars
    prefer the deterministic value when present, booleans OR together."""
    if not extra:
        return base
    out = dict(base)

    for key in ("symptoms", "general_danger_signs", "proposed_meds"):
        merged = list(base.get(key, []) or [])
        for v in extra.get(key, []) or []:
            if v not in merged:
                merged.append(v)
        out[key] = merged

    out["chest_indrawing"] = bool(base.get("chest_indrawing")) or bool(
        extra.get("chest_indrawing")
    )
    out["stridor"] = bool(base.get("stridor")) or bool(extra.get("stridor"))

    vitals = dict(base.get("vitals", {}) or {})
    for k, v in (extra.get("vitals", {}) or {}).items():
        vitals.setdefault(k, v)  # trust regex numbers first; fill gaps from LLM
    out["vitals"] = vitals

    if "age_months" not in out and "age_months" in extra:
        out["age_months"] = extra["age_months"]
    return out


def extract(text: str) -> Dict:
    """Extract a structured encounter: deterministic regex, then (if a key is
    configured) an LLM pass merged on top. Identical to the original keyless
    extractor when no LLM is available."""
    base = _extract_regex(text)
    return _merge(base, _extract_llm(text))
