"""In-memory session store — the real bridge between the two devices.

A session is created by the doctor's console (the QR encodes its id). Both the
doctor's and the patient's phone *join* it and stream their browser-recognized
speech in; on "analyze" the two transcripts are fused → structured → run through
the orchestrator, and the patient-facing summary is published for the phone to
pick up by polling.

Single-process and ephemeral — appropriate for a no-login demo on a free tier:
state lives in a dict with a TTL, no DB, no auth. The server stamps each
utterance's timestamp from one clock so the two streams align for fusion even
though the devices' clocks don't.
"""

from __future__ import annotations

import secrets
import threading
import time

_TTL_SECONDS = 2 * 60 * 60  # drop sessions idle for 2h
_MAX_SESSIONS = 500
_MAX_SEGMENTS = 400  # per device — runaway guard
# Unambiguous, QR- and keypad-friendly (no O/0, I/1, etc.)
_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

_sessions: dict[str, dict] = {}
_lock = threading.RLock()


def _now() -> float:
    return time.time()


def _prune_locked() -> None:
    cutoff = _now() - _TTL_SECONDS
    for sid in [s for s, r in _sessions.items() if r["touched_at"] < cutoff]:
        _sessions.pop(sid, None)
    if len(_sessions) > _MAX_SESSIONS:
        oldest = sorted(_sessions.items(), key=lambda kv: kv[1]["touched_at"])
        for sid, _ in oldest[: len(_sessions) - _MAX_SESSIONS]:
            _sessions.pop(sid, None)


def _new_id_locked() -> str:
    for _ in range(12):
        sid = "".join(secrets.choice(_ALPHABET) for _ in range(5))
        if sid not in _sessions:
            return sid
    return "".join(secrets.choice(_ALPHABET) for _ in range(8))


def _public(rec: dict) -> dict:
    """The shape both devices poll — never leaks the raw per-device segments."""
    return {
        "id": rec["id"],
        "status": rec["status"],
        "patient": rec["patient"],
        "devices": {
            "doctor": "doctor" in rec["devices"],
            "patient": "patient" in rec["devices"],
        },
        "counts": {
            "doctor": len(rec["segments"]["doctor"]),
            "patient": len(rec["segments"]["patient"]),
        },
        "summary": rec["summary"],
        "created_at": rec["created_at"],
    }


def _touch(sid: str) -> dict | None:
    rec = _sessions.get(sid)
    if rec:
        rec["touched_at"] = _now()
    return rec


def create(patient: dict | None = None) -> dict:
    with _lock:
        _prune_locked()
        sid = _new_id_locked()
        _sessions[sid] = {
            "id": sid,
            "created_at": _now(),
            "touched_at": _now(),
            "_mono0": time.monotonic(),
            "patient": patient or {},
            "status": "waiting",  # waiting -> ready
            "devices": {},  # role -> last-seen epoch
            "segments": {"doctor": [], "patient": []},
            "summary": None,
            "analysis": None,
        }
        return _public(_sessions[sid])


def get(sid: str) -> dict | None:
    with _lock:
        rec = _touch(sid)
        return _public(rec) if rec else None


def join(sid: str, role: str) -> dict | None:
    role = "doctor" if role == "doctor" else "patient"
    with _lock:
        rec = _touch(sid)
        if not rec:
            return None
        rec["devices"][role] = _now()
        return _public(rec)


def append(sid: str, role: str, text: str, conf: float = 0.9) -> dict | None:
    """Append one recognized utterance from a device. The server stamps the
    time (relative to session start) so both streams share one clock."""
    role = "doctor" if role == "doctor" else "patient"
    text = (text or "").strip()
    with _lock:
        rec = _touch(sid)
        if not rec:
            return None
        rec["devices"][role] = _now()
        segs = rec["segments"][role]
        if text and len(segs) < _MAX_SEGMENTS:
            segs.append({
                "t": round(time.monotonic() - rec["_mono0"], 1),
                # constant speaker label: browser ASR can't diarize, so we let
                # fusion pair utterances across devices by time alone.
                "speaker": "spk",
                "text": text,
                "conf": float(conf),
            })
        return _public(rec)


def transcripts(sid: str) -> tuple[list, list] | None:
    """(doctor_segments, patient_segments) → (device_a, device_b) for fusion."""
    with _lock:
        rec = _touch(sid)
        if not rec:
            return None
        return list(rec["segments"]["doctor"]), list(rec["segments"]["patient"])


def update_context(sid: str, updates: dict) -> dict | None:
    """Merge patient-context fields (allergies, current_meds, notes) into the
    session — used when the patient fills their own form on their phone."""
    with _lock:
        rec = _touch(sid)
        if not rec:
            return None
        p = dict(rec.get("patient") or {})
        for k, v in (updates or {}).items():
            if v is not None:
                p[k] = v
        rec["patient"] = p
        return _public(rec)


def publish(sid: str, summary: dict, analysis: dict | None = None) -> dict | None:
    with _lock:
        rec = _touch(sid)
        if not rec:
            return None
        rec["summary"] = summary
        rec["analysis"] = analysis
        rec["status"] = "ready"
        return _public(rec)


def reset(sid: str) -> dict | None:
    """Clear the transcript to run another consultation in the same session."""
    with _lock:
        rec = _touch(sid)
        if not rec:
            return None
        rec["segments"] = {"doctor": [], "patient": []}
        rec["status"] = "waiting"
        rec["summary"] = None
        rec["analysis"] = None
        rec["_mono0"] = time.monotonic()
        return _public(rec)
