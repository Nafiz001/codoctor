"""Retrieval-augmented generation over an authoritative, cited clinical corpus.

A small, curated, atomic-chunk corpus (WHO IMCI / DGHS STG / National Formulary)
with a dependency-free hybrid retriever (BM25 + TF-IDF cosine, fused with RRF).
The production design swaps the dense side for BGE-M3; the corpus + retriever
interface stays identical.
"""
