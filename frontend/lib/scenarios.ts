// Ready-to-run demo scenarios for judges. Each fills the /live form with one
// tap ("Use this case") and comes with a short Bangla doctor↔patient dialogue
// they can read aloud (or speak into the mic) to reproduce the result.

export interface ScenarioLine {
  who: "doctor" | "patient";
  bn: string;
  en: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  /** What the AI should catch — so a judge knows what "correct" looks like. */
  expect: string;
  form: {
    ageMonths: string;
    weightKg: string;
    symptoms: string;
    respiratoryRate: string;
    chestIndrawing: boolean;
    dangerSigns: string[];
    proposedMed: string;
    allergies: string;
    currentMeds: string;
  };
  dialogue: ScenarioLine[];
}

export const SCENARIOS: DemoScenario[] = [
  {
    id: "severe-allergy",
    title: "Severe pneumonia + penicillin allergy",
    expect:
      "🔴 Severe pneumonia → URGENT referral, AND Amoxicillin BLOCKED (patient is allergic to penicillin).",
    form: {
      ageMonths: "36", weightKg: "12", symptoms: "fever, cough, fast breathing",
      respiratoryRate: "52", chestIndrawing: true, dangerSigns: [],
      proposedMed: "Amoxicillin", allergies: "Penicillin", currentMeds: "Salbutamol",
    },
    dialogue: [
      { who: "doctor", bn: "আসসালামু আলাইকুম, বাচ্চার কী হয়েছে?", en: "Hello, what's wrong with the child?" },
      { who: "patient", bn: "তিন দিন ধরে অনেক জ্বর আর কাশি।", en: "High fever and cough for three days." },
      { who: "patient", bn: "আর দুই দিন ধরে খুব দ্রুত শ্বাস নিচ্ছে।", en: "And for two days, breathing very fast." },
      { who: "doctor", bn: "শ্বাসের হার মিনিটে বাহান্ন, বুকের নিচের অংশ টেনে যাচ্ছে।", en: "Respiratory rate 52, lower chest indrawing present." },
      { who: "doctor", bn: "একটা অ্যান্টিবায়োটিক লিখে দিচ্ছি — অ্যামোক্সিসিলিন।", en: "I'll prescribe an antibiotic — Amoxicillin." },
    ],
  },
  {
    id: "pneumonia",
    title: "Pneumonia — fast breathing only",
    expect: "🟠 Pneumonia → oral antibiotic + follow-up. Allergy unknown → co-pilot asks to check for a penicillin allergy first.",
    form: {
      ageMonths: "24", weightKg: "11", symptoms: "fever, cough",
      respiratoryRate: "44", chestIndrawing: false, dangerSigns: [],
      proposedMed: "Amoxicillin", allergies: "", currentMeds: "",
    },
    dialogue: [
      { who: "patient", bn: "বাচ্চার দুই দিন ধরে জ্বর আর কাশি।", en: "The child has had fever and cough for two days." },
      { who: "doctor", bn: "শ্বাস একটু দ্রুত, মিনিটে চুয়াল্লিশ। বুক টানছে না।", en: "Breathing a bit fast, 44/min. No chest indrawing." },
      { who: "doctor", bn: "অ্যামোক্সিসিলিন দেব ভাবছি।", en: "I'm thinking of giving Amoxicillin." },
    ],
  },
  {
    id: "no-pneumonia",
    title: "Cough & cold — no pneumonia",
    expect: "🟢 No pneumonia → home care, NO antibiotic. Tests that the system does not over-refer or over-prescribe.",
    form: {
      ageMonths: "36", weightKg: "13", symptoms: "cough, runny nose",
      respiratoryRate: "30", chestIndrawing: false, dangerSigns: [],
      proposedMed: "", allergies: "", currentMeds: "",
    },
    dialogue: [
      { who: "patient", bn: "সামান্য কাশি আর নাক দিয়ে পানি পড়ছে।", en: "A little cough and a runny nose." },
      { who: "doctor", bn: "শ্বাস স্বাভাবিক, মিনিটে ত্রিশ। বুক টানছে না।", en: "Breathing normal, 30/min. No indrawing." },
      { who: "doctor", bn: "জ্বর-কাশির জন্য ঘরোয়া যত্নই যথেষ্ট।", en: "Home care is enough for this cough and cold." },
    ],
  },
  {
    id: "danger-sign",
    title: "General danger sign — convulsion",
    expect: "🔴 Very severe → URGENT referral regardless of breathing rate (a general danger sign overrides).",
    form: {
      ageMonths: "20", weightKg: "10", symptoms: "fever, convulsion",
      respiratoryRate: "30", chestIndrawing: false, dangerSigns: ["convulsions"],
      proposedMed: "", allergies: "", currentMeds: "",
    },
    dialogue: [
      { who: "patient", bn: "জ্বরের সাথে একবার খিঁচুনি হয়েছে।", en: "With the fever, there was one convulsion." },
      { who: "doctor", bn: "শ্বাস স্বাভাবিক, কিন্তু খিঁচুনি একটা বিপদ-চিহ্ন।", en: "Breathing is normal, but a convulsion is a danger sign." },
      { who: "doctor", bn: "এখনই হাসপাতালে পাঠাতে হবে।", en: "Must refer to hospital now." },
    ],
  },
  {
    id: "interaction",
    title: "Dangerous drug interaction",
    expect: "🔴 Ciprofloxacin + Tizanidine (current med) → contraindicated interaction is blocked.",
    form: {
      ageMonths: "48", weightKg: "15", symptoms: "fever, cough",
      respiratoryRate: "30", chestIndrawing: false, dangerSigns: [],
      proposedMed: "Ciprofloxacin", allergies: "", currentMeds: "Tizanidine",
    },
    dialogue: [
      { who: "patient", bn: "জ্বর আর কাশি, আর আগে থেকে টিজানিডিন খাচ্ছে।", en: "Fever and cough, and already taking Tizanidine." },
      { who: "doctor", bn: "সিপ্রোফ্লক্সাসিন দেব ভাবছিলাম।", en: "I was thinking of giving Ciprofloxacin." },
    ],
  },
  {
    id: "screening",
    title: "Allergy unknown — ask before prescribing",
    expect: "🧠 Co-pilot prompts: “ask about a penicillin allergy before Amoxicillin” (allergy not yet recorded).",
    form: {
      ageMonths: "36", weightKg: "12", symptoms: "fever, cough, fast breathing",
      respiratoryRate: "52", chestIndrawing: true, dangerSigns: [],
      proposedMed: "Amoxicillin", allergies: "", currentMeds: "",
    },
    dialogue: [
      { who: "patient", bn: "তিন দিন ধরে জ্বর, দ্রুত শ্বাস নিচ্ছে।", en: "Fever for three days, breathing fast." },
      { who: "doctor", bn: "অ্যামোক্সিসিলিন দিচ্ছি।", en: "I'm giving Amoxicillin." },
      { who: "doctor", bn: "— কিন্তু আগে অ্যালার্জির কথা জিজ্ঞাসা করা হয়নি।", en: "— but the allergy hasn't been asked about yet." },
    ],
  },
];
