"""Clinical query expansion (English + Bangla bridges).

Used by the orchestrator on a re-retrieval pass to widen recall — e.g. "fast
breathing" should also match "tachypnea / respiratory rate", and the Bangla
"জ্বর" should bridge to "fever".
"""

SYNONYMS = {
    # respiratory
    "fast": ["tachypnea", "rapid"],
    "breathing": ["breaths", "respiratory", "respiration", "breath"],
    "rate": ["respiratory"],
    "indrawing": ["retraction", "chest", "indrawing"],
    "chest": ["thoracic", "indrawing"],
    "stridor": ["upper airway"],
    "cough": ["respiratory"],
    "fever": ["pyrexia", "temperature"],
    "pneumonia": ["lower respiratory infection", "lri"],
    "child": ["paediatric", "pediatric", "infant"],
    "danger": ["severe", "emergency"],
    "refer": ["referral", "hospital"],
    # medication
    "amoxicillin": ["penicillin", "antibiotic"],
    "penicillin": ["amoxicillin", "beta-lactam", "hypersensitivity"],
    "allergy": ["hypersensitivity", "allergic", "contraindicated", "contraindication"],
    "antibiotic": ["amoxicillin", "azithromycin"],
    "ciprofloxacin": ["fluoroquinolone", "interaction"],
    # Bangla -> English bridges
    "জ্বর": ["fever", "temperature"],
    "শ্বাস": ["breathing", "respiratory"],
    "কাশি": ["cough"],
    "নিউমোনিয়া": ["pneumonia"],
    "বুক": ["chest", "indrawing"],
    "অ্যালার্জি": ["allergy", "hypersensitivity"],
}


def expand_query(tokens: list) -> list:
    """Return the token list widened with clinical synonyms (order-preserving, deduped)."""
    widened = list(tokens)
    for tok in tokens:
        widened.extend(SYNONYMS.get(tok, []))

    seen: set = set()
    out: list = []
    for term in widened:
        for word in term.split():
            if word not in seen:
                seen.add(word)
                out.append(word)
    return out
