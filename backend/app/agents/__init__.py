"""Agentic orchestration — a LangGraph self-reflective RAG loop that plans,
retrieves, runs the deterministic safety tools, critiques its own grounding, and
only then synthesizes a cited answer. The LLM (optional) narrates; it never makes
the high-stakes call.
"""
