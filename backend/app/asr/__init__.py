"""The heavy-ML front door (deterministic parts).

- `fusion`: reconciles two device transcripts into one high-confidence transcript
  (the dual-device "if one mic misses a word, the other catches it" feature).
- `scribe`: extracts structured clinical entities (symptoms, vitals, meds, danger
  signs) from a Bangla/English transcript so the agents get clean structure.

The cloud Bengali ASR that produces the raw per-device transcripts is pluggable;
these modules are the deterministic, testable logic around it.
"""
