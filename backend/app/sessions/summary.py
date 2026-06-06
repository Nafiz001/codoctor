"""Turn a clinical analysis into a plain-Bangla, patient-held summary.

Deterministic templates keyed on the IMCI classification and the medication
findings — the same principle as the rest of Codoctor: the rule engines decide,
language only narrates. The shape mirrors the frontend's PATIENT_SUMMARY so the
patient phone renders a live result with the same components as the scripted demo.
"""

from __future__ import annotations

# The IMCI "come back immediately" danger signs — what a caregiver must watch
# for regardless of today's classification.
_DANGER_BN = [
    "শ্বাস আরও দ্রুত বা কষ্টকর হলে",
    "বুক আরও বেশি টেনে শ্বাস নিলে",
    "খিঁচুনি হলে",
    "বাচ্চা নিস্তেজ বা অজ্ঞান হয়ে পড়লে",
    "কিছু খেতে বা পান করতে না পারলে",
]
_DANGER_EN = [
    "Breathing gets faster or harder",
    "Chest pulls in even more",
    "Any convulsion / fit",
    "Child becomes drowsy or unconscious",
    "Cannot eat or drink anything",
]


def build_summary(analysis: dict, patient: dict | None = None) -> dict:
    """Map a live analysis → the patient-facing card (Bangla + English)."""
    patient = patient or {}
    safety = analysis.get("safety") or {}
    imci = safety.get("imci") or {}
    meds = safety.get("medication") or []
    classification = imci.get("classification") or ""
    refer = bool(imci.get("refer"))

    if "Severe" in classification:
        tone = "red"
        condition_bn = "আপনার বাচ্চার নিউমোনিয়া (ফুসফুসের সংক্রমণ) হয়েছে, এবং এটি গুরুতর।"
        condition_en = "Your child has pneumonia (a lung infection), and it is severe."
        meaning_bn = "দ্রুত শ্বাস নেওয়া আর বুক টেনে শ্বাস নেওয়া বিপদের লক্ষণ। দেরি করা ঠিক হবে না।"
        meaning_en = "Fast breathing and chest indrawing are danger signs. Do not delay."
    elif "Pneumonia" in classification:
        tone = "amber"
        condition_bn = "আপনার বাচ্চার নিউমোনিয়া (ফুসফুসের সংক্রমণ) হয়েছে।"
        condition_en = "Your child has pneumonia (a lung infection)."
        meaning_bn = "ঠিকমতো অ্যান্টিবায়োটিক খাওয়ালে বাড়িতেই সেরে উঠবে, তবে নিয়মিত খেয়াল রাখুন।"
        meaning_en = "With the right antibiotic it can be treated at home — but watch closely."
    elif classification:
        tone = "brand"
        condition_bn = "আপনার বাচ্চার সাধারণ সর্দি-কাশি — নিউমোনিয়া নয়।"
        condition_en = "Your child has a common cough or cold — not pneumonia."
        meaning_bn = "অ্যান্টিবায়োটিকের দরকার নেই। ঘরোয়া যত্ন আর বিশ্রামই যথেষ্ট।"
        meaning_en = "No antibiotic is needed. Home care and rest are enough."
    else:
        # No respiratory classification — fall back to the orchestrator's words.
        tone = "brand"
        condition_bn = "আপনার ভিজিটের সারাংশ নিচে দেওয়া হলো।"
        condition_en = "Your visit summary is below."
        meaning_bn = analysis.get("answer_bn") or ""
        meaning_en = analysis.get("answer_en") or ""

    if refer:
        action_bn = "এখনই কাছের হাসপাতাল বা জরুরি বিভাগে নিয়ে যান।"
        action_en = "Take the child to the nearest hospital or emergency now."
    elif "Pneumonia" in classification:
        action_bn = "ডাক্তারের দেওয়া অ্যান্টিবায়োটিকের সম্পূর্ণ কোর্স খাওয়ান; ৩ দিন পর আবার দেখান।"
        action_en = "Give the full antibiotic course; return for follow-up in 3 days."
    else:
        action_bn = "ঘরে বিশ্রাম ও পর্যাপ্ত তরল খাবার দিন; লক্ষণ বাড়লে ডাক্তার দেখান।"
        action_en = "Rest and fluids at home; see a doctor if symptoms worsen."

    if refer:
        meds_bn = "হাসপাতালে প্রোটোকল অনুযায়ী অ্যান্টিবায়োটিক দেওয়া হবে।"
        meds_en = "Antibiotics will be given at hospital per protocol."
    elif "Pneumonia" in classification:
        meds_bn = "ডাক্তারের লেখা অ্যান্টিবায়োটিক নিয়ম মেনে খাওয়ান।"
        meds_en = "Give the prescribed antibiotic exactly as directed."
    else:
        meds_bn = "অ্যান্টিবায়োটিকের দরকার নেই; জ্বরের জন্য প্যারাসিটামল যথেষ্ট।"
        meds_en = "No antibiotic needed; paracetamol for fever is enough."

    # Surface any deterministic allergy / interaction block in lay terms.
    blocked = sorted({m.get("drug", "") for m in meds if m.get("severity") == "critical"})
    blocked = [d for d in blocked if d]
    if blocked:
        names = ", ".join(d.capitalize() for d in blocked)
        meds_bn += f" {names} জাতীয় ওষুধ দেওয়া যাবে না — অ্যালার্জি আছে।"
        meds_en += f" Do not give {names}-type medicine — there is an allergy."

    return {
        "conditionBn": condition_bn,
        "conditionEn": condition_en,
        "meaningBn": meaning_bn,
        "meaningEn": meaning_en,
        "actionBn": action_bn,
        "actionEn": action_en,
        "medsBn": meds_bn,
        "medsEn": meds_en,
        "dangerSignsBn": _DANGER_BN,
        "dangerSignsEn": _DANGER_EN,
        "tone": tone,
        "refer": refer,
        "citations": analysis.get("citations") or [],
    }
