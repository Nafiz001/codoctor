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
| **Evaluation set** | Authored by us | Hand-labelled cases in `backend/eval/run_eval.py`: 17 IMCI classification cases, 13 medication-safety cases, 4 orchestrator cases. Reproduce with `python backend/eval/run_eval.py`. |

We reproduce **no copyrighted text verbatim at scale** — corpus entries are concise paraphrases of public clinical guidance, each attributed to its source. No patient data is used; the demo uses synthetic, anonymized cases.

## Evaluation results

Software-correctness on our authored set (`backend/eval/run_eval.py`), **not** patient-outcome accuracy:

| Metric | Result |
|---|---|
| IMCI classification accuracy | 17/17 (100%) |
| Danger-sign recall (0 missed referrals) | 5/5 (100%) |
| Specificity (0 false referrals) | 12/12 (100%) |
| Medication-safety catch rate | 7/7 (100%) |
| Medication false-positives | 0/6 (0%) |
| Orchestrator grounding / citation | 3/3 (100%) |
| Honest refusal on insufficient data | 1/1 (100%) |

## Known limitations & ethical considerations

- **Advisory & non-diagnostic.** Codoctor does not diagnose, prescribe, or replace a clinician; every output requires clinician confirmation. The deterministic engines make the high-stakes calls; the LLM only narrates.
- **Not clinically validated.** Reported numbers are software-correctness on a curated set, **not** patient-outcome accuracy. Scope is currently **pediatric acute respiratory infection (IMCI)** only.
- **Guideline currency.** Paraphrased chunks may lag official updates — always defer to the current official WHO/DGHS/NDF source.
- **Voice reliability.** Browser Bangla ASR degrades on dialect/noise and is **unavailable on iOS Safari**; mitigated by dual-mic fusion, a typed/seeded fallback, and the scripted `/doctor` demo path.
- **No speaker diarization.** The two device streams are fused by timing + lexical overlap, not by "who spoke"; fusion only merges genuine same-utterance overlaps and otherwise passes each device's text through unchanged.
- **Ephemeral sessions.** The live QR session is in-memory (single process, ~2h TTL); a server restart clears active sessions. There is no durable/longitudinal multi-visit record yet — the patient summary persists only on the patient's device.
- **Real-time transport.** The live session syncs by short HTTP polling (~3s), not WebSockets.
- **Privacy.** Data is processed in-session; the patient owns their record; no PII is retained server-side. Misuse for unsupervised self-treatment is an explicit risk — the UI keeps a clinician/facility in the loop and states the advisory scope.
- **Bias/coverage.** A small corpus over-represents the modelled condition; broadening coverage and clinical co-sign are planned before any real-world use.
