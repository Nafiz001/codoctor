"""Optional dense embeddings via OpenAI — key-optional semantic search.

The hybrid retriever's lexical sides (BM25 + TF-IDF) match on shared *tokens*,
which fails across languages: a Bangla query and an English guideline that mean
the same thing share no surface tokens. A dense embedding ranker closes that gap
— it scores by *meaning*.

This stays true to the project's key-optional stance: with no `OPENAI_API_KEY`
(or no `openai` package, or any API error) `embed_available()` is False and the
retriever runs exactly as before on BM25 + TF-IDF. The corpus is tiny (≈16 docs)
so its vectors are embedded once and cached in memory; only the short query is
embedded per request.
"""

import math
import os
from typing import List, Optional


def embed_model() -> str:
    return os.getenv("CODOCTOR_EMBED_MODEL", "text-embedding-3-small")


def embed_available() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))


def _client():
    if not embed_available():
        return None
    try:
        from openai import OpenAI

        return OpenAI(timeout=20.0, max_retries=1)
    except Exception:
        return None


def embed_texts(texts: List[str]) -> Optional[List[List[float]]]:
    """Embed a batch of texts, or None on any failure (caller falls back)."""
    if not texts:
        return []
    client = _client()
    if client is None:
        return None
    try:
        resp = client.embeddings.create(model=embed_model(), input=texts)
        return [d.embedding for d in resp.data]
    except Exception:
        return None


def cosine(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)
