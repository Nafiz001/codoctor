"""Canonical golden-path seed for the one-tap demo replay.

The single source of truth for the pediatric-ARI / WHO IMCI demo: two authored
per-device Bangla transcripts whose mics drop *different* words, so dual-device
fusion provably recovers tokens, and whose content deterministically fires the
severe-pneumonia danger sign (fast breathing + chest indrawing) and the
penicillin-allergy medication block. Driving the demo from here means the climax
never depends on a second phone, room noise, iOS, or live ASR.

Device A (doctor's phone) misses "দ্রুত" (t≈19) and "বুকটা টেনে টেনে" (t≈31);
device B (patient's phone) caught both — fusion fills the gaps.
"""

DEMO_PATIENT = {"allergies": ["Penicillin"], "current_meds": ["Salbutamol"]}
DEMO_AGE_MONTHS = 36
DEMO_PROPOSED_MEDS = ["Amoxicillin"]

DEMO_DEVICE_A = [
    {"t": 3, "speaker": "doctor", "text": "আসসালামু আলাইকুম, বসুন। বাচ্চার কী হয়েছে?", "conf": 0.92},
    {"t": 8, "speaker": "patient", "text": "ডাক্তার সাহেব, আমার ছেলের তিন দিন ধরে অনেক জ্বর।", "conf": 0.9},
    {"t": 14, "speaker": "doctor", "text": "জ্বর কেমন? আর অন্য কোনো সমস্যা আছে?", "conf": 0.91},
    # device A missed "দ্রুত" here
    {"t": 19, "speaker": "patient", "text": "অনেক বেশি। আর দুই দিন ধরে খুব শ্বাস নিচ্ছে।", "conf": 0.78},
    {"t": 25, "speaker": "doctor", "text": "কাশি আছে? ঠিকমতো খাওয়া-দাওয়া করছে?", "conf": 0.9},
    # device A missed "বুকটা টেনে টেনে" here
    {"t": 31, "speaker": "patient", "text": "কাশি আছে। কিছু খেতে চাইছে না, আর শ্বাস নিচ্ছে।", "conf": 0.82},
    {"t": 38, "speaker": "doctor", "text": "আচ্ছা, একটু পরীক্ষা করে দেখি।", "conf": 0.93},
    {"t": 46, "speaker": "doctor", "text": "শ্বাসের হার মিনিটে ৫২, তাপমাত্রা ৩৯.১ ডিগ্রি, বুকের নিচের অংশ টেনে যাচ্ছে।", "conf": 0.86},
    {"t": 54, "speaker": "doctor", "text": "একটা অ্যান্টিবায়োটিক লিখে দিই — অ্যামোক্সিসিলিন।", "conf": 0.9},
]

DEMO_DEVICE_B = [
    {"t": 8.3, "speaker": "patient", "text": "আমার ছেলের তিন দিন ধরে জ্বর।", "conf": 0.7},
    # device B caught "দ্রুত"
    {"t": 19.3, "speaker": "patient", "text": "অনেক বেশি। আর দুই দিন ধরে খুব দ্রুত শ্বাস নিচ্ছে।", "conf": 0.72},
    # device B caught "বুকটা টেনে টেনে"
    {"t": 31.3, "speaker": "patient", "text": "কাশি আছে। কিছু খেতে চাইছে না, আর বুকটা টেনে টেনে শ্বাস নিচ্ছে।", "conf": 0.75},
]
