"""Deterministic medication-safety checks.

Given a proposed prescription plus the patient's allergies and current meds, it
flags allergy contraindications, cross-sensitivity cautions, dangerous
interaction pairs, and duplicate-class therapy — all by exact-match lookup
against the formulary tables, each finding carrying its citation.
"""

from typing import Optional

from .data import (
    DRUG_CLASS,
    INTERACTION_PAIRS,
    CROSS_SENSITIVITY,
    CITATION_FORMULARY,
)


def _norm(name: str) -> str:
    return name.strip().lower()


def drug_class(name: str) -> Optional[str]:
    return DRUG_CLASS.get(_norm(name))


def check_medication(
    proposed: list,
    allergies: Optional[list] = None,
    current_meds: Optional[list] = None,
) -> list:
    """Return a list of findings. Empty list == nothing flagged."""
    proposed_n = [_norm(p) for p in (proposed or [])]
    allergies_n = [_norm(a) for a in (allergies or [])]
    current_n = [_norm(c) for c in (current_meds or [])]
    findings: list = []

    for drug in proposed_n:
        dclass = DRUG_CLASS.get(drug)

        # 1) allergy / cross-sensitivity
        for allergen in allergies_n:
            allergen_class = DRUG_CLASS.get(allergen, allergen)
            direct = allergen == drug or (
                dclass is not None and (allergen == dclass or allergen_class == dclass)
            )
            if direct:
                what = f"a {dclass}" if dclass else "the named allergen"
                findings.append({
                    "type": "allergy",
                    "severity": "critical",
                    "drug": drug,
                    "reason": f"{drug.title()} is {what}; patient is allergic to {allergen}.",
                    "action": "Do not prescribe. Choose a non–cross-reacting alternative.",
                    "citation": CITATION_FORMULARY,
                })
            elif dclass is not None and dclass in CROSS_SENSITIVITY.get(allergen_class, []):
                findings.append({
                    "type": "cross-sensitivity",
                    "severity": "caution",
                    "drug": drug,
                    "reason": f"{drug.title()} ({dclass}) may cross-react with a {allergen} allergy.",
                    "action": "Use with caution or pick an alternative class.",
                    "citation": CITATION_FORMULARY,
                })

        # 2) interaction with a current med
        for cm in current_n:
            if frozenset({drug, cm}) in INTERACTION_PAIRS:
                findings.append({
                    "type": "interaction",
                    "severity": "critical",
                    "drug": drug,
                    "interacts_with": cm,
                    "reason": INTERACTION_PAIRS[frozenset({drug, cm})],
                    "action": "Avoid the combination or choose an alternative.",
                    "citation": CITATION_FORMULARY,
                })

        # 3) duplicate-class therapy
        for cm in current_n:
            cm_class = DRUG_CLASS.get(cm)
            if dclass and cm_class and dclass == cm_class and drug != cm:
                findings.append({
                    "type": "duplicate",
                    "severity": "caution",
                    "drug": drug,
                    "interacts_with": cm,
                    "reason": f"{drug.title()} and {cm.title()} are both {dclass} — duplicate therapy.",
                    "action": "Avoid duplication.",
                    "citation": CITATION_FORMULARY,
                })

    return findings
