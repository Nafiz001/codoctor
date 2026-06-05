"""Tests for transcript fusion + the Scribe extractor + end-to-end from transcript."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.asr.fusion import fuse, transcript_text  # noqa: E402
from app.asr.scribe import extract  # noqa: E402
from app.agents.graph import run_consultation  # noqa: E402

# Device A drops "দ্রুত" on the breathing line (low conf); device B catches it.
DEV_A = [
    {"t": 8, "speaker": "patient", "text": "আমার ছেলের তিন দিন ধরে অনেক জ্বর", "conf": 0.9},
    {"t": 19, "speaker": "patient", "text": "দুই দিন ধরে খুব শ্বাস নিচ্ছে", "conf": 0.6},
    {"t": 46, "speaker": "doctor", "text": "শ্বাসের হার মিনিটে ৫২ বুকের নিচের অংশ টেনে যাচ্ছে", "conf": 0.85},
    {"t": 54, "speaker": "doctor", "text": "অ্যান্টিবায়োটিক দিই অ্যামোক্সিসিলিন", "conf": 0.9},
]
DEV_B = [
    {"t": 8.3, "speaker": "patient", "text": "আমার ছেলের তিন দিন ধরে জ্বর", "conf": 0.7},
    {"t": 19.2, "speaker": "patient", "text": "দুই দিন ধরে খুব দ্রুত শ্বাস নিচ্ছে", "conf": 0.8},
    {"t": 31, "speaker": "patient", "text": "কিছু খেতে চাইছে না", "conf": 0.75},
]


def test_fusion_keeps_both_devices():
    f = fuse(DEV_A, DEV_B)
    assert "দ্রুত" in transcript_text(f)
    assert any(s["sources"] == ["B"] for s in f)  # B-only utterance carried in


def test_fusion_recovers_missing_token():
    a = [{"t": 1, "speaker": "patient", "text": "খুব শ্বাস নিচ্ছে", "conf": 0.9}]
    b = [{"t": 1.1, "speaker": "patient", "text": "খুব দ্রুত শ্বাস নিচ্ছে", "conf": 0.5}]
    f = fuse(a, b)
    assert f[0]["recovered"] is True
    assert "দ্রুত" in f[0]["text"]


def test_scribe_extracts_structure():
    enc = extract(transcript_text(fuse(DEV_A, DEV_B)))
    assert "fever" in enc["symptoms"]
    assert "fast_breathing" in enc["symptoms"]
    assert "poor_feeding" in enc["symptoms"]
    assert enc["vitals"].get("respiratory_rate") == 52
    assert enc["chest_indrawing"] is True
    assert "amoxicillin" in enc["proposed_meds"]


def test_end_to_end_from_transcript():
    enc = extract(transcript_text(fuse(DEV_A, DEV_B)))
    res = run_consultation({"allergies": ["Penicillin"]}, enc)
    assert res["grounded"] is True
    assert res["safety"]["imci"]["refer"] is True
    assert any("Formulary" in c["source"] for c in res["citations"])


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items())
             if k.startswith("test_") and callable(v)]
    passed = 0
    for fn in tests:
        try:
            fn()
            print(f"PASS  {fn.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"FAIL  {fn.__name__}: {e}")
        except Exception as e:  # noqa: BLE001
            print(f"ERROR {fn.__name__}: {e!r}")
    print(f"\n{passed}/{len(tests)} passed")
    sys.exit(0 if passed == len(tests) else 1)
