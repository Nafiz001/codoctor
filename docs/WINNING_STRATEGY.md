# Codoctor → SciBlitz AI Challenge 2026: Final Strategy

*Written against the real, deployed build, line-verified in-repo. Every claim below was checked against the code: `safety/imci.py` (RR 52 + age 36mo → **Pneumonia**, not severe — severe is driven by chest-indrawing), `asr/fusion.py` (merge requires same-speaker + 2.5s window + 0.4 lexical ratio), `sessions/store.py` (in-memory, single-process, 2h TTL, all segments stamped `speaker="spk"`), `agents/graph.py` (critic checks source-TYPE only; refusal is an empty-input guard), `agents/differential.py` (any measured RR flips `fast_breathing` on), `frontend/app/room/page.tsx` (fused transcript is NOT rendered; `{recovered}` count chip already exists), `frontend/app/doctor/page.tsx` (already renders an agent trace), `eval/run_eval.py` (hardcoded IMCI/med/orchestrator tuples; no ASR/fusion eval). ~3.5 weeks to the Jul 1 23:59 BST hard deadline. Tiny team.*

**Rubric — CONFIRMED from the official rulebook** (`rulebook_text.txt` §8): **Innovation & Originality 25 · Technical Implementation 25 · Real-world Impact & Relevance 20 · Demo Quality & Functionality 20 · Presentation & Communication 10** (= 100). Judges: a panel of ≥2, scores averaged. Key evaluation notes, verbatim-ish:
- *"Technical Implementation does not require training a model from scratch. Effective, appropriate, and well-integrated use of existing tools and APIs will score well."* → **directly validates Codoctor's approach** (deterministic engines + LangGraph + hybrid RAG + key-optional LLM; no training needed). Do not apologize for not training a model.
- *"Demo Quality is evaluated on your live hosted URL **and** demo video. A broken demo will result in a significantly lower score."* → the seeded replay + keep-alive + recorded clip are not optional polish; they directly protect 20 points.
- *"Innovation is assessed **relative to the problem context** — a novel approach to a local problem can score higher than a technically complex but routine solution."* → the BD/Bangla/no-EHR/90-second localization IS the innovation; lean in.
- *"Presentation score applies only to teams in the Final Day. Remote teams' communication scores are based on the report and video."* → **Presentation 10 only counts if you're shortlisted.** Top 20 by aggregate are shortlisted (notified Jul 3) for Final Day (Jul 10: 5-min present + 3-min Q&A). So the **report + video must carry you into the top 20 first** — they are weighted highest in practice.

---

## 1. If you do only 5 things before Jul 1

1. **Rubric confirmed (25/25/20/20/10) — now optimize the report + video first**, because top-20 shortlisting (notified Jul 3) is by aggregate score and Presentation (10) only counts if you reach Final Day. Double-check you have all 5 deliverables (live no-login URL, public repo, ≤8-pg PDF, 3–5 min video, 1-pg model card) and registered by Jun 23; one missing deliverable is a zero.
2. **Make a single-device seeded replay the canonical "judge tries it" path** — a "Run demo consultation" button that injects 2–3 authored Bangla utterance pairs (with complementary per-mic dropouts so a *recovered* token fires every time) and runs the full fuse → Scribe → orchestrator → spoken-Bangla-summary pipeline, so no second phone, no room noise, and no dyno-restart can break the climax.
3. **Lock one named Bangladeshi clinician quote this week** (dated owner + named backup) — a pediatrician/government-OPD doctor (or, fallback, a final-year medical student / IMCI trainer) confirms on camera that the danger-sign tree and drug rules match practice; this is the single highest-leverage Impact point.
4. **Fix the flagship demo narration and the differential bug** — say "fast breathing (RR 52, above the 40/min IMCI threshold) **plus** lower chest-wall indrawing → Severe pneumonia, urgent referral" (NOT "RR 52 → severe"), and tighten `differential.py` so a measured RR only counts as fast-breathing above the age threshold; both are clinician-catchable errors today.
5. **Add a keep-alive pinger AND record a flawless canonical demo clip** — the pinger stops Render *sleep* but not a dyno *restart* that wipes the in-memory session, so the recorded run + the seeded single-device replay are your real survivability net.

---

## 2. Honest standing & the moat

**Lean into exactly three differentiators — all provable from the repo, none dependent on contested external numbers:**

1. **"The LLM never decides — it only narrates."** All high-stakes calls are deterministic rule engines: `safety/imci.py` (WHO IMCI danger-sign tree) and `safety/medsafety.py` (allergy / cross-sensitivity / interaction / duplication), each returning its own citation. `agents/llm.py` is key-optional and defaults to a deterministic Bangla template; the synthesize node refuses to add unsupported claims. This is the most defensible thing you have and the cleanest answer to the #1 judge objection ("what if the AI is wrong?"). **Defend it from the code, not from third-party effect sizes.**

2. **Two-phone transcript fusion — sold as a *demonstrated mechanism*, not a live miracle.** `asr/fusion.py` recovers tokens one mic missed from the other and flags `recovered`. Be honest internally: in a real room this rarely fires, because every utterance is stamped the same `speaker="spk"`, the two phones segment Bangla differently, and most segments fall through as single-source pass-through (the 0.4 min-ratio guard *correctly* refuses to blend unrelated text). So **demonstrate fusion on the seeded transcript** where complementary dropouts guarantee a recovery — and frame the graceful pass-through as a *safety feature* ("it never invents overlap that wasn't there").

3. **The patient *hears* a plain-Bangla take-home summary** — the equity/emotional differentiator no incumbent occupies (Abridge/DAX/Nabla are clinician-facing; OpenEvidence is physician-facing; Hippocratic is patient-facing but US/English). **Soften the wording**: today the summary lives only in the ephemeral session + on-screen, so say *"patient-held spoken plain-Bangla take-home summary"* — and earn the literal "held" by adding a one-button download/save (see §4).

**The blunt risk:** your differentiators are Innovation/Technical-flavored, but feasibility and demo reliability decide these competitions. **Your marginal points are in Impact validation and a bulletproof demo, not more architecture.**

---

## 3. Prioritized roadmap

Effort: S = <½ day · M = 1–2 days · L = 3+ days. Priority: P0 = must-ship · P1 = high-value · P2 = if time.

### 3A. Already built — do NOT rebuild; showcase it

| Item | What / how to showcase | Why it wins + rubric tie | Effort | Pri |
|---|---|---|---|---|
| Deterministic IMCI + med-safety engines | **Done** (`safety/imci.py`, `medsafety.py`). Demo the **amoxicillin-blocked-on-penicillin-allergy → azithromycin alternative** catch firing *with its citation*. | Innovation + Technical + Impact: "LLM never decides." | S (it's a demo beat) | **P0** |
| LangGraph orchestrator + critic re-retrieve loop | **Done** (`agents/graph.py`). `/doctor` **already renders the agent trace** (page.tsx:450) — reuse that exact component. | Technical + Innovation: multi-step, not one hidden prompt. | S | **P0** |
| Agent trace on the LIVE `/room` climax | **NOT done in /room** — RoomResult shows only chips, no trace timeline. Port the `/doctor` trace component into `/room`. | Technical + Demo: the climax surface should show the reasoning. | **S–M (real new UI)** | **P1** |
| Difflib fusion + `recovered` flag | **Done** (`asr/fusion.py`). The `{recovered} recovered` chip already renders (room/page.tsx:514). | Innovation — but only reliable on seeded input. | S | **P0** |
| Cited hybrid retriever (BM25+TF-IDF+RRF) | **Done** (`retriever.py`). Per-result scores exist. | Technical + provenance trust. | S | **P0** |
| Live QR `/room` session | **Done** (`sessions/store.py`, `summary.py`). Keep it as the *aspirational* live path; make seeded single-device the *primary* judge path. | Demo. | — | **P0** |
| Eval harness (IMCI 12/12, recall 4/4, spec 8/8, med 4/4 + 0 FP, grounding 2/2, refusal 1/1) | **Done** (`eval/run_eval.py`). Put the table on report p.1–2 + one video slide. | Technical: a reproducible results table you can defend live. | S | **P0** |
| Honest refusal on no-data | **Done** (`graph.py:242`) — but it's an **empty-input guard**, not calibrated abstention. Demo it as "refuses with zero input"; do NOT oversell as uncertainty handling. | Innovation/Demo (narrow). | S | **P1** |
| CiteChips (source · ref) | **Done** but **non-clickable** (room/page.tsx:609). | Provenance. | — | done |

### 3B. New / polish work to actually do

| Item | What | Why it wins + rubric tie | Effort | Pri |
|---|---|---|---|---|
| **Seeded single-device replay** | "Run demo consultation" button injecting 2–3 authored Bangla utterance pairs with complementary dropouts through the *real* pipeline; reconstructs full output with no 2nd phone. | Demo + reliability. Survives dyno restart, room noise, iOS, two-device desync. **The most important single build.** | M | **P0** |
| **Fix demo narration: RR 52 ≠ severe** | Re-script every artifact to "fast breathing (RR 52 > 40/min) **+** chest indrawing → Severe pneumonia." | Inoculates against a pediatrician judge catching a false claim. | S | **P0** |
| **Fix `differential.py` fast-breathing bug** | Only set `fast_breathing` when measured RR ≥ `fast_breathing_threshold(age)` (reuse the imci.py fn). | Removes a Q&A liability (normal-RR child surfacing bronchiolitis/asthma). | S | **P0** |
| **Keep-alive pinger** | UptimeRobot/cron on `/health` every ~10 min through Jul 10. | Demo: stops cold-start sleep (but NOT restart — see clip below). | S | **P0** |
| **Recorded canonical demo clip** | Screen-record the flawless run; the offline fallback if anything live breaks. | Demo survivability (covers dyno restart wiping the session). | S | **P0** |
| **Download/save the patient summary** | One button: `localStorage` save + printable/downloadable plain-Bangla summary on `patient/`. | Makes "patient-*held* record" literally true; Impact. | S | **P1** |
| **Fused-transcript view + inline recovered-token highlight in /room** | `/room` does NOT render the fused transcript at all today — add the transcript with recovered tokens visually marked. | Innovation made *visible* — but it's **new UI**, not a free win. | M | **P1** |
| **Expand eval to concrete boundary tuples** | Add to existing lists: IMCI threshold cases (RR exactly at 40/50 for both age bands), more med pairs from `data.py` (INTERACTION_PAIRS, CROSS_SENSITIVITY, duplicate-class), and an orchestrator case that forces the critic's gap→re-retrieve loop. | Technical: N≈4–8 reads thin; richer tuples are cheap with the existing harness. | M | **P0** |
| **1-page Model & Data card** (required) | CHAI nutrition-label: intended use, out-of-scope, 16-doc cited corpus + provenance, eval table, named limits, human oversight. | Required deliverable + Impact (stating limits reads as rigor). | M | **P0** |
| **README rewrite** | Mermaid orchestrator+fusion diagrams, worked API request/response, eval table + the exact command to reproduce it, "deterministic vs LLM" section, embedded demo GIF. | Technical + repo hygiene (slick video + thin repo is a known red flag). | M | **P0** |
| **Make CiteChips clickable** | Link the existing source·ref chip to the corpus entry (data already present per result). | Provenance polish. | S | **P2** |
| **No-login verification pass** | Test every route from fresh incognito on **Chrome/Android** AND on an **iPhone** (Web Speech yields nothing on iOS Safari — keep `/doctor` scripted as the iOS-safe entry). | Required (live public no-login URL). | S | **P0** |

### 3C. Narrative / positioning (cheap, high leverage)

| Item | What | Why it wins | Effort | Pri |
|---|---|---|---|---|
| **Human cold-open** | Bangla-only mother, feverish child, unreadable English prescription, ~1-minute consult. | Impact + Presentation. | S | **P0** |
| **Consult-length stat** | Open with a sourced short-consult figure (verify the exact paper before quoting). Keep the national-average and the busy-OPD 60–120s estimate as **two distinct figures** so a sharp judge can't catch an inconsistency. | Impact. | S | **P0** |
| **WHO ethics half-page + 1 slide** | Map WHO's 6 LMM principles → Codoctor design choices; explicitly name *automation bias* and how "LLM only narrates" mitigates it. | Impact + Q&A inoculation. | S | **P0** |
| **Incumbent map (1 slide)** | "Abridge for the doctor, OpenEvidence for evidence, Hippocratic for the patient — Codoctor fuses all three for a Bangla, no-EHR, ~1-minute government OPD." | Innovation: scopes novelty to intersection+context; immune to "this exists." | S | **P0** |
| **Q&A kill-list** | Pre-scripted (see §9). | Presentation. | S | **P0** |

---

## 4. New feature shortlist (BD/Bangla-specific)

**Build before Jul 1:**

1. **Seeded single-device replay** (M, **P0**) — the canonical demo path; removes the two-phone choreography and room-noise risk entirely. Author the utterances so a *recovered* token and the IMCI + med-safety catches all fire deterministically.
2. **Download/save the patient summary** (S, **P1**) — `localStorage` + printable Bangla card, so "patient-held record" is literally true on camera.
3. **Fused-transcript view with inline recovered-token highlight in `/room`** (M, **P1**) — net-new UI; makes the fusion mechanism *visible* in 2 seconds. (The `recovered` *count* chip already exists; the transcript itself does not.)
4. **Differential fast-breathing fix** (S, **P0**) — see §3B; also a feature-quality fix.
5. **Sylheti/dialect honesty beat** (S, **P1**) — one Sylheti-flavored Bangla line with a caption that dialect ASR is hard and fusion + the deterministic Scribe degrade gracefully; differentiates from English-assuming incumbents. (Only quote a specific Sylheti WER number if you can open and verify the source.)

**Architected, not built — say so plainly (reads as maturity, not weakness):**

- WebSocket real-time (today: ~3s HTTP polling).
- Speaker diarization (today: all `speaker="spk"`; upgrade path pyannote-3.0 + a SAD front-end).
- Dense retriever / BGE-M3 (the `search()` contract is the swap-in point).
- Durable persistence / longitudinal multi-visit record (today: in-memory 2h TTL session; `localStorage` is the first durable rung).
- Fine-tuned Bangla medical Whisper (today: keyless Web Speech — honesty about this is a strength).
- Multi-condition corpus (today: 16 atomic cited units scoped to pediatric ARI + the demo drugs).
- Doctor co-sign-at-scale (a simple "Doctor reviewed & confirmed" toggle in `/doctor` is shippable in S as a P2 demonstrator — keep it **separate** from the human clinician-quote validation).

---

## 5. Rubric-by-rubric play

**Innovation & Originality.** Brand the trio verbatim: *deterministic safety net (LLM never decides) + two-phone fusion (demonstrated on a controlled transcript) + patient-held spoken Bangla summary.* Show one concrete before/after each: the amoxicillin→azithromycin med catch, and a fusion recovery on the seeded transcript. Add the incumbent map. **Say "distinctively combines," never "first"** — no exposable superlative.

**Technical Implementation.** One reproducible results table from `eval/run_eval.py` (IMCI classification, danger-sign recall + specificity, med catch + false-positive, grounding, refusal) plus the new boundary cases. Show the agent trace (already in `/doctor`). Present safety as a **separate, deterministic axis** you can prove from the code — not from third-party effect sizes you can't defend live. Report fusion honestly as a token-recovery rate on hand-authored pairs (see §7), labeled an illustrative micro-ablation on synthetic dropouts.

**Real-world Impact.** Cold-open with the human story and a verified consult-length stat. The Bangla-prescription comprehension gap is your strongest contextual hook — verify the exact numbers before quoting. Position Codoctor as *complementary* to DGHS / Shastho Batayon, with the patient summary as a future EHR seed. Affordability: deterministic core + key-optional LLM + keyless Web Speech = ~zero recurring per-call cost on phones people already own. Concrete pilot: one upazila government OPD, IMCI pediatric-fever pathway. **The named clinician quote is the highest-leverage single move here.**

**Demo Quality.** Climax = the seeded single-device replay (primary) or, if conditions allow, a judge scanning the QR to become the patient and *hearing* the phone speak the Bangla summary (aspirational). Two staged wow beats: (1) danger sign fires with its WHO IMCI citation; (2) the patient phone speaks Bangla aloud. Pre-warm backend; keep the recorded clip cued; verify no-login on cellular and on iPhone.

**Presentation.** Story-first, sparse slides. One bilingual confident presenter. Rehearse the Q&A kill-list aloud. Land the eval table as the closer.

---

## 6. Demo + video + report + model-card tactics

**3–5 min video:**
- **0:00–0:20** — Cold open, no title slide: the human scene + the consult-length stat.
- **0:20–2:30** — One unbroken golden path via the **seeded single-device replay** on a real phone: QR/start → fused transcript with a *recovered* word visible → deterministic **danger sign (fast breathing RR 52 + chest indrawing → Severe pneumonia)** and **med-safety (amoxicillin blocked on penicillin allergy → azithromycin)** firing *with citations* → cited differential + completeness → SOAP draft → **patient phone speaks the Bangla summary aloud.** Captions on all Bangla.
- **2:30–3:30** — Eval table (0 missed danger signs, 0 false referrals) + WHO-ethics one-liner + the clinician quote + "advisory, clinician-in-the-loop, deployable at DGHS scale."

**Reliability / fallback ladder (ordered):** (1) seeded single-device replay — primary, immune to room noise / iOS / two-device desync; (2) pinger to prevent sleep; (3) recorded canonical clip — covers a dyno restart that wipes the in-memory session (the pinger does NOT cover this); (4) `/doctor` scripted cockpit as the iOS-safe entry. YouTube unlisted (primary) + Drive (backup). Narrate over the ~3s polling so latency reads as "working."

**≤8-page report (mini research paper):** p.1 problem + consult-length stat + thesis; p.2 system diagram + eval table; then deterministic-safety, fusion + micro-ablation, grounding/RAG, impact + pilot, ethics/limitations, references. **Re-verify every external citation against the actual source before submission and drop any you cannot open** — the citation layer has already produced misattributions, and one exposed fabrication discredits the whole report.

**Model & Data card (CHAI nutrition-label):** intended use (advisory, non-diagnostic, pediatric-ARI golden path, clinician-in-the-loop); out-of-scope; data = 16-doc cited corpus (WHO IMCI / DGHS STG / National Formulary) + keyless Web Speech ASR with a WER caveat; evaluation = your numbers; limitations stated plainly (HTTP polling not WebSockets; no diarization; narrow corpus; no dense retriever; ephemeral in-memory session; iOS-Safari ASR gap; no co-sign-at-scale; free-tier sleep/restart); human oversight.

---

## 7. Technical-credibility moves (specific)

- **Expand the eval with concrete tuples the harness already accepts** (in `eval/run_eval.py`'s `IMCI_CASES` / `MED_CASES` / `ORCH_CASES`): IMCI RR exactly at threshold for both age bands; more med pairs from `safety/data.py` (INTERACTION_PAIRS, CROSS_SENSITIVITY, duplicate-class); an orchestrator case engineered to trip the critic's gap→re-retrieve loop. Report as a "pilot eval set."
- **Fusion micro-ablation — down-scoped to be feasible.** Hand-author **~8–10 Bangla utterance pairs** with hand-injected complementary dropouts; report **token-recovery rate = recovered tokens / total dropped tokens**, reusing the existing `recovered` flag. **No WER library, no reference-corpus build.** Label it explicitly: *illustrative micro-ablation on synthetic dropouts, not a corpus WER study.* (Full WER-delta is P2/optional — there is no WER scaffolding in the repo and building it competes with the report/card/video.)
- **Grounding metric — report what the code actually computes.** The critic (`graph.py:152–162`) checks only that an IMCI/formulary **source TYPE** was retrieved when a critical finding fires — it does NOT verify sentence-level support. So report **"citation-source coverage"** and **"unsupported-claim suppression rate"** as what the critic enforces. Do **not** claim RAGAS-style per-claim faithfulness you don't compute.
- **Lean on your own reproducible eval, which you can run live**, and lean *less* on contested third-party effect sizes. If you cite external work (WHO IMCI booklet, DGHS STG, the consult-length paper, a Bangla-medical-AI paper), open each source and confirm the ID and the number first.

---

## 8. Impact & validation plan

1. **One named, credentialed Bangladeshi clinician quote — first dated action, with a named backup.** This week: a pediatrician or government-OPD doctor watches a 5-min walkthrough, confirms the danger-sign tree + drug-safety logic match practice, and gives a 2-sentence on-camera/written quote with name + credentials. **Pre-write the 2-sentence quote and the 5-min walkthrough script so the ask is ~20 minutes.** Named backup if no attending is reachable: a final-year medical student or a public IMCI trainer. **If no clinician materializes at all**, fall back to the verifiable truth: the danger-sign tree and drug rules are transcribed verbatim from WHO IMCI / DGHS STG / National Formulary, auditable in `rag/corpus.py` and `safety/data.py`. **Do not fabricate; keep this separate from the co-sign UI toggle.**
2. **5-user guerrilla usability test — done correctly.** ~5 problems-found-per-group means **~3 "patients"** (Bangla-first; test QR-join + summary comprehension) **and ~3 "doctors/med students"** (test cockpit + fusion + SOAP) — not 5 split across both. Report indicatively (median join-to-summary time qualitatively; quantitative metrics need ~40 users), 2–3 verbatim quotes, 1–2 concrete changes made. Cite the per-group rule to inoculate against a methodology-savvy judge.
3. **Quantified framing (verify each number before quoting):** short-consult length • the Bangla prescription-comprehension gap • the value of full-protocol IMCI adherence (frame Codoctor as an *adherence aid*, never an instrument/oximeter replacement). Honest evidence ladder: "5-user test + clinician co-sign are the first rung; no cost-effectiveness study yet."

---

## 9. Pitfalls + explicit CUT LIST

**Pitfalls (with mitigations):**
- **"RR 52 → severe" is clinically false** — severe is driven by chest-indrawing, not RR (RR 52 at 36mo = Pneumonia). Re-narrate everywhere. **Add to Q&A.**
- **Differential surfaces bronchiolitis/asthma for a normal-RR child** (`differential.py:51`) — fix the threshold check; have the Q&A answer ready.
- **Live fusion rarely shows a recovery** (same `speaker="spk"`, 2.5s window, 0.4 ratio) — demo it on the seeded transcript; Q&A: "fusion only merges genuine same-utterance overlap and degrades to safe pass-through."
- **Ephemeral session loss on dyno restart** — the pinger prevents sleep, NOT restart; the recorded clip + seeded single-device replay are the real net.
- **iOS Safari yields nothing from Web Speech** — specify Chrome on Android/desktop, test on an iPhone, keep `/doctor` as the iOS-safe entry, lead judges to the seeded single-device path.
- **Two-device choreography desync over 3s polling** — single-device seeded replay removes it.
- **Cold-start backend** — pinger + pre-warm before every recording and judging window.
- **"Patient-held record" with no durable storage** — soften wording and/or add the `localStorage`/download button.
- **Misattributed/unverifiable citations** — re-verify every external stat and arXiv ID; drop what you can't open. Do NOT present any British-Medical-Association figure as Bangladeshi.
- **Thin repo behind a slick video** — README rewrite is P0.
- **Selling "cited RAG" as the innovation** — it's table stakes. Sell *what* you ground in (DGHS STG / National Formulary), not *that* you cite.
- **Overclaiming refusal as uncertainty handling** — it's an empty-input guard; describe it accurately.

**CUT LIST — do NOT spend time on before Jul 1:**
- WebSocket real-time (HTTP polling is fine; name it as roadmap).
- Speaker diarization (have the pass-through defense; pyannote-3.0 as upgrade path).
- Dense retriever / BGE-M3 (cite the `search()` swap-in point).
- Fine-tuned Bangla medical Whisper (future work; keyless Web Speech honesty is a strength).
- Broadening the corpus beyond pediatric ARI (narrow-and-deep is the winning pattern — frame the 16 cited units as *auditable completeness for one pathway*, provable in `rag/corpus.py` + `safety/data.py`).
- A full WER ablation / WER library (do the token-recovery-rate micro-ablation instead).
- An LLM-judge eval harness (use the deterministic key-free citation-source-coverage metric).
- Longitudinal multi-visit record, real EHR integration, auth/login, any second track.
- A second golden path / multi-disease demo (one flawless path beats many half-features).
- Fancy charting/dashboards.
