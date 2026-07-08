"""Medication reconciliation across a patient's history.

Combines the medicines extracted from uploaded previous reports with the current
meds and the proposed prescription, then runs the deterministic safety engine
over the whole picture and adds two stewardship checks:

  * repeated antibiotic courses  -> resistance / stewardship caution
  * re-prescribing a recent drug  -> confirm the earlier course is complete

Deterministic (exact-match against the formulary classes); the LLM only *reads*
the report to produce the med list, it never decides here.
"""

from .medsafety import check_medication
from .data import DRUG_CLASS, CITATION_FORMULARY

ANTIBIOTIC_CLASSES = {"penicillin", "cephalosporin", "macrolide", "fluoroquinolone"}

CITATION_STEWARDSHIP = {
    "source": "WHO AWaRe antibiotic stewardship",
    "ref": "Avoid repeated/unnecessary antibiotic courses",
}


def _norm(x: str) -> str:
    return (x or "").strip().lower()


def reconcile(
    proposed: list,
    allergies: list | None = None,
    current_meds: list | None = None,
    past_meds: list | None = None,
) -> dict:
    """Return {findings, notes, blocked} over the full medication picture."""
    proposed = proposed or []
    allergies = allergies or []
    current_meds = current_meds or []
    past_meds = past_meds or []

    # Interaction / allergy / duplicate against everything the child has taken.
    context = []
    seen = set()
    for m in current_meds + past_meds:
        n = _norm(m)
        if n and n not in seen:
            seen.add(n)
            context.append(m)

    findings = check_medication(proposed=proposed, allergies=allergies, current_meds=context)

    notes = []

    # Repeated antibiotic courses in the history.
    past_abx = sorted({
        _norm(m) for m in past_meds
        if DRUG_CLASS.get(_norm(m)) in ANTIBIOTIC_CLASSES
    })
    if len(past_abx) >= 2:
        notes.append({
            "type": "stewardship",
            "severity": "caution",
            "reason": f"History shows multiple antibiotic courses ({', '.join(d.title() for d in past_abx)}). "
                      "Consider resistance and whether another course is warranted.",
            "citation": CITATION_STEWARDSHIP,
        })

    # Re-prescribing a drug the patient recently had.
    past_set = {_norm(m) for m in past_meds}
    for p in proposed:
        if _norm(p) in past_set:
            notes.append({
                "type": "repeat",
                "severity": "caution",
                "reason": f"{p.title()} was on a previous report — confirm the earlier "
                          "course was completed before repeating.",
                "citation": CITATION_FORMULARY,
            })

    blocked = any(f["severity"] == "critical" for f in findings)
    return {"findings": findings, "notes": notes, "blocked": blocked}
