"""Tests for the live session layer — create, join, stream, analyze, publish."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.sessions import store
from app.sessions.summary import build_summary
from app.main import session_analyze
from app.models import SessionAnalyzeRequest, PatientContext


def test_create_and_get():
    s = store.create({"allergies": ["Penicillin"]})
    sid = s["id"]
    assert s["status"] == "waiting"
    assert len(sid) >= 5
    got = store.get(sid)
    assert got is not None and got["id"] == sid
    assert store.get("NOPE") is None


def test_join_and_stream_and_fuse():
    sid = store.create()["id"]
    store.join(sid, "doctor")
    store.join(sid, "patient")
    s = store.get(sid)
    assert s["devices"] == {"doctor": True, "patient": True}

    # Doctor's phone misses "দ্রুত"; the patient's phone catches it.
    store.append(sid, "doctor", "তিন দিন ধরে জ্বর আর শ্বাস নিচ্ছে", 0.8)
    store.append(sid, "patient", "তিন দিন ধরে জ্বর আর দ্রুত শ্বাস নিচ্ছে", 0.75)
    a, b = store.transcripts(sid)
    assert len(a) == 1 and len(b) == 1
    assert store.get(sid)["counts"] == {"doctor": 1, "patient": 1}


def test_analyze_publishes_summary():
    sid = store.create({"allergies": ["Penicillin"]})["id"]
    # Severe-pneumonia golden path, dictated across the two devices.
    store.append(sid, "doctor", "শ্বাসের হার মিনিটে ৫২, বুকের নিচের অংশ টেনে যাচ্ছে", 0.85)
    store.append(sid, "patient", "জ্বর আর কাশি, বুক টেনে টেনে শ্বাস নিচ্ছে", 0.8)

    req = SessionAnalyzeRequest(
        patient=PatientContext(allergies=["Penicillin"], current_meds=["Salbutamol"]),
        age_months=36,
        proposed_meds=["Amoxicillin"],
    )
    out = session_analyze(sid, req)
    assert out["session"]["status"] == "ready"
    assert out["summary"]["refer"] is True
    assert "fused_transcript" in out and len(out["fused_transcript"]) >= 1
    # The published summary is now readable by the patient phone.
    assert store.get(sid)["summary"]["conditionBn"]


def test_summary_maps_classifications():
    severe = build_summary({"safety": {"imci": {"classification": "Severe pneumonia or very severe disease", "refer": True}, "medication": [{"drug": "amoxicillin", "severity": "critical"}]}})
    assert severe["refer"] is True
    assert "হাসপাতাল" in severe["actionBn"]
    assert "Amoxicillin" in severe["medsEn"]

    mild = build_summary({"safety": {"imci": {"classification": "Cough or cold (no pneumonia)", "refer": False}, "medication": []}})
    assert mild["refer"] is False
    assert "antibiotic" in mild["medsEn"].lower()


if __name__ == "__main__":
    test_create_and_get()
    test_join_and_stream_and_fuse()
    test_analyze_publishes_summary()
    test_summary_maps_classifications()
    print("OK — 4/4 session tests passed")
