"""Reference tables for the deterministic safety engines.

Everything here is an exact-match lookup against an authoritative source — never
an embedding similarity or an LLM guess. Citations travel with the data so every
decision the engines make can point at where it came from.
"""

# ---------------------------------------------------------------------------
# WHO IMCI — "Cough or difficult breathing" (child 2 months – 5 years)
# ---------------------------------------------------------------------------

# Fast-breathing thresholds in breaths/min: (age_low_months, age_high_months, threshold)
# A child is "fast breathing" if RR >= threshold for their age band.
FAST_BREATHING = [
    (2, 12, 50),   # 2–11 months  -> >= 50/min
    (12, 60, 40),  # 12–59 months -> >= 40/min
]

# IMCI general danger signs (any one -> very severe disease, urgent referral)
GENERAL_DANGER_SIGNS = {
    "not_able_to_drink_or_breastfeed",
    "vomits_everything",
    "convulsions",
    "lethargic_or_unconscious",
}

CITATION_IMCI = {
    "source": "WHO IMCI chart booklet",
    "ref": "Cough or difficult breathing — assess & classify",
}

# ---------------------------------------------------------------------------
# Medication safety — drug classes, interactions, cross-sensitivity
# ---------------------------------------------------------------------------

# Generic drug -> pharmacological class
DRUG_CLASS = {
    # penicillins
    "amoxicillin": "penicillin",
    "ampicillin": "penicillin",
    "flucloxacillin": "penicillin",
    "cloxacillin": "penicillin",
    "penicillin": "penicillin",
    "co-amoxiclav": "penicillin",
    "amoxicillin-clavulanate": "penicillin",
    # cephalosporins
    "ceftriaxone": "cephalosporin",
    "cefixime": "cephalosporin",
    "cephalexin": "cephalosporin",
    # macrolides
    "azithromycin": "macrolide",
    "erythromycin": "macrolide",
    "clarithromycin": "macrolide",
    # fluoroquinolones
    "ciprofloxacin": "fluoroquinolone",
    "levofloxacin": "fluoroquinolone",
    # others
    "paracetamol": "analgesic-antipyretic",
    "ibuprofen": "nsaid",
    "aspirin": "nsaid",
    "warfarin": "anticoagulant",
    "tizanidine": "muscle-relaxant",
    "salbutamol": "beta-agonist",
}

# Known dangerous interaction pairs (order-independent) -> reason
INTERACTION_PAIRS = {
    frozenset({"ciprofloxacin", "tizanidine"}):
        "Ciprofloxacin sharply raises tizanidine levels — risk of dangerous hypotension and sedation. Contraindicated.",
    frozenset({"warfarin", "aspirin"}):
        "Additive bleeding risk (anticoagulant + antiplatelet).",
    frozenset({"warfarin", "ibuprofen"}):
        "NSAID increases bleeding risk on warfarin.",
    frozenset({"clarithromycin", "warfarin"}):
        "Macrolide potentiates warfarin — raised bleeding risk.",
    frozenset({"aspirin", "ibuprofen"}):
        "Combined NSAIDs — GI bleeding risk and reduced cardioprotection.",
}

# Allergy to class X also cautions these classes (partial cross-reactivity)
CROSS_SENSITIVITY = {
    "penicillin": ["cephalosporin"],
}

CITATION_FORMULARY = {
    "source": "National Drug Formulary (BD) / BNF",
    "ref": "Contraindications, interactions & hypersensitivity",
}
