"""Optional LLM narration hook.

Codoctor runs fully without any API key — the orchestrator's deterministic
template narrator is the default. If `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is
set (and the SDK installed), the LLM is used only to *rephrase* already-grounded
findings in nicer Bangla. It is never allowed to introduce a new clinical claim.
"""

import os
from typing import Optional


def llm_available() -> bool:
    return bool(os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))


def narrate(system: str, user: str) -> Optional[str]:
    """Return polished text, or None if no provider is configured/usable."""
    if os.getenv("OPENAI_API_KEY"):
        try:
            from openai import OpenAI

            client = OpenAI()
            resp = client.chat.completions.create(
                model=os.getenv("CODOCTOR_LLM_MODEL", "gpt-4o-mini"),
                temperature=0.2,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            )
            return (resp.choices[0].message.content or "").strip() or None
        except Exception:
            return None

    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            import anthropic

            client = anthropic.Anthropic()
            resp = client.messages.create(
                model=os.getenv("CODOCTOR_LLM_MODEL", "claude-3-5-haiku-latest"),
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
