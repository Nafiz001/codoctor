# Codoctor — backend

The deterministic, provable core of Codoctor: the rule engines that make the
high-stakes calls (danger signs, drug safety) so the LLM never has to. This is
what backs the two "catches" in the [doctor demo](https://codoctor.vercel.app/doctor).

> **Advisory & non-diagnostic.** Decision support only — the clinician decides.

## Stack

- **FastAPI** + **Uvicorn** · **Pydantic v2**
- Pure-Python rule engines (no ML needed for the safety core)

## Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (use: source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness check |
| POST | `/assess/danger-signs` | WHO IMCI cough/difficult-breathing classification |
| POST | `/assess/medication` | Allergy / interaction / duplicate-therapy check |
| POST | `/rag/search` | Hybrid retrieval over the cited clinical corpus |
| POST | `/consult/analyze` | Full agentic RAG orchestrator (retrieve → tools → critic → synthesize) |
| POST | `/transcript/fuse` | Reconcile two device transcripts into one (dual-device fusion) |
| POST | `/consult/from-transcript` | End-to-end: fuse → Scribe extract → analyze |

### Example — the demo danger sign

```bash
curl -X POST http://localhost:8000/assess/danger-signs \
  -H "Content-Type: application/json" \
  -d '{"age_months":36,"respiratory_rate":52,"chest_indrawing":true}'
# -> "Severe pneumonia or very severe disease", refer: true, cited to WHO IMCI
```

### Example — the demo allergy block

```bash
curl -X POST http://localhost:8000/assess/medication \
  -H "Content-Type: application/json" \
  -d '{"proposed":["Amoxicillin"],"allergies":["Penicillin"]}'
# -> blocked: true, allergy contraindication cited to the National Formulary
```

### Example — the full agentic consultation

```bash
curl -X POST http://localhost:8000/consult/analyze \
  -H "Content-Type: application/json" \
  -d '{"patient":{"allergies":["Penicillin"],"current_meds":["Salbutamol"]},
       "encounter":{"age_months":36,"symptoms":["fever","cough"],
       "vitals":{"respiratory_rate":52},"chest_indrawing":true,
       "proposed_meds":["Amoxicillin"]}}'
# -> grounded: true, 2 retrieval passes (self-reflective loop), citations to
#    WHO IMCI + National Formulary, plus the full agent reasoning trace.
```

## Agentic RAG

`/consult/analyze` runs a **LangGraph** self-reflective loop:

```
intake → retrieve → run_tools → critic ─┬─(grounding gap)→ retrieve (expanded)
                                        └─(grounded)──────→ synthesize
```

- **retrieve** — dependency-free hybrid retriever (BM25 + TF-IDF cosine, fused with RRF) over a curated, cited corpus (`app/rag/corpus.py`). Production swaps the dense side for **BGE-M3**; the interface is unchanged.
- **run_tools** — the deterministic IMCI + medication engines.
- **critic** — verifies every surfaced claim is backed by a retrieved source; if not, re-retrieves with an expanded query.
- **synthesize** — composes the grounded, cited answer. Runs fully **without any API key** (deterministic Bangla template). Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to let an LLM *rephrase* the grounded findings (it never adds a new claim).

## Tests

```bash
python tests/test_safety.py     # safety engines (zero-dependency)
python tests/test_rag.py        # retriever + orchestrator (needs langgraph)
# or
pytest
```

## Roadmap

Built so far: the deterministic safety core, the agentic RAG orchestrator,
**dual-device transcript fusion** (`app/asr/fusion.py`), and a **deterministic
Scribe** extractor (`app/asr/scribe.py`) — all deployed on Render and wired to the
frontend. Next:

- **Cloud Bengali ASR** provider to produce the raw per-device transcripts (the fusion + Scribe around it are done and keyless)
- Remaining specialist agents (Differential, Completeness) as explicit graph nodes
- Swap the dense retriever for **BGE-M3**; expand the corpus beyond the ARI golden path
- Clinical validation / co-sign before any real-world use
