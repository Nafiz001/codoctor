# Codoctor — Model & Data Card

**SciBlitz AI Challenge 2026 · Track A.** Advisory, non-diagnostic clinical decision-support. Live: https://codoctor.vercel.app · Repo: https://github.com/Nafiz001/codoctor

## Pre-trained models used

| Model / service | Provider | Role | License | Notes |
|---|---|---|---|---|
| **GPT-4o-mini** *or* **Claude Haiku** | OpenAI / Anthropic | **Optional** Bangla narration — *rephrases already-grounded findings only* | Proprietary (commercial API) | **Not required.** System runs fully without any key via deterministic template narration. The LLM never makes a clinical decision and is forbidden from adding new claims. |
| **Web Speech API — SpeechRecognition** | Browser/OS (e.g. Chrome → Google) | Keyless Bangla speech-to-text on `/live` | Browser-provided service | No model shipped or trained by us; availability/quality depend on the user's browser. |
| **Web Speech API — SpeechSynthesis** | Browser/OS | Reads the patient's Bangla summary aloud | Browser-provided service | Same as above. |
| BGE-M3 (`BAAI/bge-m3`) | BAAI | Dense retrieval | MIT | **Planned, not in current build** — retrieval is currently a dependency-free hybrid (BM25 + TF-IDF + RRF) so the free tier serves it instantly. |

**No model training or fine-tuning was performed.** The deterministic engines and retriever are authored, auditable code.

## Data sources

| Source | Owner | Use |
|---|---|---|
| **WHO IMCI chart booklet** (cough/difficult-breathing thresholds, danger signs) | World Health Organization | Authored the danger-sign decision tree and cited corpus chunks (paraphrased, with attribution). |
| **DGHS Standard Treatment Guidelines (Bangladesh)** | DGHS, Govt. of Bangladesh | Cited corpus chunks for childhood-pneumonia treatment & referral. |
| **National Drug Formulary of Bangladesh / BNF** | DGDA / formulary bodies | Drug-class map, contraindication & interaction facts; cited monograph chunks. |
| **Evaluation set** | Authored by us | Hand-labelled IMCI / medication / orchestrator cases (`backend/eval/run_eval.py`). |

We reproduce **no copyrighted text verbatim at scale** — corpus entries are concise paraphrases of public clinical guidance, each attributed to its source. No patient data is used; the demo uses synthetic, anonymized cases.

## Known limitations & ethical considerations

- **Advisory & non-diagnostic.** Codoctor does not diagnose, prescribe, or replace a clinician; every output requires clinician confirmation. The deterministic engines make the high-stakes calls; the LLM only narrates.
- **Not clinically validated.** Reported numbers are software-correctness on a curated set, **not** patient-outcome accuracy. Scope is currently **pediatric acute respiratory infection (IMCI)** only.
- **Guideline currency.** Paraphrased chunks may lag official updates — always defer to the current official WHO/DGHS/NDF source.
- **Voice reliability.** Browser Bangla ASR degrades on dialect/noise; mitigated by dual-mic fusion, transcript read-back, and a typed fallback.
- **Privacy.** Data is processed in-session; the patient owns their record; no PII is retained server-side. Misuse for unsupervised self-treatment is an explicit risk — the UI keeps a clinician/facility in the loop and states the advisory scope.
- **Bias/coverage.** A small corpus over-represents the modelled condition; broadening coverage and clinical co-sign are planned before any real-world use.
