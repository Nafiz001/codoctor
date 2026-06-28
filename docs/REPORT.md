# Codoctor — Project Report
### An ambient Bangla clinical co-pilot, safety-net, and patient-held record for Bangladesh's overloaded OPDs

**SciBlitz AI Challenge 2026 · Track A — Health & Society**

| | |
|---|---|
| **Team** | Logarithm |
| **Live demo** | https://codoctor.vercel.app — `/room` (live QR session + doctor co-pilot), `/doctor` (scripted cockpit), `/live` (voice quick-check), `/patient` |
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

- **Live consultation room** (`/room`) — the doctor opens a session; the patient scans a QR to join; both phones listen in Bangla. After analysis the doctor sees a **prioritized co-pilot panel**: 🔴 *red flags not to miss right now* (an IMCI danger-sign escalation; *"Do not prescribe Amoxicillin — patient is allergic to penicillin"*), ❓ *guideline questions not yet asked in this consult*, 💊 *medication cautions*, and 🔎 *a differential to consider* — every item cited to WHO IMCI / DGHS / the National Formulary.
- **Doctor cockpit** (`/doctor`) — the scripted, stage-safe walkthrough of the same pipeline, ending in an auto-drafted editable SOAP note.
- **Live quick-check** (`/live`) — a clinician types or **speaks symptoms in Bangla** (browser speech recognition) and gets a live, grounded, cited assessment from the agentic backend.
- **Patient view** (`/patient`) — a plain-Bangla "what you have / what to do / when to worry" card, **read aloud** in Bangla, kept on the patient's phone and re-loaded by QR at the next visit (bootstrapping the record Bangladesh lacks).

The design principle throughout: **AI owns everything ambiguous — speech, meaning, retrieval, explanation; deterministic engines own the one irreversible call.** Codoctor is a safety-net, not an autonomous diagnostician.

---

## 3. System architecture

```
 Doctor phone/laptop ─┐                         ┌─ Patient phone (QR-joined)
      (mic + view)    │                         │     (mic + view)
                      ▼                         ▼
            ┌───────────────────────────────────────────┐
            │  HEAVY-ML FRONT DOOR                       │
            │  Bangla ASR ×2 → transcript FUSION →       │
            │  Scribe entity extraction                  │
            └───────────────────┬───────────────────────┘
                    structured Consultation Context
                                ▼
            ┌───────────────────────────────────────────┐
            │  ORCHESTRATOR (LangGraph, self-reflective) │
            │  intake → retrieve → run_tools →           │
            │  critic ─(gap)→ retrieve ─(grounded)→      │
            │  synthesize                                │
            ├───────────────────────────────────────────┤
            │  Hybrid RAG (BM25 + TF-IDF + dense          │
            │  embeddings, RRF) over a cited corpus:      │
            │  WHO IMCI · DGHS STG · NDF                  │
            │  DETERMINISTIC tools: IMCI danger-sign     │
            │  tree · drug allergy/interaction engine    │
            │  CRITIC: every claim cited, or suppressed  │
            └───────────────────┬───────────────────────┘
                                ▼
   Doctor: co-pilot (red flags · still-to-ask │   Patient: spoken Bangla record
   · cautions · differential) + editable note │
```

**Stack.** Frontend: Next.js 14 + Tailwind on **Vercel**. Backend: **FastAPI** + **LangGraph** on **Render**. Both deployed at public URLs; the frontend calls the backend live and degrades gracefully to a deterministic scripted demo if the (free-tier) backend is asleep.

---

## 4. Methodology

### 4.1 The data contract & the two-stage Scribe
The front door converts audio into a single structured **Consultation Context** object (patient history, fused transcript, extracted symptoms/vitals/meds, plus retrieved guideline chunks). The reasoning agents receive *that* — never raw audio. Extraction is **two-stage**: a deterministic lexicon/regex pass whose catches are a guaranteed floor, then (key-optional) a **GPT-4o-mini structured-extraction pass** that reads the paraphrased, colloquial Bangla the lexicon cannot ("ঠিকমতো শ্বাস নিতে পারছে না") and is merged *on top* — locked to a controlled vocabulary, able to add findings but never remove a deterministic catch.

### 4.2 Retrieval-augmented generation (the trust layer)
- **Corpus.** A curated, atomic-chunk corpus authored from **WHO IMCI**, the **DGHS Standard Treatment Guidelines (Bangladesh)**, and the **National Drug Formulary of Bangladesh / BNF**, scoped to the pediatric acute-respiratory-infection (ARI) golden path. Each chunk carries its `source` + `section`, so every retrieved fact is citable. *A small flawless corpus beats a broad noisy one.*
- **Retriever.** A **three-ranker hybrid** fused with Reciprocal Rank Fusion: BM25 (lexical) + TF-IDF cosine, both dependency-free pure-Python, plus a key-optional **dense semantic ranker** (OpenAI `text-embedding-3-small`; corpus embedded once and cached, only the short query embedded per request) — so a *Bangla* query retrieves the *English* guideline that means the same thing even with zero shared tokens. English↔Bangla query expansion supplements the lexical side; without a key the retriever is the original two-ranker hybrid.

### 4.3 Deterministic decision engines
The high-stakes outputs are computed by auditable rule engines, not an LLM:
- **WHO IMCI danger-sign classifier** — age-specific fast-breathing thresholds (≥50/min at 2–11 months, ≥40/min at 12–59 months), plus chest indrawing, stridor, and the general danger signs → classifies *No pneumonia / Pneumonia / Severe pneumonia* and decides referral.
- **Medication-safety engine** — exact-match lookups for allergy contraindications (by drug and by class), partial cross-sensitivity (e.g. penicillin→cephalosporin caution), known interaction pairs, and duplicate-class therapy.

### 4.4 The self-reflective orchestrator & doctor co-pilot
A **LangGraph** state machine: `intake → retrieve → run_tools → critic → differential → completeness → synthesize`. The **critic** checks that every surfaced claim is backed by a retrieved source; if (say) a medication contraindication is not yet grounded, it **routes back to `retrieve`** with an expanded query before `synthesize`. Synthesis composes a grounded, cited answer in Bangla and English; if nothing grounds, it **refuses honestly** rather than inventing. When a key is set, Bangla narration is polished by GPT-4o-mini behind a **grounding guard** that rejects any output introducing a drug the engines never surfaced. Finally the engines' outputs are aggregated into the **doctor co-pilot**: red flags (danger signs + critical drug blocks), still-to-ask guideline checks, cautions, and the ranked differential — pure deterministic aggregation, prioritized for a 90-second consult.

### 4.5 Voice & accessibility
The `/live` page uses the **browser Web Speech API** for keyless Bangla speech-to-text, and the patient view uses browser speech *synthesis* to read the summary aloud — both zero-cost and offline-capable on supported devices.

---

## 5. AI/ML approach

AI is **central, not peripheral** (§5.1): it owns every ambiguous step of the pipeline, while determinism owns the single irreversible one.

- **Speech understanding** — dual-device Bangla ASR with cross-device transcript fusion that recovers words one mic missed.
- **Clinical NLU** — GPT-4o-mini **structured extraction** over free-form bilingual speech, merged onto a deterministic lexicon floor (the LLM can add findings, never remove a catch).
- **Cross-lingual semantic retrieval** — dense embeddings + BM25 + TF-IDF under Reciprocal Rank Fusion, with **mandatory citation** so answers are auditable, judge-verifiable claims.
- **Self-reflective agentic loop** — a critic that detects its own grounding gaps and re-retrieves before synthesis; **honest refusal** when nothing grounds is a demonstrated feature, not a hidden fallback.
- **Guarded generation** — GPT-4o-mini narrates plain-Bangla output behind a guard that rejects un-grounded drug mentions. The deterministic engines (IMCI tree, med-safety tables) make the high-stakes calls — the answer to *"what if the AI is wrong?"* is that the dangerous decision was never the AI's to make.
- **Key-optional by design** — every AI role has a deterministic fallback, so the public demo can never break; the same eval passes on both paths.

---

## 6. Results

We evaluate on a hand-built labelled set covering the demo case plus edge cases (age-specific thresholds, stridor, general danger signs, cross-sensitivity, interactions, safe alternatives, and an empty input). The harness is reproducible: `python backend/eval/run_eval.py`.

| Component (N) | Metric | Result |
|---|---|:---:|
| **IMCI engine** (17) | Classification accuracy | **17/17 (100%)** |
| | Danger-sign recall — *missed referrals* | **5/5 (100%) — 0 missed** |
| | Specificity — *false referrals* | **12/12 (100%) — 0 false** |
| **Med-safety** (13) | Catch rate (unsafe blocked) | **7/7 (100%)** |
| | False positives (safe blocked) | **0/6 (0%)** |
| **Orchestrator** (4) | Grounding rate | **3/3 (100%)** |
| | Citation present | **3/3 (100%)** |
| | Honest-refusal accuracy | **1/1 (100%)** |

Unit tests: **29/29 pass** (`safety` 9 · `rag` 6 · `asr` 4 · `agents` 6 · `sessions` 4). All numbers are measured on the keyless deterministic path, so they hold for any cold visit to the live URL.

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

**Future work.** Server-side cloud Bengali ASR and speaker diarization; WebSocket real-time sync (today: ~3s HTTP polling) and a durable longitudinal record (today: in-memory session + on-device summary); swap the dense retriever for **BGE-M3** and broaden the corpus beyond pediatric ARI; clinical validation with a partner facility and a doctor co-sign; DGHS facility-directory referral routing.

---

## 8. Innovation & related work (honest derivation)

Codoctor does not claim to invent ambient clinical AI. The category is proven at scale abroad — The Permanente Medical Group enabled an ambient AI scribe for **10,000 physicians across ~303,000 encounters within 10 weeks** (NEJM Catalyst, 2024) — yet the literature explicitly flags that these tools **fail in low-resource, multilingual settings** (npj Digital Medicine, 2026). Codoctor **localizes the proven pattern** (Abridge / Nuance DAX / Nabla; the self-reflective agentic-RAG loop; "deterministic tool decides, model narrates") to the one setting those products were never built for: a **Bangla, voice-first, 90-second, no-EHR, low-literacy** consultation — and adds two things the Western vendors don't have: a **deterministic danger-sign/drug-safety net** and a **patient-held record** that bootstraps continuity of care where no EHR exists. Per the rulebook's own note (§8.1), *"a novel approach to a local problem can score higher than a technically complex but routine solution."*

---

### Appendix — reproduce the numbers
```bash
cd backend && python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python tests/test_safety.py     # 9/9    (also: test_rag 6, test_asr 4, test_agents 6, test_sessions 4)
python eval/run_eval.py         # the table in §6
```

*Convert this report to PDF (≤8 pages, ≥10pt) before submission — e.g. `pandoc docs/REPORT.md -o REPORT.pdf`, VS Code "Markdown PDF", or print-to-PDF from a Markdown preview.*
