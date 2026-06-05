# PRD — Codoctor (কো-ডক্টর)
### An ambient Bangla clinical co-pilot + safety-net + patient-held record for Bangladesh's overloaded OPDs

> **Product name:** ✅ Codoctor (কো-ডক্টর) — "co-doctor," the doctor's co-pilot · *earlier working title: "Doctor-Sathi"*
> **Track:** A — Health & Society *(fits D — Open Innovation as fallback)*
> **One-liner:** A second pair of ears in the consultation room: it scans a QR to load the patient's history, listens to the doctor-patient conversation on **both** phones at once, and runs a team of agents that — grounded in official clinical guidelines, **with citations** — make sure no danger sign, drug interaction, or key question is missed, then hand the patient a clear, spoken Bangla record they keep forever.
> **Document status:** v0.2 — stack/scope/ASR locked (Jun 5): **Next.js + FastAPI**, **pediatric ARI/IMCI** golden path, **cloud Bengali ASR + deterministic replay fallback**. Remaining 🔶: track & name confirm, doctor co-sign. Today: **2026-06-05** · Submission: **2026-07-01** · Final: **2026-07-10**.

---

## 1. The problem (lead with this — it's 20% of the score)

Bangladesh has roughly **6 doctors per 10,000 people** (WHO threshold for "critical shortage" territory), and in government hospital outdoor departments (OPD) a single doctor commonly sees **80–150+ patients a day** — a real consultation is often **60–120 seconds**. In that window:

- **Things get missed.** A rushed history skips the one red-flag question. A drug interaction with the patient's existing meds goes unchecked. A danger sign (child fast-breathing, maternal warning sign, cardiac/stroke symptom) isn't escalated.
- **Nothing is recorded properly.** There is **no national EHR**. The record is a handwritten paper slip the patient loses. Next visit, the history starts from zero. Continuity of care doesn't exist for most of the population.
- **The patient doesn't understand.** Low health-literacy, Bangla-only patients receive English drug names and rushed instructions they can't read back. ~50% of pharmacies are unlicensed first-contact care, so the prescription *is* the care plan — and it's not understood.

**Why now:** Ambient clinical AI scribes (Abridge, Nuance DAX Copilot, Nabla, Suki) became a proven, deployed category in the US in 2023–2025. The enabling tech — strong multilingual ASR, cheap LLMs, fast retrieval — is now commodity. **No one has localized it to Bangla, to the 90-second BD consultation, or as a patient-owned record.** That gap is the opportunity.

> **Framing for judges (Innovation 25):** "We did not invent ambient clinical AI. We took a billion-dollar proven pattern and re-engineered it for the one setting it was never built for — a Bangla, voice-only, 90-second, no-EHR, low-literacy consultation — and added a deterministic safety-net and a patient-held record that the US products don't have."

---

## 2. What it does (the experience, end to end)

A no-login web app with two synchronized views joined by a QR code.

**Before the room:** Each doctor's door has a printed QR. The patient scans it on their phone → a **Patient view** opens and joins the doctor's live session. The patient's longitudinal record (built by Codoctor on prior visits; seeded with mock history for new patients) loads on the **Doctor view** as a 5-second structured summary: chronic conditions, current meds, allergies, last visit's plan.

**During the consultation:** Both phones (doctor + patient) capture audio. Two transcripts are **fused** into one high-confidence, speaker-labelled transcript — if one mic misses a word in the noisy hall, the other fills it. As the conversation unfolds, the agent team works in the background and surfaces **quiet, cited prompts** to the doctor:

- *"Guideline DGHS-STG §4.2 recommends asking about chest-pain radiation for these symptoms — not yet asked."* (dismissible)
- *"⚠️ Hard stop: prescribed Ciprofloxacin + patient is on Tizanidine — contraindicated interaction (BNF)."* (deterministic, not a suggestion)
- *"Differential to consider (cited): 1) Typhoid 2) Dengue 3) UTI — based on fever pattern + symptoms."*
- *"🔴 Danger sign present: child respiratory rate >50/min → WHO IMCI fast-breathing rule → refer/escalate."* (deterministic decision tree)

**After the consultation:** 
- **Doctor** gets an auto-drafted, editable **SOAP note + prescription**, saved to the patient's record. One tap to confirm.
- **Patient** gets a plain-Bangla **"what happened / what to do" card**, read aloud via TTS: your likely problem (in lay terms), your medicines (Bangla + when/how), when to return, and the **danger signs that mean go to hospital now** — kept permanently on their phone and re-loaded by QR next visit.

Everything is consent-gated and processed in-session.

---

## 3. Refinements to the base idea (what changed and why)

| Your base idea | Refined into | Why |
|---|---|---|
| "One agent predicts what the issue is" | **Differential-Diagnosis Agent** that outputs a *ranked, cited* list of possibilities — never a final diagnosis | Safety + credibility. A "differential checklist" assists the doctor; an "AI diagnosis" invites liability and judge skepticism (idea-book pitfall #3). |
| "One agent checks if the doctor is missing something" | **Completeness Agent** that surfaces *guideline-recommended* questions/exams for the emerging picture — as a co-pilot checklist, **not a grade** | Doctors reject tools that audit them. Reframed as "checklist," it's an ally, not a judge. |
| "One agent finds hidden issues" | **Red-Flag / Danger-Sign Agent** running a **deterministic** decision tree (WHO IMCI, maternal, sepsis, MI/stroke) | High-stakes → must be provable, not LLM "guessing." This is your strongest Technical + Impact asset. |
| "Both phones record so nothing is missed" | **Dual-device transcript fusion** (two ASR streams reconciled into one) | Turns a vague "redundancy" into a concrete, novel technical feature that genuinely raises transcription accuracy in noise. |
| "Patient's full medical history is shown" | A longitudinal record **the system itself builds** visit-by-visit; QR loads it | BD has no national EHR — don't assume one. Bootstrapping the record *is* part of the impact story. |
| (implicit) "AI in the loop" | **Deterministic tools decide the dangerous things; LLM only narrates in Bangla** | The single most important rule for both real safety and the rubric. |
| Mobile app | Web app simulating two devices (phone Patient view + laptop Doctor view) joined by QR session | Rulebook §5.4 requires a live in-browser URL, no login. A responsive web app *is* mobile-friendly and satisfies this directly. |

**Net effect:** the same vision you described — nothing missed, everything recorded on both sides — but reframed so it is *safe, deployable, demo-able in a browser, and unambiguously a winner against this rubric.*

---

## 4. Target users & personas

- **Dr. Rahman — government hospital OPD doctor.** Sees 120 patients/day. Wants: don't slow me down, don't lecture me, just quietly catch the dangerous thing and write the note for me.
- **Shahana — 34, rural patient, reads little.** Wants: to understand what's wrong, what to take, and when to worry — in Bangla, out loud, kept on her phone.
- **(Future) The health system.** Wants: a longitudinal, structured record where none existed; anonymized population signals.

---

## 5. System architecture

```
   Doctor phone/laptop ──┐                          ┌── Patient phone (joined by QR)
        (mic + view)     │                          │      (mic + view)
                         ▼                          ▼
                 ┌──────────────────────────────────────────┐
                 │   HEAVY-ML FRONT DOOR  ("AI is central")  │
                 │   • Bangla/Banglish medical ASR ×2        │
                 │   • Transcript FUSION (reconcile 2 mics)  │
                 │   • Speaker diarization (doctor/patient)  │
                 │   • Medical entity extraction (NER)       │
                 └──────────────────────┬───────────────────┘
                       structured Consultation Context (§10)
                                        ▼
                 ┌──────────────────────────────────────────┐
                 │        ORCHESTRATOR AGENT (LangGraph)     │
                 │   plans, routes context, invokes agents   │
                 ├───────────────┬───────────────┬──────────┤
                 │ Differential  │ Completeness  │ Patient-  │
                 │ Agent (RAG)   │ Agent (RAG)   │ Summary   │
                 ├───────────────┴───────────────┤ Agent     │
                 │  DETERMINISTIC SAFETY TOOLS:   │ (Bangla   │
                 │  • Danger-sign decision tree   │  + TTS)   │
                 │  • Drug-interaction checker    │           │
                 │  • Dose / renal / allergy check│           │
                 ├────────────────────────────────┴──────────┤
                 │  RETRIEVERS (hybrid BM25 + BGE-M3) over:   │
                 │  WHO · DGHS-STG · BD National Guidelines · │
                 │  National Formulary / Essential Drug List  │
                 ├────────────────────────────────────────────┤
                 │  CRITIC / GROUNDING AGENT                  │
                 │  every surfaced claim must cite a chunk    │
                 │  or it is suppressed (anti-hallucination)  │
                 └──────────────────────┬─────────────────────┘
                                        ▼
   Doctor: cited prompts + editable SOAP note + Rx   │   Patient: spoken Bangla summary + danger signs
                                        ▼
                     LONGITUDINAL RECORD (re-loaded by QR next visit)
```

This is the idea-book "universal winning architecture" (heavy-ML front door → orchestrator + specialists → deterministic tools → grounded/cited output), instantiated for a live consultation.

---

## 6. The multi-agent design

| Agent | Role | Inputs | Tools | Output |
|---|---|---|---|---|
| **Orchestrator** | Runs the session; decides which specialists to fire as the transcript grows; manages state | Consultation Context (§10) | LangGraph state machine | routing + merged result set |
| **Scribe / Structuring** | Turns fused transcript → structured note + extracted entities (symptoms, onset, duration, severity, meds, vitals) | fused transcript | ASR post-proc, medical NER | structured encounter object |
| **Differential** | Ranked, **cited** list of conditions to *consider* (not diagnose) | structured symptoms + history | hybrid RAG over guidelines | `[{condition, rationale, citation}]` |
| **Completeness** | Surfaces guideline-recommended questions/exams not yet covered | transcript + suspected conditions | RAG over guideline "history/exam" sections | checklist of un-asked items + citation |
| **Red-Flag / Danger-Sign** | Detects critical signs → escalate | structured vitals + symptoms | **deterministic decision tree** (WHO IMCI, maternal, sepsis, MI/stroke FAST) | escalation + the exact rule fired |
| **Medication-Safety** | Interaction / duplication / allergy / renal-dose / AMR check on proposed Rx | proposed meds + patient meds + allergies | **deterministic interaction table** + RAG over formulary | hard warnings + cited monograph |
| **Patient-Summary** | Plain-Bangla, spoken "what you have / do / watch for" | confirmed note | LLM (narration only) + numeral normalizer + TTS | Bangla card + audio |
| **Critic / Grounding** | Verifies every *suggested* claim cites a retrieved chunk; suppresses ungrounded text | all agent outputs | faithfulness check | filtered, cited final set |

**Key principle (write this in the report):** the *suggestive* agents (Differential, Completeness) may be wrong and are always dismissible; the *decisive* tools (Danger-Sign, Med-Safety) are **deterministic and provable**. The LLM never makes a high-stakes call — it only narrates in Bangla.

**Make the autonomy visible (judges' #1 note):** a live **"Agent Reasoning Trace"** panel showing, e.g., *transcript token arrives → Scribe extracts "child, fast breathing, 2 days" → Red-Flag tool fires WHO IMCI rule → Completeness notes "danger-sign questions not all asked" → Critic confirms citation → escalation card.* One screen proves it's genuinely multi-step, not a single hidden prompt.

---

## 7. 🔶 Data contract — *exactly what you send each agent* (answers "agent er kache kon data pathabo")

**You never send raw audio to the reasoning agents.** The heavy-ML front door converts audio → a single structured **Consultation Context** object, and *that* (plus retrieved chunks) is what every agent receives. This keeps agents fast, debuggable, and cheap.

```jsonc
// Consultation Context — the one object passed around the graph
{
  "session_id": "uuid",
  "patient": {                      // loaded via QR from the longitudinal record
    "age": 4, "sex": "M",
    "allergies": ["penicillin"],
    "chronic_conditions": ["—"],
    "current_meds": [{ "name": "Salbutamol", "dose": "..." }],
    "past_visits": [{ "date": "...", "assessment": "...", "plan": "..." }]
  },
  "encounter": {
    "transcript_fused": [           // dual-mic reconciled + diarized
      { "t": 12.4, "speaker": "patient", "text": "বাচ্চার তিন দিন ধরে জ্বর আর শ্বাস দ্রুত", "conf": 0.86 }
    ],
    "extracted": {                  // Scribe agent output (entities)
      "symptoms": [{ "name": "fever", "onset_days": 3, "severity": "high" },
                   { "name": "fast_breathing", "onset_days": 2 }],
      "vitals": { "resp_rate": 52, "temp_c": 39.1 },
      "doctor_questions_asked": ["fever_duration", "appetite"],
      "proposed_meds": [{ "name": "Azithromycin", "dose": "..." }]   // when doctor dictates Rx
    }
  },
  "retrieval": [                    // RAG results, attached per agent invocation
    { "chunk_id": "...", "source": "WHO-IMCI", "section": "Fast breathing",
      "text": "...", "score": 0.71 }
  ]
}
```

**Per-agent slice** (send only what each needs — smaller context = cheaper, sharper):
- **Differential** ← `patient` (age/sex/chronics) + `extracted.symptoms` + `retrieval` (guideline chunks).
- **Completeness** ← `extracted.doctor_questions_asked` + suspected conditions + `retrieval` (guideline history/exam sections).
- **Danger-Sign** ← `extracted.vitals` + `extracted.symptoms` + `patient.age`. *(No LLM, no retrieval — pure rules.)*
- **Med-Safety** ← `extracted.proposed_meds` + `patient.current_meds` + `patient.allergies` + `retrieval` (formulary monographs).
- **Patient-Summary** ← the confirmed note only.

---

## 8. 🔶 RAG design (answers "oikhane RAG use korbo")

RAG is the **trust layer** — every suggestion the doctor sees cites a clause. This is what separates you from "a medical chatbot."

- **Corpus (official, authoritative only):**
  - **WHO** IMCI (child danger signs), antenatal-care danger signs, pocket-book of hospital care.
  - **DGHS Standard Treatment Guidelines (Bangladesh)** + BD national guidelines for common conditions (hypertension, diabetes, typhoid, dengue, ARI).
  - **National Drug Formulary of Bangladesh / Essential Drug List** + a structured drug-interaction table.
  - *(Eval anchor: **BanglaMedQA / BanglaMMedBench** to report a number.)*
- **Chunking:** *atomic clinical units* — one danger-sign rule, one drug monograph, one guideline step = one chunk (never fixed token windows). Store rich metadata (condition, source, section, age-group).
- **Retrieval:** **hybrid BM25 + BGE-M3 dense** (BGE-M3 handles Bangla + Banglish + English medical jargon in one index), reranked. The suspected-condition label **biases retrieval** toward that branch (taxonomy routing).
- **Deterministic where it must be:** drug interactions and danger-sign thresholds use **exact-match lookups against tables**, never embedding similarity, never an LLM guess.
- **Grounding & refusal:** the Critic verifies each *suggested* claim maps to a retrieved chunk; if nothing grounds it, the agent **says so** ("no guideline match — clinician judgment") rather than inventing. Every card shows its citation inline.

---

## 9. Heavy-ML components (this is your §5.1 "AI is central" proof)

- **Bangla/Banglish medical ASR ×2** + **transcript fusion** (align two streams by time, pick higher-confidence tokens, fill gaps). *Front-door + genuinely novel.*
- **Speaker diarization** (doctor vs patient).
- **Medical entity extraction** (symptoms/onset/severity/meds/vitals) — BanglaBERT-based NER or LLM-extract with a schema.
- **Embeddings:** BGE-M3 for hybrid retrieval.
- **TTS:** `facebook/mms-tts-ben` (+ a Bangla numeral/dose normalizer so "৫০০ মিগ্রা / দিনে ২ বার" is spoken correctly).
- *(Deterministic, not ML, but core:)* danger-sign decision tree + drug-interaction engine.

> ASR reality check (idea-book): Bangla read-speech WER ~4.6%, but **spontaneous/dialectal (esp. Sylheti) jumps to 22%+**. Medical code-switching ("CBC", drug names) is harder still. → This is *why* dual-device fusion + the doctor's one-tap transcript edit + read-back exist. Turn the weakness into the demoed feature.

---

## 10. Tech stack & deployment

- **Frontend:** Next.js (React) on **Vercel** — polished, responsive, satisfies §5.4 (public URL, no login, in-browser). Two routes: `/doctor` and `/patient/:session`, joined by a QR.
- **Backend:** Python **FastAPI** on **Render** (full-stack tier) for agent orchestration + ML. WebSocket for live transcript/agent stream.
- **Agents:** **LangGraph**. **LLM (narration only):** GPT-4o / Gemini / Claude. **Vector DB:** Chroma/FAISS (precomputed, survives sleep).
- **ASR:** ✅ **Cloud Bengali ASR** (Google Speech-to-Text `bn-BD` or Whisper API; §5.3 permits APIs) for live capture, **always paired with a deterministic "replay sample consultation" fallback** so a misrecognition on stage can never break the demo.
- ✅ **Locked (Jun 5):** split frontend (Next.js/Vercel) + backend (FastAPI/Render); **pediatric ARI / WHO IMCI** as the golden-path clinical scenario.

> Free tiers sleep → precompute the index, keep models small, **pre-warm the morning of July 9** (rulebook §9.3), keep the demo video as backup.

---

## 11. Safety, privacy & scope-of-use (non-negotiable for a medical tool — put it in the model card)

- **Advisory, non-diagnostic, clinician-in-the-loop.** Codoctor never prescribes or diagnoses autonomously; it surfaces cited prompts and hard safety checks a licensed doctor accepts/dismisses.
- **Deterministic tools own all high-stakes outputs** (interactions, danger signs). LLM only narrates.
- **Consent-first.** Recording starts only after explicit on-screen consent from both parties.
- **Privacy.** Process in-session; the patient **owns** their record; encrypt at rest; show a visible "processed in session" indicator. No third-party sharing.
- **Honest refusal** is a demoed feature, not a hidden fallback.
- **Disclaimers** in UI + model card; ideally one real doctor co-signs the approach.

---

## 12. Demo plan — the golden path (Demo = 20%, judged live)

**One flawless flow.** A pediatric fever case (clean, high-stakes, visually obvious):

1. Judge (as patient) scans the QR on the laptop → Patient view opens on a phone → mock history loads on the Doctor view.
2. A short scripted Bangla exchange is spoken into the mic ("বাচ্চার তিন দিন জ্বর, শ্বাস দ্রুত…"). Two mics → fused transcript appears live.
3. The **Reasoning Trace** lights up: Scribe extracts → **Red-Flag tool fires WHO IMCI fast-breathing rule (RR 52 > 50)** → red escalation card with the cited rule.
4. Doctor "prescribes" an antibiotic → **Med-Safety** flags the penicillin allergy from history (deterministic) with the cited monograph.
5. One tap → SOAP note + Rx saved; Patient view shows a **plain-Bangla spoken summary** + danger signs.

**Fallback (critical):** a **"Play sample consultation" demo mode** that replays canned audio/transcript deterministically, so a noisy hall or ASR miss can never break the demo (idea-book pitfall #2). First 30s of the video = the IMCI catch (judges watch video first).

---

## 13. Evaluation & metrics (Technical 25 — "report a number on YOUR system")

Pick a small, honest gold set (30–50 scripted consultations + BanglaMedQA slice) and report:

- **Danger-sign recall:** *"0 missed danger signs on N held-out cases"* (the headline number).
- **Med-safety catch-rate** on an adversarial set of unsafe Rx (target: 100% on the known interaction table).
- **Grounding / citation accuracy:** % of surfaced suggestions with a correct supporting chunk; **refusal accuracy** on out-of-guideline questions.
- **Transcript-fusion gain:** WER of fused transcript vs single mic (show the dual-device idea *measurably* helps).
- **(Impact)** task-completion / "things caught" with **3–5 real medical students or one doctor** trying it + a quote.

---

## 14. Rubric mapping (how each piece scores 100/100)

| Criterion | Wt | How we win it |
|---|---:|---|
| Innovation & Originality | 25 | First Bangla ambient clinical scribe; **transcript fusion**; deterministic safety-net; patient-held record. Honest "we localized a proven pattern." |
| Technical Implementation | 25 | Multi-agent (LangGraph) + hybrid RAG + **deterministic** danger-sign/drug tools + heavy ML front door; visible reasoning trace; real measured numbers. |
| Real-world Impact | 20 | 90-second-consultation crisis, no-EHR, low-literacy — quantified; bootstraps a record where none exists; validated with real users. |
| Demo Quality | 20 | One flawless golden path + deterministic fallback; cited, in-browser, voice-in/voice-out. |
| Presentation | 10 | Architecture diagram (§5), problem-in-human-terms first, honest derivation + limitations. |

---

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Bangla medical ASR errors | Dual-mic fusion + one-tap transcript edit + read-back; demo-mode fallback |
| "AI playing doctor" skepticism | Deterministic tools decide; LLM narrates; advisory framing; citations everywhere |
| Doctors reject being "graded" | Completeness reframed as a co-pilot checklist, not an audit |
| No real EHR | System builds the record itself; seed mock history; honest "future: integrate with DGHS" |
| Scope creep in 3.5 weeks | Ruthlessly scope to the §12 golden path; everything else is "architected, not built" |
| Free-tier sleep at judging | Precompute index, pre-warm July 9, video backup |
| Privacy/liability | Consent-first, in-session, model-card disclosure, doctor co-sign |

---

## 16. Scope: in vs out (for July 1)

**In (must build the golden path):** QR session join · dual-device capture + fusion · live fused transcript · Scribe + Differential + **Danger-Sign** + **Med-Safety** + Patient-Summary agents · Critic/grounding · RAG over a *small, curated* guideline+formulary corpus · reasoning-trace panel · Bangla TTS summary · SOAP/Rx draft · demo-mode fallback · eval numbers.

**Out / "architected, not built" (say so honestly):** full national-EHR integration · the complete agent roster (Completeness can be a stretch goal) · broad multi-specialty coverage · production auth/security · the full longitudinal record across many visits (show 2 visits).

---

## 17. Compressed timeline (today = Jun 5 → submit Jul 1)

> ⚠️ **Register by June 23.** This is ~3.5 weeks, not the idea-book's 7 — scope is everything.

- **Wk 1 (Jun 5–12):** Curate corpus (one age-group / a handful of conditions). Stand up RAG + Differential + Danger-Sign + Med-Safety on **canned transcripts**. Skeleton web app: `/doctor` + `/patient` + QR session join + mock history.
- **Wk 2 (Jun 13–20):** Live ASR + dual-device fusion + live transcript stream. Reasoning-trace UI. Patient-Summary + Bangla TTS. SOAP/Rx draft. Critic/grounding.
- **Wk 3 (Jun 21–28):** Polish the golden path. Build **demo mode** (deterministic replay). Run eval, get the numbers. Deploy (Vercel + Render). Model & data card. 3–5 user tests.
- **Final (Jun 29–Jul 1):** Record 3–5 min demo video (IMCI catch in first 30s). Write 8-page report. Public README. Pre-warm + buffer.

---

## 18. Deliverables checklist (rulebook §7)

- [ ] Live public URL (no login) — Vercel/Render, live until ≥ Jul 12
- [ ] Project Report (PDF ≤ 8pg): Problem → Solution → Methodology → AI/ML → Results → Limitations
- [ ] Public GitHub repo + README, commits May 14–Jul 1
- [ ] Demo video (3–5 min, unlisted) — wow-moment first
- [ ] Model & Data Card (1pg): datasets, models (name/provider/license), limitations & ethics
- [ ] Registered by Jun 23 (BDT 1,000)

---

## 19. Open questions / decisions for the team (🔶)

1. **Track:** A (Health & Society) — defaulting to A; confirm (D is a fallback for an "open innovation" framing).
2. ✅ **Name:** Codoctor (chosen Jun 5).
3. ✅ **Stack:** Next.js + FastAPI (locked Jun 5).
4. ✅ **ASR:** Cloud Bengali ASR + deterministic replay fallback (locked Jun 5).
5. ✅ **Clinical scope:** Pediatric fever / ARI (WHO IMCI) (locked Jun 5).
6. **Do we get one real doctor** to co-sign + give a testimonial? (Big Impact/credibility lift — worth pursuing now, in parallel with the build.)

---

## 20. Name — ✅ Codoctor (কো-ডক্টর)

**Chosen: Codoctor** — "co-doctor," the co-pilot framing; instantly readable in English + Bangla, clean as a wordmark/URL. Alternatives considered (kept for the record):

| Name | Meaning | Vibe |
|---|---|---|
| **Sojag** (সজাগ) | "vigilant / alert" | the never-miss safety-net |
| **Nirnoy-Sohayok** (নির্ণয়-সহায়ক) | "diagnosis assistant" | clinical, precise |
| **Shuni-Shastho** (শুনি-স্বাস্থ্য) | "listen-health" | evokes the ambient listening |
| **Shoron** (স্মরণ) | "memory/record" | the patient-held record angle |
| **Shastho-Smriti** (স্বাস্থ্য-স্মৃতি) | "health memory" | the EHR-bootstrap angle |

---

*Codoctor — a second pair of ears that makes sure nothing is missed, and turns every 90-second consultation into a complete, cited, patient-held record. Built for the SciBlitz AI Challenge 2026, Track A.*
