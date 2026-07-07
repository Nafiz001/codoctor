# Codoctor — Demo Video Script & Storyboard (3–5 min)

**Goal:** judges watch the video first — so the **first 30 seconds must be the wow-moment**, then the problem, then the live product, then the proof.

**Before recording (critical):**
1. **Check the backend is up** — open https://codoctor-api-afdkbhe8d4bpffb5.centralindia-01.azurewebsites.net/health; it returns `{"status":"ok"}` immediately (Azure App Service Always On — no cold start).
2. Open https://codoctor.vercel.app in Chrome (for Bangla voice). Grant mic permission for `/live`.
3. Record at the live URL (not localhost). Add captions/subtitles for the Bangla. Keep under 5:00.

---

### 0:00 – 0:30 · HOOK (the catch)
- **Screen:** `/doctor` → click **Play consultation**. Let it run to the end.
- **Show:** the red **"Severe pneumonia — refer"** card and the amber **"Amoxicillin blocked — penicillin allergy"** card firing, each with a citation.
- **VO:** *"In a Bangladeshi government hospital, a doctor gets 90 seconds per patient. Here, a child's fast breathing together with chest indrawing means severe pneumonia — and the antibiotic about to be prescribed would trigger a known allergy. Codoctor caught both, in Bangla, with citations — before anyone moved on."*

### 0:30 – 1:10 · THE PROBLEM
- **Screen:** landing page (`/`) — the stat cards (90s consultation · ~6 doctors/10k · no EHR · Bangla-only).
- **VO:** *"~6 doctors per 10,000 people. No national health record — the prescription is a paper slip that gets lost. And low-literacy patients are handed English meds they can't read. Ambient AI scribes are a billion-dollar category abroad — but none work in Bangla, for the 90-second consultation, or as a record the patient keeps."*

### 1:10 – 2:20 · THE DOCTOR COCKPIT (live)
- **Screen:** `/doctor`, replay slowly. Point to, in order:
  - the **QR** (patient scans → record loads) and the **dual-device fused transcript** (Bangla, "recovered from device 2").
  - the **Agent reasoning trace** streaming: Scribe → Completeness → Differential → **Danger-Sign** → Critic → **Med-Safety**.
  - the two **cited** catches; the auto-drafted **SOAP note**.
  - the **"● Live backend"** card at the end.
- **VO:** *"Two phones capture the conversation and fuse into one transcript. A team of agents cross-checks official guidelines — every prompt cited. The dangerous calls run on deterministic rule engines, not a guessing model. And this isn't scripted: the final card is the real deployed backend answering live — grounded, cited, in two retrieval passes."*

### 2:20 – 3:10 · LIVE VOICE QUICK-CHECK
- **Screen:** `/live`. Click the **mic**, say in Bangla: *"তিন দিন ধরে জ্বর আর দ্রুত শ্বাস"* (fever 3 days and fast breathing). Keep RR 52, chest indrawing on, Amoxicillin, Penicillin allergy. Click **Analyze with live agents**.
- **Show:** the IMCI classification, the medication finding, the grounded Bangla+English summary, citations, and the expandable **agent reasoning trace**.
- **VO:** *"No keys, no cost — the browser transcribes Bangla speech, and the live orchestrator returns a grounded, cited assessment, showing its full reasoning trace."*

### 3:10 – 3:40 · THE PATIENT KEEPS THE RECORD
- **Screen:** `/patient`. Tap **"সারাংশ শুনুন / Listen"** — the Bangla summary reads aloud. Show the red danger-signs card.
- **VO:** *"The patient walks out with a spoken Bangla record — what they have, what to do, and the danger signs that mean go to hospital now — kept on their phone for the next visit."*

### 3:40 – 4:30 · UNDER THE HOOD (the proof)
- **Screen:** the architecture diagram (report §3) + the results table.
- **VO:** *"Deterministic tools decide; the LLM only narrates. On our evaluation set: 100% IMCI classification accuracy, zero missed danger signs, zero false referrals, 100% medication catch-rate with zero false positives, and 100% grounding with honest refusal when nothing is in the source. We didn't invent ambient clinical AI — we localized a proven pattern to the one setting it was never built for."*

### 4:30 – 4:50 · CLOSE
- **Screen:** the live URL + repo.
- **VO:** *"Codoctor — a second pair of ears, so nothing is missed. Advisory and non-diagnostic; the doctor always decides. Live at codoctor.vercel.app."*

---

**Editing checklist:** wow in first 30s ✓ · Bangla captioned ✓ · show the live backend (not just scripted) ✓ · show real numbers ✓ · state "advisory/non-diagnostic" ✓ · ≤ 5:00 · host unlisted on YouTube/Drive.
