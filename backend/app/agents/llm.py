"""Optional LLM hooks — OpenAI-first, key-optional.

Codoctor runs fully without any API key: the deterministic Scribe (regex), the
TF-IDF retriever, and the template narrator are the defaults. If `OPENAI_API_KEY`
is set (preferred) — or `ANTHROPIC_API_KEY` — the LLM is used in two narrow,
*non-deciding* roles:

  * `narrate()`      — rephrase already-grounded findings in plain Bangla. It may
                       never introduce a new clinical claim; the critic step and a
                       drug-name guard downstream enforce that.
  * `extract_json()` — turn a messy bilingual transcript into the structured
                       encounter the deterministic engines consume. The regex
                       Scribe still runs and its catches are a floor that the LLM
                       can only *add* to, never remove.

The high-stakes decisions (IMCI danger signs, medication safety) are always made
by the rule engines, never here.
"""

import json
import os
from typing import Optional


def _openai_key() -> Optional[str]:
    return os.getenv("OPENAI_API_KEY")


def _anthropic_key() -> Optional[str]:
    return os.getenv("ANTHROPIC_API_KEY")


def llm_available() -> bool:
    return bool(_openai_key() or _anthropic_key())


def chat_model() -> str:
    # OpenAI default; override with CODOCTOR_LLM_MODEL.
    return os.getenv("CODOCTOR_LLM_MODEL", "gpt-4o-mini")


def _openai_client():
    """Return a configured OpenAI client, or None if unusable."""
    if not _openai_key():
        return None
    try:
        from openai import OpenAI

        # A short timeout so a slow/unreachable API never blocks a consultation;
        # callers treat None as "fall back to deterministic".
        return OpenAI(timeout=20.0, max_retries=1)
    except Exception:
        return None


def narrate(system: str, user: str) -> Optional[str]:
    """Return polished Bangla text, or None if no provider is configured/usable."""
    client = _openai_client()
    if client is not None:
        try:
            resp = client.chat.completions.create(
                model=chat_model(),
                temperature=0.2,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            )
            return (resp.choices[0].message.content or "").strip() or None
        except Exception:
            return None

    if _anthropic_key():
        try:
            import anthropic

            client = anthropic.Anthropic()
            resp = client.messages.create(
                model=os.getenv("CODOCTOR_LLM_MODEL", "claude-haiku-4-5"),
                max_tokens=600,
                temperature=0.2,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            text = "".join(
                b.text for b in resp.content if getattr(b, "type", "") == "text"
            )
            return text.strip() or None
        except Exception:
            return None

    return None


def extract_json(system: str, user: str) -> Optional[dict]:
    """Ask the LLM for a single JSON object and return it parsed, or None.

    Uses OpenAI's JSON response mode so the output is always valid JSON. Any
    failure (no key, network error, malformed JSON) returns None so the caller
    falls back to the deterministic Scribe.
    """
    client = _openai_client()
    if client is not None:
        try:
            resp = client.chat.completions.create(
                model=chat_model(),
                temperature=0,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            )
            raw = (resp.choices[0].message.content or "").strip()
            return json.loads(raw) if raw else None
        except Exception:
            return None

    if _anthropic_key():
        try:
            import anthropic

            client = anthropic.Anthropic()
            resp = client.messages.create(
                model=os.getenv("CODOCTOR_LLM_MODEL", "claude-haiku-4-5"),
                max_tokens=700,
                temperature=0,
                system=system + "\n\nRespond with ONLY a single JSON object, no prose.",
                messages=[{"role": "user", "content": user}],
            )
            text = "".join(
                b.text for b in resp.content if getattr(b, "type", "") == "text"
            ).strip()
            # Defensive: pull the outermost {...} if the model wrapped it.
            start, end = text.find("{"), text.rfind("}")
            if start != -1 and end != -1 and end > start:
                return json.loads(text[start : end + 1])
        except Exception:
            return None

    return None
