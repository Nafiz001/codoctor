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

## Tests

```bash
python tests/test_safety.py     # zero-dependency runner
# or
pytest
```

## Roadmap

The safety core is the load-bearing first piece. Next:

- **Hybrid RAG** (BM25 + BGE-M3) over WHO IMCI / DGHS STG / National Formulary for cited explanations
- **LangGraph orchestrator** + the specialist agents (Scribe, Differential, Completeness, Critic, Patient-Summary)
- **Cloud Bengali ASR** ingestion + dual-device transcript fusion
- Wire the live frontend to these endpoints (it currently runs on a scripted demo)
