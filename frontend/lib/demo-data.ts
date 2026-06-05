// ---------------------------------------------------------------------------
// Codoctor — scripted demo consultation (pediatric ARI / WHO IMCI golden path)
// This is the deterministic "replay sample consultation" the PRD calls for, so
// the live demo can never break on ASR. All clinical logic mirrors the real
// deterministic tools (IMCI danger-sign tree + drug-allergy check).
// ---------------------------------------------------------------------------

export type Tone =
  | "brand"
  | "red"
  | "amber"
  | "sky"
  | "indigo"
  | "emerald"
  | "slate";

export type Speaker = "doctor" | "patient";

export interface TranscriptLine {
  id: number;
  t: number; // seconds into the consult
  speaker: Speaker;
  bn: string; // Bangla utterance
  en: string; // English gloss (for non-Bangla judges)
  conf: number; // ASR confidence 0..1
  fused?: boolean; // a token recovered from the 2nd device (transcript fusion)
}

export type AgentKey =
  | "scribe"
  | "differential"
  | "completeness"
  | "danger"
  | "medsafety"
  | "critic"
  | "summary";

export interface AgentEvent {
  id: number;
  afterLine: number; // reveal once this transcript line is reached
  agent: AgentKey;
  title: string;
  detail: string;
  status: "info" | "working" | "flag" | "critical" | "ok";
  citation?: { source: string; ref: string };
}

export interface AgentMeta {
  key: AgentKey;
  name: string;
  nameBn: string;
  role: string;
  tone: Tone;
  deterministic?: boolean;
}

// ---------------------------------------------------------------------------
// The agent team
// ---------------------------------------------------------------------------
export const AGENTS: AgentMeta[] = [
  {
    key: "scribe",
    name: "Scribe",
    nameBn: "লিপিকার",
    role: "Structures the conversation into a clinical note + extracts symptoms, vitals, meds.",
    tone: "indigo",
  },
  {
    key: "differential",
    name: "Differential",
    nameBn: "সম্ভাব্য রোগ",
    role: "Ranked, cited list of conditions to consider — never a final diagnosis.",
    tone: "brand",
  },
  {
    key: "completeness",
    name: "Completeness",
    nameBn: "সম্পূর্ণতা",
    role: "Surfaces guideline-recommended questions the doctor hasn't asked yet.",
    tone: "sky",
  },
  {
    key: "danger",
    name: "Danger-Sign",
    nameBn: "বিপদ-চিহ্ন",
    role: "Deterministic WHO IMCI red-flag decision tree. Escalates, never guesses.",
    tone: "red",
    deterministic: true,
  },
  {
    key: "medsafety",
    name: "Med-Safety",
    nameBn: "ওষুধ-নিরাপত্তা",
    role: "Deterministic drug interaction, allergy & dose check against the formulary.",
    tone: "amber",
    deterministic: true,
  },
  {
    key: "critic",
    name: "Critic",
    nameBn: "যাচাইকারী",
    role: "Verifies every suggestion cites a real guideline chunk — or suppresses it.",
    tone: "slate",
  },
  {
    key: "summary",
    name: "Patient-Summary",
    nameBn: "রোগীর সারাংশ",
    role: "Plain-Bangla, spoken 'what you have / do / watch for' record for the patient.",
    tone: "emerald",
  },
];

export const AGENT_BY_KEY: Record<AgentKey, AgentMeta> = AGENTS.reduce(
  (acc, a) => ({ ...acc, [a.key]: a }),
  {} as Record<AgentKey, AgentMeta>
);

// ---------------------------------------------------------------------------
// Patient record (loaded by scanning the QR on the doctor's door)
// ---------------------------------------------------------------------------
export const PATIENT = {
  id: "BD-OPD-4471",
  name: "Child (M)",
  nameBn: "শিশু (পুরুষ)",
  age: "3 yrs",
  ageBn: "৩ বছর",
  sex: "Male",
  weightKg: 12,
  allergies: ["Penicillin"],
  chronic: ["Mild asthma"],
  meds: ["Salbutamol inhaler (as needed)"],
  lastVisit: {
    date: "12 Mar 2026",
    reason: "Wheeze",
    note: "Salbutamol advised; no antibiotics.",
  },
};

// ---------------------------------------------------------------------------
// The consultation transcript (dual-mic fused)
// ---------------------------------------------------------------------------
export const TRANSCRIPT: TranscriptLine[] = [
  {
    id: 1,
    t: 3,
    speaker: "doctor",
    bn: "আসসালামু আলাইকুম, বসুন। বাচ্চার কী হয়েছে?",
    en: "Hello, please sit. What's wrong with the child?",
    conf: 0.95,
  },
  {
    id: 2,
    t: 8,
    speaker: "patient",
    bn: "ডাক্তার সাহেব, আমার ছেলের তিন দিন ধরে অনেক জ্বর।",
    en: "Doctor, my son has had high fever for three days.",
    conf: 0.91,
  },
  {
    id: 3,
    t: 14,
    speaker: "doctor",
    bn: "জ্বর কেমন? আর অন্য কোনো সমস্যা আছে?",
    en: "How is the fever? Any other problems?",
    conf: 0.93,
  },
  {
    id: 4,
    t: 19,
    speaker: "patient",
    bn: "অনেক বেশি। আর দুই দিন ধরে খুব দ্রুত শ্বাস নিচ্ছে।",
    en: "Very high. And for two days he has been breathing very fast.",
    conf: 0.71,
    fused: true,
  },
  {
    id: 5,
    t: 25,
    speaker: "doctor",
    bn: "কাশি আছে? ঠিকমতো খাওয়া-দাওয়া করছে?",
    en: "Any cough? Is he eating properly?",
    conf: 0.92,
  },
  {
    id: 6,
    t: 31,
    speaker: "patient",
    bn: "কাশি আছে। কিছু খেতে চাইছে না, আর বুকটা টেনে টেনে শ্বাস নিচ্ছে।",
    en: "Yes, cough. He won't eat, and his chest pulls in when he breathes.",
    conf: 0.66,
    fused: true,
  },
  {
    id: 7,
    t: 38,
    speaker: "doctor",
    bn: "আচ্ছা, একটু পরীক্ষা করে দেখি।",
    en: "Alright, let me examine him.",
    conf: 0.94,
  },
  {
    id: 8,
    t: 46,
    speaker: "doctor",
    bn: "শ্বাসের হার মিনিটে ৫২, তাপমাত্রা ৩৯.১ ডিগ্রি, বুকের নিচের অংশ টেনে যাচ্ছে।",
    en: "Respiratory rate 52/min, temperature 39.1°C, lower chest indrawing present.",
    conf: 0.88,
  },
  {
    id: 9,
    t: 54,
    speaker: "doctor",
    bn: "একটা অ্যান্টিবায়োটিক লিখে দিই — অ্যামোক্সিসিলিন।",
    en: "Let me prescribe an antibiotic — Amoxicillin.",
    conf: 0.9,
  },
];

// ---------------------------------------------------------------------------
// Agent reasoning trace — the visible proof that this is genuinely multi-step
// ---------------------------------------------------------------------------
export const AGENT_EVENTS: AgentEvent[] = [
  {
    id: 1,
    afterLine: 2,
    agent: "scribe",
    title: "Extracted: fever, onset 3 days",
    detail: "Subjective complaint captured and added to the encounter note.",
    status: "info",
  },
  {
    id: 2,
    afterLine: 4,
    agent: "scribe",
    title: "Extracted: fast breathing, onset 2 days",
    detail: "Recovered “দ্রুত শ্বাস” from device 2 — device 1 confidence was low.",
    status: "info",
  },
  {
    id: 3,
    afterLine: 4,
    agent: "danger",
    title: "Monitoring respiratory danger signs (age 3y)",
    detail: "Fast-breathing threshold for 1–5 years is ≥ 40/min. Awaiting a measured rate.",
    status: "working",
    citation: { source: "WHO IMCI", ref: "Cough or difficult breathing" },
  },
  {
    id: 4,
    afterLine: 4,
    agent: "completeness",
    title: "Not yet asked: cough, chest indrawing, feeding",
    detail:
      "IMCI requires these to classify a child with fast breathing. Prompting the doctor.",
    status: "flag",
    citation: { source: "WHO IMCI", ref: "Assess: cough / difficult breathing" },
  },
  {
    id: 5,
    afterLine: 6,
    agent: "scribe",
    title: "Extracted: cough, poor feeding, caregiver reports chest indrawing",
    detail: "All IMCI assessment items for this branch are now covered.",
    status: "ok",
  },
  {
    id: 6,
    afterLine: 6,
    agent: "differential",
    title: "Consider: Pneumonia · Bronchiolitis · Asthma exacerbation",
    detail:
      "Ranked from fever + cough + fast breathing + indrawing, with the asthma history on file. Cited, not a final call.",
    status: "info",
    citation: { source: "DGHS STG", ref: "Acute Respiratory Infection — Paediatric" },
  },
  {
    id: 7,
    afterLine: 8,
    agent: "danger",
    title: "DANGER SIGN — Severe pneumonia",
    detail:
      "RR 52 ≥ 40/min (age 1–5y) AND lower chest indrawing → classify SEVERE PNEUMONIA → urgent referral.",
    status: "critical",
    citation: { source: "WHO IMCI", ref: "Classify: severe pneumonia / very severe disease" },
  },
  {
    id: 8,
    afterLine: 8,
    agent: "critic",
    title: "Verified — classification is grounded",
    detail: "The escalation maps to a retrieved IMCI rule. Cleared to surface.",
    status: "ok",
  },
  {
    id: 9,
    afterLine: 9,
    agent: "medsafety",
    title: "CONTRAINDICATION — Amoxicillin blocked",
    detail:
      "Amoxicillin is a penicillin-class drug; patient record lists a Penicillin allergy. Do not prescribe.",
    status: "critical",
    citation: { source: "BNF / NDF Bangladesh", ref: "Amoxicillin — penicillin hypersensitivity" },
  },
  {
    id: 10,
    afterLine: 9,
    agent: "summary",
    title: "Drafting the patient's Bangla record",
    detail: "Plain-language summary + danger signs, ready to read aloud on the patient's phone.",
    status: "info",
  },
];

// ---------------------------------------------------------------------------
// The two deterministic "catches" — surfaced as prominent cards
// ---------------------------------------------------------------------------
export const DANGER_ALERT = {
  level: "critical" as const,
  titleEn: "Severe pneumonia — refer urgently",
  titleBn: "গুরুতর নিউমোনিয়া — এখনই রেফার করুন",
  trigger: "RR 52/min (≥40 for age 1–5y) + lower chest indrawing",
  classification: "Severe pneumonia / very severe disease",
  action:
    "Urgent referral to hospital. Give a pre-referral antibiotic per protocol; keep the child warm; continue fluids.",
  citation: { source: "WHO IMCI chart booklet", ref: "Cough or difficult breathing → classify" },
};

export const MEDSAFETY_ALERT = {
  level: "critical" as const,
  drug: "Amoxicillin",
  titleEn: "Allergy contraindication",
  titleBn: "অ্যালার্জি — এই ওষুধ দেওয়া যাবে না",
  reason: "Amoxicillin is a penicillin; the patient has a recorded Penicillin allergy.",
  alternative:
    "Use a non-penicillin agent per the severe-pneumonia referral protocol (e.g. a guideline-approved alternative). Confirm at the referral facility.",
  citation: { source: "National Drug Formulary (BD) / BNF", ref: "Amoxicillin — contraindicated in penicillin hypersensitivity" },
};

// ---------------------------------------------------------------------------
// Auto-drafted clinical note (doctor confirms with one tap)
// ---------------------------------------------------------------------------
export const SOAP_NOTE = {
  subjective:
    "3 y/o male. High fever ×3 days, fast breathing ×2 days, cough, reduced feeding. Caregiver reports chest indrawing. Known mild asthma.",
  objective:
    "RR 52/min · Temp 39.1°C · lower chest-wall indrawing present · Wt 12 kg.",
  assessment:
    "Severe pneumonia (WHO IMCI: fast breathing for age + chest indrawing). Penicillin allergy on record.",
  plan: [
    "URGENT referral to hospital / emergency.",
    "Pre-referral antibiotic per protocol — AVOID penicillin class (allergy).",
    "Keep warm, continue feeding & fluids.",
    "Counsel caregiver on danger signs (below).",
  ],
};

// ---------------------------------------------------------------------------
// Patient-held record (read aloud in Bangla on the patient's phone)
// ---------------------------------------------------------------------------
export const PATIENT_SUMMARY = {
  conditionBn: "আপনার বাচ্চার নিউমোনিয়া (ফুসফুসের সংক্রমণ) হয়েছে, এবং এটি গুরুতর।",
  conditionEn: "Your child has pneumonia (a lung infection), and it is severe.",
  meaningBn:
    "দ্রুত শ্বাস নেওয়া আর বুক টেনে শ্বাস নেওয়া বিপদের লক্ষণ। দেরি করা ঠিক হবে না।",
  meaningEn:
    "Fast breathing and chest indrawing are danger signs. Do not delay.",
  actionBn: "এখনই কাছের হাসপাতাল বা জরুরি বিভাগে নিয়ে যান।",
  actionEn: "Take the child to the nearest hospital or emergency now.",
  medsBn:
    "হাসপাতালে প্রোটোকল অনুযায়ী অ্যান্টিবায়োটিক দেওয়া হবে। পেনিসিলিন জাতীয় ওষুধ দেওয়া যাবে না — অ্যালার্জি আছে।",
  medsEn:
    "Antibiotics will be given at hospital per protocol. No penicillin-type medicine — there is an allergy.",
  dangerSignsBn: [
    "শ্বাস আরও দ্রুত বা কষ্টকর হলে",
    "বুক আরও বেশি টেনে শ্বাস নিলে",
    "খিঁচুনি হলে",
    "বাচ্চা নিস্তেজ বা অজ্ঞান হয়ে পড়লে",
    "কিছু খেতে বা পান করতে না পারলে",
  ],
  dangerSignsEn: [
    "Breathing gets faster or harder",
    "Chest pulls in even more",
    "Any convulsion / fit",
    "Child becomes drowsy or unconscious",
    "Cannot eat or drink anything",
  ],
};

/** One continuous Bangla paragraph for text-to-speech read-aloud. */
export const PATIENT_SUMMARY_SPEECH = [
  PATIENT_SUMMARY.conditionBn,
  PATIENT_SUMMARY.meaningBn,
  PATIENT_SUMMARY.actionBn,
  PATIENT_SUMMARY.medsBn,
  "বিপদের লক্ষণ: " + PATIENT_SUMMARY.dangerSignsBn.join("; ") + "।",
].join(" ");

// ---------------------------------------------------------------------------
// Landing-page content
// ---------------------------------------------------------------------------
export const PROBLEM_STATS = [
  { value: "60–120s", label: "a real OPD consultation in a govt hospital" },
  { value: "~6 / 10k", label: "doctors per 10,000 people in Bangladesh" },
  { value: "No EHR", label: "no national health record — the slip gets lost" },
  { value: "Bangla-only", label: "patients handed English meds they can't read" },
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Scan the QR",
    desc: "The patient scans the code on the doctor's door; their record loads on the doctor's screen.",
  },
  {
    step: "02",
    title: "Listen on both phones",
    desc: "Two mics capture the conversation and fuse into one high-confidence Bangla transcript.",
  },
  {
    step: "03",
    title: "Agents cross-check",
    desc: "A team of agents checks guidelines, danger signs and drug safety — every prompt cited.",
  },
  {
    step: "04",
    title: "A record they keep",
    desc: "The patient walks out with a spoken Bangla summary and danger signs, kept on their phone.",
  },
];
