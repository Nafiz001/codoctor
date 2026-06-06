"""Dual-device transcript fusion.

Two phones transcribe the same consultation from different positions. In a noisy
OPD, each mic drops or garbles different words. This module aligns the two
streams by time + speaker and reconciles them token-by-token (via difflib),
preferring the higher-confidence device and recovering any tokens it missed from
the other — so the fused transcript is more complete than either alone.

Deterministic, stdlib only.
"""

import difflib
from typing import List, Dict, Optional


def _merge_pair(primary: str, secondary: str) -> tuple:
    """Merge two token strings, trusting `primary`, filling its gaps from
    `secondary`. Returns (fused_text, recovered_tokens) where recovered_tokens
    are the tokens only the secondary device caught (empty if none)."""
    a = primary.split()
    b = secondary.split()
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    out: List[str] = []
    recovered_tokens: List[str] = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ("equal", "replace", "delete"):
            out.extend(a[i1:i2])  # keep primary's surface form
        elif tag == "insert":
            out.extend(b[j1:j2])  # tokens only the secondary caught
            recovered_tokens.extend(b[j1:j2])
    return " ".join(out), recovered_tokens


def _similar(a_text: str, b_text: str) -> float:
    """Token-level similarity (0–1) between two utterances."""
    return difflib.SequenceMatcher(
        a=a_text.split(), b=b_text.split(), autojunk=False
    ).ratio()


def fuse(
    device_a: List[Dict],
    device_b: List[Dict],
    window: float = 2.5,
    min_ratio: float = 0.4,
) -> List[Dict]:
    """Fuse two device transcripts.

    Each device transcript is a list of segments: {t, speaker, text, conf}.
    Two segments are merged only when they are plausibly the *same* utterance —
    close in time, same speaker, AND lexically similar (``min_ratio``). This is
    the real situation fusion is for: both mics caught the same words, each
    missing different ones. Utterances unique to one device (the normal case
    when the two phones hear different turns of the conversation) are kept as-is,
    never blended into unrelated text.

    Returns fused segments: {t, speaker, text, conf, recovered, sources}.
    """
    a = sorted(device_a, key=lambda s: s["t"])
    b = sorted(device_b, key=lambda s: s["t"])
    used_b: set = set()
    fused: List[Dict] = []

    for sa in a:
        best: Optional[int] = None
        best_score = -1.0
        for idx, sb in enumerate(b):
            if idx in used_b or sb["speaker"] != sa["speaker"]:
                continue
            d = abs(float(sb["t"]) - float(sa["t"]))
            if d > window:
                continue
            ratio = _similar(sa["text"], sb["text"])
            if ratio < min_ratio:
                continue
            # Prefer the most similar match; break ties by time proximity.
            score = ratio - (d / window) * 0.05
            if score > best_score:
                best, best_score = idx, score

        if best is not None:
            sb = b[best]
            used_b.add(best)
            conf_a = float(sa.get("conf", 1.0))
            conf_b = float(sb.get("conf", 1.0))
            primary, secondary = (sa, sb) if conf_a >= conf_b else (sb, sa)
            text, recovered_tokens = _merge_pair(primary["text"], secondary["text"])
            fused.append({
                "t": min(float(sa["t"]), float(sb["t"])),
                "speaker": sa["speaker"],
                "text": text,
                "conf": round(max(conf_a, conf_b), 2),
                "recovered": bool(recovered_tokens),
                "recovered_tokens": recovered_tokens,
                "sources": ["A", "B"],
            })
        else:
            fused.append({
                "t": float(sa["t"]),
                "speaker": sa["speaker"],
                "text": sa["text"],
                "conf": round(float(sa.get("conf", 1.0)), 2),
                "recovered": False,
                "recovered_tokens": [],
                "sources": ["A"],
            })

    for idx, sb in enumerate(b):
        if idx in used_b:
            continue
        fused.append({
            "t": float(sb["t"]),
            "speaker": sb["speaker"],
            "text": sb["text"],
            "conf": round(float(sb.get("conf", 1.0)), 2),
            "recovered": False,
            "recovered_tokens": [],
            "sources": ["B"],
        })

    fused.sort(key=lambda s: s["t"])
    return fused


def transcript_text(fused: List[Dict]) -> str:
    """Flatten a fused transcript into one string for the scribe."""
    return " ".join(s["text"] for s in fused)
