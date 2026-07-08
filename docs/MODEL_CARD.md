---
pdf_options:
  margin: "9mm 12mm"
css: |
  body { font-size: 10px; line-height: 1.32; }
  h1 { margin: 0 0 1px; }
  h2 { margin: 7px 0 2px; }
  p, li { margin: 1px 0; }
  ul, ol { margin: 1px 0; }
  table { font-size: 8.8px; margin: 3px 0; }
  th, td { padding: 1px 4px; }
---

# Codoctor — Model & Data Card

**SciBlitz AI Challenge 2026 · Track A.** Advisory, non-diagnostic clinical decision-support. Live: https://codoctor.vercel.app · Repo: https://github.com/Nafiz001/codoctor

## Intended use & scope

- **Intended use:** an *advisory* co-pilot for a clinician during a short OPD consultation in a low-resource Bangladeshi setting — surfacing cited guideline prompts, a deterministic danger-sign and drug-safety check, and a plain-Bangla spoken take-home summary for the patient.
- **Intended users:** a licensed clinician (or, for the patient summary, the patient) — never an unsupervised layperson for self-treatment.
- **Out of scope:** autonomous diagnosis or prescription; emergencies without a clinician; conditions outside the modelled **pediatric acute respiratory infection (WHO IMCI)** golden path; any use that replaces professional judgement.
- **Human oversight:** every output requires clinician confirmation. The deterministic engines make the high-stakes calls; the LLM only narrates and is forbidden from adding un-grounded claims.

## Pre-trained models used

| Model / service | Provider | Role | License | Notes |
|---|---|---|---|---|
| **GPT-4o-mini** | OpenAI | **Key-optional, two roles:** (1) structured clinical-entity extraction from the fused Bangla transcript, merged *on top of* a deterministic lexicon floor it can add to but never override; (2) Bangla narration — *rephrases already-grounded findings only*, behind a guard rejecting un-grounded drug mentions | Proprietary (commercial API) | **Not required.** System runs fully without any key (regex Scribe + template narration). The LLM never makes a clinical decision. `ANTHROPIC_API_KEY`/Claude Haiku is a supported alternative. |
| **text-embedding-3-small** | OpenAI | **Key-optional** dense semantic ranker fused (RRF) with BM25 + TF-IDF for cross-lingual retrieval | Proprietary (commercial API) | Corpus embedded once and cached; only the query embedded per request. Without a key, retrieval is the keyless two-ranker hybrid. |
| **Web Speech API — SpeechRecognition** | Browser/OS (e.g. Chrome → Google) | Keyless Bangla speech-to-text on `/room` and `/live` | Browser-provided service | No model shipped or trained by us; availability/quality depend on the user's browser. |
| **Web Speech API — SpeechSynthesis** | Browser/OS | Reads the patient's Bangla summary aloud | Browser-provided service | Same as above. |
| BGE-M3 (`BAAI/bge-m3`) | BAAI | Self-hosted dense retrieval | MIT | **Planned replacement** for the OpenAI embedding dependency; the `retriever.search()` contract is the swap-in point. |

**No model training or fine-tuning was performed.** The deterministic engines and retriever are authored, auditable code.

## Data sources

| Source | Owner | Use |
|---|---|---|
| **WHO IMCI chart booklet** (cough/difficult-breathing thresholds, danger signs) | World Health Organization | Authored the danger-sign decision tree and cited corpus chunks (paraphrased, with attribution). |
| **DGHS Standard Treatment Guidelines (Bangladesh)** | DGHS, Govt. of Bangladesh | Cited corpus chunks for childhood-pneumonia treatment & referral. |
| **National Drug Formulary of Bangladesh / BNF** | DGDA / formulary bodies | Drug-class map, contraindication & interaction facts; cited monograph chunks. |
| **Evaluation set** | Authored by us | Hand-labelled cases in `backend/eval/run_eval.py`: 17 IMCI classification cases, 13 medication-safety cases, 4 orchestrator cases. Reproduce with `python backend/eval/run_eval.py`. |

We reproduce **no copyrighted text verbatim at scale** — corpus entries are concise paraphrases of public clinical guidance, each attributed to its source. No patient data is used; the demo uses synthetic, anonymized cases.

## Evaluation results

Software-correctness on our authored set (`python backend/eval/run_eval.py`), **not** patient-outcome accuracy: IMCI classification **17/17**; danger-sign recall **5/5 (0 missed)**; specificity **12/12 (0 false referrals)**; medication-safety catch **7/7** with **0/6 false-positives**; orchestrator grounding + citation **3/3**; honest refusal on insufficient data **1/1**. Unit tests **29/29** — all measured on the keyless deterministic path.

## Known limitations & ethical considerations

- **Advisory & non-diagnostic.** Does not diagnose, prescribe, or replace a clinician; every output requires clinician confirmation. Deterministic engines make the high-stakes calls; the LLM only narrates.
- **Not clinically validated.** Reported numbers are software-correctness on a curated set, **not** patient-outcome accuracy. Scope is currently **pediatric acute respiratory infection (WHO IMCI)** only; a small corpus over-represents the modelled condition.
- **Guideline currency.** Paraphrased chunks may lag official updates — always defer to the current WHO/DGHS/NDF source.
- **Voice reliability.** Browser Bangla ASR degrades on dialect/noise and is unavailable on iOS Safari; mitigated by dual-mic fusion, a typed/seeded fallback, and the scripted `/doctor` path. No speaker diarization — streams are fused by timing + lexical overlap (genuine same-utterance merges only).
- **Engineering limits (honest).** Live session is in-memory (single process, ~2h TTL; a restart clears it) and syncs by ~3s HTTP polling, not WebSockets; the patient summary persists only on the patient's device. No durable longitudinal record, dense retriever, or clinician co-sign yet.
- **Privacy & misuse.** Processed in-session; the patient owns their record; no PII retained server-side. Unsupervised self-treatment is an explicit risk — the UI keeps a clinician/facility in the loop and states the advisory scope. Broadening coverage and clinical co-sign are required before any real-world use.
