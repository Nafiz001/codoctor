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
    `secondary`. Returns (fused_text, recovered_from_secondary)."""
    a = primary.split()
    b = secondary.split()
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    out: List[str] = []
    recovered = False
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ("equal", "replace", "delete"):
            out.extend(a[i1:i2])  # keep primary's surface form
        elif tag == "insert":
            out.extend(b[j1:j2])  # tokens only the secondary caught
            if b[j1:j2]:
                recovered = True
    return " ".join(out), recovered


def fuse(
    device_a: List[Dict],
    device_b: List[Dict],
    window: float = 2.5,
) -> List[Dict]:
    """Fuse two device transcripts.

    Each device transcript is a list of segments: {t, speaker, text, conf}.
    Returns fused segments: {t, speaker, text, conf, recovered, sources}.
    """
    a = sorted(device_a, key=lambda s: s["t"])
    b = sorted(device_b, key=lambda s: s["t"])
    used_b: set = set()
    fused: List[Dict] = []

    for sa in a:
        best: Optional[int] = None
        best_d = window + 1.0
        for idx, sb in enumerate(b):
            if idx in used_b or sb["speaker"] != sa["speaker"]:
                continue
            d = abs(float(sb["t"]) - float(sa["t"]))
            if d <= window and d < best_d:
                best, best_d = idx, d

        if best is not None:
            sb = b[best]
            used_b.add(best)
            conf_a = float(sa.get("conf", 1.0))
            conf_b = float(sb.get("conf", 1.0))
            primary, secondary = (sa, sb) if conf_a >= conf_b else (sb, sa)
            text, recovered = _merge_pair(primary["text"], secondary["text"])
            fused.append({
                "t": min(float(sa["t"]), float(sb["t"])),
                "speaker": sa["speaker"],
                "text": text,
                "conf": round(max(conf_a, conf_b), 2),
                "recovered": recovered,
                "sources": ["A", "B"],
            })
        else:
            fused.append({
                "t": float(sa["t"]),
                "speaker": sa["speaker"],
                "text": sa["text"],
                "conf": round(float(sa.get("conf", 1.0)), 2),
                "recovered": False,
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
            "sources": ["B"],
        })

    fused.sort(key=lambda s: s["t"])
    return fused


def transcript_text(fused: List[Dict]) -> str:
    """Flatten a fused transcript into one string for the scribe."""
    return " ".join(s["text"] for s in fused)
