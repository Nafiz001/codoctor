"""Differential agent.

From the extracted findings, produce a ranked, cited list of conditions to
*consider* — never a final diagnosis. Deterministic and explainable: each
candidate scores by how many of its hallmark findings are present, with a boost
for severity markers and relevant history. The LLM is not involved.
"""

from typing import Dict, List

CONDITIONS = [
    {
        "name": "Severe pneumonia / very severe disease",
        "findings": {"fast_breathing", "chest_indrawing"},
        "danger_boost": True,
        "source": "WHO IMCI chart booklet",
        "ref": "Severe pneumonia / very severe disease",
    },
    {
        "name": "Pneumonia",
        "findings": {"fever", "cough", "fast_breathing"},
        "source": "WHO IMCI chart booklet",
        "ref": "Pneumonia",
    },
    {
        "name": "Bronchiolitis",
        "findings": {"cough", "fast_breathing"},
        "source": "DGHS Standard Treatment Guidelines (Bangladesh)",
        "ref": "ARI — supportive care",
    },
    {
        "name": "Asthma / reactive airway",
        "findings": {"fast_breathing"},
        "history": "salbutamol",
        "source": "National Drug Formulary (BD) / BNF",
        "ref": "Salbutamol — beta-2 agonist",
    },
    {
        "name": "Cough or cold (URTI)",
        "findings": {"cough", "fever"},
        "source": "WHO IMCI chart booklet",
        "ref": "No pneumonia (cough or cold)",
    },
]


def differential(encounter: Dict, patient: Dict) -> List[Dict]:
    findings = set(encounter.get("symptoms", []) or [])
    if encounter.get("chest_indrawing"):
        findings.add("chest_indrawing")
    if (encounter.get("vitals") or {}).get("respiratory_rate"):
        findings.add("fast_breathing")  # a measured high rate implies fast breathing
    has_danger = bool(encounter.get("general_danger_signs"))
    meds = " ".join(patient.get("current_meds", []) or []).lower()

    ranked: List[Dict] = []
    for c in CONDITIONS:
        overlap = findings & c["findings"]
        if not overlap:
            continue
        score = len(overlap)
        if c.get("danger_boost") and (encounter.get("chest_indrawing") or has_danger):
            score += 2
        if c.get("history") and c["history"] in meds:
            score += 1
        ranked.append({
            "condition": c["name"],
            "score": score,
            "rationale": "matches " + ", ".join(sorted(overlap)),
            "citation": {"source": c["source"], "ref": c["ref"]},
        })

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return ranked[:3]
