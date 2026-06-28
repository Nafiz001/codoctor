"""Codoctor backend — deterministic clinical safety tools + (later) agentic RAG."""

__version__ = "0.1.0"

# Load backend/.env (if present) into the environment before anything reads a key.
# Key-optional by design: if there is no .env and no python-dotenv, the app runs
# exactly as before on its deterministic fallbacks.
try:  # pragma: no cover - environment plumbing
    import os as _os

    from dotenv import load_dotenv as _load_dotenv

    _ENV_PATH = _os.path.join(_os.path.dirname(_os.path.dirname(__file__)), ".env")
    _load_dotenv(_ENV_PATH)
except Exception:
    pass
