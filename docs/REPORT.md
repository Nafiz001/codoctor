# Codoctor — Project Report
### An ambient Bangla clinical co-pilot, safety-net, and patient-held record for Bangladesh's overloaded OPDs

**SciBlitz AI Challenge 2026 · Track A — Health & Society**

| | |
|---|---|
| **Team** | _‹your team name›_ |
| **Live demo** | https://codoctor.vercel.app — `/doctor` (cockpit), `/live` (voice quick-check), `/patient` |
| **Backend API** | https://codoctor-api.onrender.com/docs |
| **Repository** | https://github.com/Nafiz001/codoctor |
| **Demo video** | _‹link›_ |

> Codoctor is **advisory and non-diagnostic**. It is clinical decision-*support*; the licensed clinician is always the decision-maker.

---

## 1. Problem statement

Bangladesh has roughly **6 physicians per 10,000 people**, and in government-hospital outpatient departments (OPDs) a single doctor commonly sees **80–150+ patients a day** — a real consultation often lasts **60–120 seconds**. Three failures follow directly from that time pressure:

1. **Things get missed.** A rushed history skips the one red-flag question; a drug interaction with the patient's existing medicines goes unchecked; a danger sign (a child's fast breathing, a maternal warning sign) is not escalated.
2. **Nothing is recorded.** There is **no national electronic health record**. The output is a handwritten paper slip the patient loses; the next visit starts from zero. Continuity of care does not exist for most of the population.
3. **The patient does not understand.** Low-literacy, Bangla-only patients receive English drug names and rushed instructions they cannot read back, and ~50% of pharmacies are unlicensed first-contact care — so the (un-understood) prescription *is* the care plan.

Ambient clinical-scribe products (Abridge, Nuance DAX Copilot, Nabla) became a proven, billion-dollar category abroad in 2023–2025. **None** of them work in Bangla, for the 90-second consultation, or as a patient-held record. That gap is the opportunity.

---

## 2. Proposed solution

Codoctor is a no-login web app with three connected surfaces, joined by a QR code on the doctor's door:

- **Doctor cockpit** (`/doctor`) — listens to the consultation, fuses two device transcripts into one, and runs a team of agents that surface **quiet, cited, dismissible** prompts: a differential to consider, a guideline question not yet asked, and — on deterministic rule engines — a **danger-sign escalation** and a **medication-safety block**. It ends by auto-drafting an editable SOAP note.
- **Live quick-check** (`/live`) — a clinician types or **speaks symptoms in Bangla** (browser speech recognition) and gets a live, grounded, cited assessment from the agentic backend.
- **Patient view** (`/patient`) — a plain-Bangla "what you have / what to do / when to worry" card, **read aloud** in Bangla, kept on the patient's phone and re-loaded by QR at the next visit (bootstrapping the record Bangladesh lacks).

The design principle throughout: **deterministic tools make the high-stakes decisions; the LLM only narrates.** Codoctor is a safety-net, not an autonomous diagnostician.

---

## 3. System architecture

```
 Doctor phone/laptop ─┐                         ┌─ Patient phone (QR-joined)
      (mic + view)    │                         │     (mic + view)
                      ▼                         ▼
            ┌───────────────────────────────────────────┐
            │  HEAVY-ML FRONT DOOR                       │
            │  Bangla ASR ×2 → transcript FUSION →       │
            │  diarization → entity extraction           │
            └───────────────────┬───────────────────────┘
                    structured Consultation Context
                                ▼
            ┌───────────────────────────────────────────┐
            │  ORCHESTRATOR (LangGraph, self-reflective) │
            │  intake → retrieve → run_tools →           │
            │  critic ─(gap)→ retrieve ─(grounded)→      │
            │  synthesize                                │
            ├───────────────────────────────────────────┤
            │  Hybrid RAG (BM25 + TF-IDF, RRF) over a    │
            │  cited corpus: WHO IMCI · DGHS STG · NDF    │
            │  DETERMINISTIC tools: IMCI danger-sign     │
            │  tree · drug allergy/interaction engine    │
            │  CRITIC: every claim cited, or suppressed  │
            └───────────────────┬───────────────────────┘
                                ▼
   Doctor: cited prompts + editable note   │   Patient: spoken Bangla record
```

**Stack.** Frontend: Next.js 14 + Tailwind on **Vercel**. Backend: **FastAPI** + **LangGraph** on **Render**. Both deployed at public URLs; the frontend calls the backend live and degrades gracefully to a deterministic scripted demo if the (free-tier) backend is asleep.

---

## 4. Methodology

### 4.1 The data contract
The heavy-ML front door converts audio into a single structured **Consultation Context** object (patient history, fused/diarized transcript, extracted symptoms/vitals/meds, plus retrieved guideline chunks). The reasoning agents receive *that* — never raw audio — which keeps them fast, debuggable, and cheap, and lets each agent receive only the slice it needs.

### 4.2 Retrieval-augmented generation (the trust layer)
- **Corpus.** A curated, atomic-chunk corpus authored from **WHO IMCI**, the **DGHS Standard Treatment Guidelines (Bangladesh)**, and the **National Drug Formulary of Bangladesh / BNF**, scoped to the pediatric acute-respiratory-infection (ARI) golden path. Each chunk carries its `source` + `section`, so every retrieved fact is citable. *A small flawless corpus beats a broad noisy one.*
- **Retriever.** A dependency-free **hybrid retriever**: BM25 (lexical) + TF-IDF cosine (vector), fused with Reciprocal Rank Fusion, with English↔Bangla query expansion. Being pure-Python, it starts instantly and runs on any free tier. (BGE-M3 is a documented drop-in for the dense side; the interface is unchanged.)

### 4.3 Deterministic decision engines
The high-stakes outputs are computed by auditable rule engines, not an LLM:
- **WHO IMCI danger-sign classifier** — age-specific fast-breathing thresholds (≥50/min at 2–11 months, ≥40/min at 12–59 months), plus chest indrawing, stridor, and the general danger signs → classifies *No pneumonia / Pneumonia / Severe pneumonia* and decides referral.
- **Medication-safety engine** — exact-match lookups for allergy contraindications (by drug and by class), partial cross-sensitivity (e.g. penicillin→cephalosporin caution), known interaction pairs, and duplicate-class therapy.

### 4.4 The self-reflective orchestrator
A **LangGraph** state machine: `intake → retrieve → run_tools → critic`. The **critic** checks that every surfaced claim is backed by a retrieved source; if (say) a medication contraindication is not yet grounded, it **routes back to `retrieve`** with an expanded query before `synthesize`. Synthesis composes a grounded, cited answer in Bangla and English; if nothing grounds, it **refuses honestly** rather than inventing.

### 4.5 Voice & accessibility
The `/live` page uses the **browser Web Speech API** for keyless Bangla speech-to-text, and the patient view uses browser speech *synthesis* to read the summary aloud — both zero-cost and offline-capable on supported devices.

---

## 5. AI/ML approach

Codoctor follows the winning pattern of recent international hackathons — a **self-reflective agentic-RAG loop with a deterministic decision core** — re-targeted at a specific Bangladeshi problem:

- **Heavy-ML front door** (ASR / entity extraction) makes AI *central*, not a peripheral API call (§5.1 compliant).
- **Hybrid retrieval + mandatory citation** turns answers into auditable, judge-verifiable claims.
- **Deterministic tools decide; the LLM only narrates.** This removes "LLM guessing" from every high-stakes output. The system runs **fully without any API key** (deterministic Bangla template narration); if `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` is set, an LLM only *rephrases* already-grounded findings and is forbidden from adding new claims.
- **Honest refusal** ("not in the source → clinician judgment") is a demonstrated feature, not a hidden fallback.

---

## 6. Results

We evaluate on a hand-built labelled set covering the demo case plus edge cases (age-specific thresholds, stridor, general danger signs, cross-sensitivity, interactions, safe alternatives, and an empty input). The harness is reproducible: `python backend/eval/run_eval.py`.

| Component (N) | Metric | Result |
|---|---|:---:|
| **IMCI engine** (12) | Classification accuracy | **12/12 (100%)** |
| | Danger-sign recall — *missed referrals* | **4/4 (100%) — 0 missed** |
| | Specificity — *false referrals* | **8/8 (100%) — 0 false** |
| **Med-safety** (8) | Catch rate (unsafe blocked) | **4/4 (100%)** |
| | False positives (safe blocked) | **0/4 (0%)** |
| **Orchestrator** (3) | Grounding rate | **2/2 (100%)** |
| | Citation present | **2/2 (100%)** |
| | Honest-refusal accuracy | **1/1 (100%)** |

Unit tests: **15/15 pass** (`test_safety.py` 9, `test_rag.py` 6).

**The self-reflective loop, observed live.** On the demo case the orchestrator's trace is:
`intake → retrieve → run_tools(critical) → critic:FLAG (formulary source missing) → retrieve(expanded) → run_tools → critic:OK → synthesize` — i.e. the critic **caught its own grounding gap, re-retrieved, then synthesized**, citing both WHO IMCI and the National Formulary (2 retrieval passes). This is verifiable live at `/consult/analyze`.

> *Honest scope note:* these are correctness numbers for the deterministic engines and the grounding behaviour of the orchestrator on a curated set — not a clinical-accuracy claim. Clinical validation is future work (§7).

---

## 7. Limitations & future work

**Limitations.**
- **Scope.** The corpus and engines are deep on the **pediatric ARI / IMCI** path; other conditions are not yet covered.
- **Not clinically validated.** Numbers above are software-correctness, not patient outcomes. Codoctor is advisory and must not be used for real care without validation and clinician oversight.
- **Voice quality.** Browser Bangla ASR is convenient and keyless but degrades on dialect/noise; the cockpit therefore uses dual-mic fusion + transcript read-back, and the live demo offers a typed fallback.
- **Demo data.** The doctor cockpit *plays* a scripted consultation for a reliable stage demo (the rulebook's deterministic-fallback best practice); the live agentic results come from the deployed backend.
- **No real EHR integration** yet — the longitudinal record is one Codoctor builds itself.

**Future work.** Server-side cloud Bengali ASR + true dual-device transcript fusion; the remaining specialist agents (entity-extraction Scribe, Differential, Completeness); swap the dense retriever for **BGE-M3** and broaden the corpus; clinical validation with a partner facility; DGHS facility-directory referral routing.

---

## 8. Innovation & related work (honest derivation)

Codoctor does not claim to invent ambient clinical AI. It **localizes a proven international pattern** (Abridge / Nuance DAX / Nabla; the self-reflective agentic-RAG loop; FraudLens-style "deterministic tool decides, model narrates") to the one setting those products were never built for: a **Bangla, voice-first, 90-second, no-EHR, low-literacy** consultation, adding a deterministic safety-net and a patient-held record. Per the rulebook's own note (§8.1), *"a novel approach to a local problem can score higher than a technically complex but routine solution."*

---

### Appendix — reproduce the numbers
```bash
cd backend && python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python tests/test_safety.py     # 9/9
python tests/test_rag.py        # 6/6
python eval/run_eval.py         # the table in §6
```

*Convert this report to PDF (≤8 pages, ≥10pt) before submission — e.g. `pandoc docs/REPORT.md -o REPORT.pdf`, VS Code "Markdown PDF", or print-to-PDF from a Markdown preview.*
