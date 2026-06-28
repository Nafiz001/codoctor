"""Hybrid retriever: BM25 (lexical) + TF-IDF cosine + optional dense embeddings,
fused with Reciprocal Rank Fusion.

The BM25 + TF-IDF core is pure Python — it deploys on any free tier, starts
instantly, and runs with no key. When `OPENAI_API_KEY` is configured a third,
*semantic* ranker is added: the corpus is embedded once (cached) and each query
is embedded per request, so a Bangla query can find an English guideline that
means the same thing even with zero shared tokens. With no key the dense ranker
is simply absent and behaviour is identical to the original.
"""

import math
import re
from collections import defaultdict

from .corpus import CORPUS
from .embeddings import cosine as dense_cosine, embed_available, embed_texts
from .synonyms import expand_query

_TOKEN = re.compile(r"[a-z0-9]+|[ঀ-৿]+")


def tokenize(text: str) -> list:
    return _TOKEN.findall(text.lower())


class HybridRetriever:
    def __init__(self, corpus: list | None = None, k1: float = 1.5, b: float = 0.75):
        self.docs = corpus if corpus is not None else CORPUS
        self.k1, self.b = k1, b
        self.N = len(self.docs)

        # Index document text + tags.
        self.doc_tokens = [
            tokenize(d["text"] + " " + " ".join(d.get("tags", []))) for d in self.docs
        ]
        self.doc_len = [len(t) for t in self.doc_tokens]
        self.avgdl = (sum(self.doc_len) / self.N) if self.N else 0.0

        self.tf: list = []
        df: dict = defaultdict(int)
        for toks in self.doc_tokens:
            counts: dict = defaultdict(int)
            for t in toks:
                counts[t] += 1
            self.tf.append(counts)
            for term in counts:
                df[term] += 1

        self.idf = {
            t: math.log(1 + (self.N - n + 0.5) / (n + 0.5)) for t, n in df.items()
        }

        # Pre-compute TF-IDF document vectors for cosine.
        self.doc_vec: list = []
        self.doc_norm: list = []
        for counts in self.tf:
            vec = {t: (1 + math.log(c)) * self.idf.get(t, 0.0) for t, c in counts.items()}
            norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
            self.doc_vec.append(vec)
            self.doc_norm.append(norm)

        # Dense embeddings are computed lazily on first search if a key exists.
        # `_dense_state`: None = not tried, list = ready, False = disabled.
        self._dense_docs = None

    def _dense_doc_vectors(self):
        """Embed the corpus once and cache. Returns the list of vectors, or
        False if embeddings are unavailable / failed (disabled for this process)."""
        if self._dense_docs is not None:
            return self._dense_docs
        if not embed_available():
            self._dense_docs = False
            return False
        vecs = embed_texts(
            [d["text"] + " " + " ".join(d.get("tags", [])) for d in self.docs]
        )
        # Disable permanently on failure so we don't retry the API every request.
        self._dense_docs = vecs if vecs and len(vecs) == self.N else False
        return self._dense_docs

    def _dense_scores(self, query: str) -> list:
        """Per-doc semantic similarity, or an all-zero list if dense is off."""
        doc_vecs = self._dense_doc_vectors()
        if not doc_vecs:
            return [0.0] * self.N
        q = embed_texts([query])
        if not q:
            return [0.0] * self.N
        qv = q[0]
        return [dense_cosine(qv, dv) for dv in doc_vecs]

    def _bm25(self, q_tokens: list) -> list:
        scores = [0.0] * self.N
        for i in range(self.N):
            counts, dl = self.tf[i], self.doc_len[i]
            s = 0.0
            for t in q_tokens:
                f = counts.get(t)
                if f:
                    idf = self.idf.get(t, 0.0)
                    s += idf * (f * (self.k1 + 1)) / (
                        f + self.k1 * (1 - self.b + self.b * dl / (self.avgdl or 1))
                    )
            scores[i] = s
        return scores

    def _cosine(self, q_tokens: list) -> list:
        qcounts: dict = defaultdict(int)
        for t in q_tokens:
            qcounts[t] += 1
        qvec = {t: (1 + math.log(c)) * self.idf.get(t, 0.0) for t, c in qcounts.items()}
        qnorm = math.sqrt(sum(v * v for v in qvec.values())) or 1.0

        scores = [0.0] * self.N
        for i in range(self.N):
            vec = self.doc_vec[i]
            small, big = (qvec, vec) if len(qvec) < len(vec) else (vec, qvec)
            dot = sum(w * big.get(t, 0.0) for t, w in small.items())
            scores[i] = dot / (qnorm * self.doc_norm[i])
        return scores

    def search(self, query: str, k: int = 4, expand: bool = False) -> list:
        toks = tokenize(query)
        if expand:
            toks = expand_query(toks)

        bm25 = self._bm25(toks)
        cosine = self._cosine(toks)
        dense = self._dense_scores(query)  # semantic; all-zero if no key
        dense_on = any(dense)

        bm25_rank = sorted(range(self.N), key=lambda i: bm25[i], reverse=True)
        cos_rank = sorted(range(self.N), key=lambda i: cosine[i], reverse=True)

        # Reciprocal Rank Fusion across the available rankers.
        C = 60
        rrf: dict = defaultdict(float)
        for r, i in enumerate(bm25_rank):
            rrf[i] += 1.0 / (C + r + 1)
        for r, i in enumerate(cos_rank):
            rrf[i] += 1.0 / (C + r + 1)
        if dense_on:
            dense_rank = sorted(range(self.N), key=lambda i: dense[i], reverse=True)
            for r, i in enumerate(dense_rank):
                rrf[i] += 1.0 / (C + r + 1)

        ranked = sorted(range(self.N), key=lambda i: rrf[i], reverse=True)
        results = []
        for i in ranked[:k]:
            d = self.docs[i]
            results.append({
                "id": d["id"],
                "source": d["source"],
                "section": d.get("section", ""),
                "ref": d["ref"],
                "text": d["text"],
                "lang": d.get("lang", "en"),
                "score": round(rrf[i], 4),
                "bm25": round(bm25[i], 3),
                "cosine": round(cosine[i], 3),
                "dense": round(dense[i], 3),
            })
        return results
