# Codoctor (কো-ডক্টর)
### An ambient Bangla clinical co-pilot + safety-net + patient-held record for Bangladesh's overloaded OPDs

> A second pair of ears in the consultation room. Scan a QR to load the patient's history, let Codoctor listen to the doctor-patient conversation on **both** phones at once, and a team of agents — grounded in official clinical guidelines, **with citations** — makes sure no danger sign, drug interaction, or key question is missed. The patient walks out with a clear, spoken Bangla record they keep forever.

**Built for the [SciBlitz AI Challenge 2026](https://www.facebook.com/ieeecuetsb) — IEEE Student Branch, CUET · Track A (Health & Society).**

---

## The problem

In Bangladesh's government-hospital OPDs, a single doctor often sees 80–150+ patients a day — a real consultation is **60–120 seconds**. In that window things get missed (an un-asked red-flag question, an unchecked drug interaction, an un-escalated danger sign), nothing is recorded (there is **no national EHR** — the record is a paper slip the patient loses), and the Bangla-only, low-literacy patient doesn't understand the English prescription they're handed.

## What Codoctor does

- **QR-join session** — the patient scans the QR on the doctor's door; their longitudinal record (built by Codoctor on prior visits) loads on the doctor's screen.
- **Dual-device transcript fusion** — both phones capture audio; two ASR streams are reconciled into one high-confidence, speaker-labelled transcript (if one mic misses a word, the other fills it).
- **A multi-agent safety-net** — Differential, Completeness, Danger-Sign, and Medication-Safety agents work in the background and surface **quiet, cited, dismissible** prompts to the doctor. High-stakes checks (drug interactions, WHO IMCI danger signs) run on **deterministic tools**, not the LLM — the doctor always decides.
- **A patient-held record** — after the visit the patient gets a plain-Bangla, spoken "what you have / what to do / when to worry" card, kept on their phone and re-loaded by QR next time.

**Advisory & non-diagnostic. The clinician is always the decision-maker.**

## Architecture (high level)

```
Doctor + Patient mics
   → Heavy-ML front door: Bangla ASR ×2 → transcript fusion → diarization → entity extraction
   → Orchestrator (LangGraph): Differential · Completeness · Danger-Sign · Med-Safety · Patient-Summary agents
   → Hybrid RAG (BM25 + BGE-M3) over WHO / DGHS / National Formulary  +  deterministic safety tools
   → Critic verifies every claim is cited → grounded, cited output
```

Full product spec, data contracts, RAG design, evaluation plan, and rubric mapping: **[PRD.md](PRD.md)**.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (React) on Vercel — `/doctor` + `/patient/:session`, joined by QR |
| Backend | Python FastAPI on Render; WebSocket for the live transcript + agent-reasoning stream |
| Agents | LangGraph (orchestrator + specialist agents + critic) |
| Retrieval | Hybrid BM25 + BGE-M3 dense, over a curated WHO / DGHS / National Formulary corpus |
| ASR | Cloud Bengali ASR (`bn-BD`) + a deterministic "replay sample consultation" fallback |
| LLM | Frontier LLM for **Bangla narration only** (never the high-stakes decision) |
| TTS | `facebook/mms-tts-ben` + a Bangla numeral/dose normalizer |
| Safety core | Deterministic WHO IMCI danger-sign decision tree + drug-interaction engine |

## Status

🚧 In active development for SciBlitz AI Challenge 2026 (submission July 1, 2026). Golden-path demo scenario: **pediatric fever / ARI (WHO IMCI)**.

## Setup

> Scaffolding in progress — setup instructions will be added with the first code drop (`frontend/` + `backend/`).

## License & disclaimer

Codoctor is a clinical **decision-support** tool. It does not diagnose, prescribe, or replace a licensed clinician. All outputs are advisory and must be confirmed by a qualified doctor. See the Model & Data Card (forthcoming) for datasets, models, licenses, and known limitations.
