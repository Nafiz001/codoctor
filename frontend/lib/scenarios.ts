// Ready-to-run demo scenarios for judges. Each fills the form with one tap
// ("Use this case", deterministic) and comes with a natural Bangla doctor↔patient
// conversation they can also read aloud. The patient speaks in lay terms; the
// doctor asks, examines, and decides.

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
      "🔴 Severe pneumonia → URGENT referral, AND Amoxicillin BLOCKED (the child is allergic to penicillin).",
    form: {
      ageMonths: "36", weightKg: "12", symptoms: "fever, cough, fast breathing",
      respiratoryRate: "52", chestIndrawing: true, dangerSigns: [],
      proposedMed: "Amoxicillin", allergies: "Penicillin", currentMeds: "Salbutamol",
    },
    dialogue: [
      { who: "doctor", bn: "আসসালামু আলাইকুম, বসুন। বাচ্চার কী হয়েছে?", en: "Hello, please sit. What's wrong with the child?" },
      { who: "patient", bn: "ডাক্তার সাহেব, ছেলেটার তিন দিন ধরে খুব জ্বর, কমছেই না।", en: "Doctor, my son has had a high fever for three days, it won't come down." },
      { who: "patient", bn: "কাল থেকে দেখছি খুব ঘন ঘন নিঃশ্বাস নিচ্ছে, বুকটা কেমন ওঠানামা করছে।", en: "Since yesterday he's breathing very fast, his chest keeps heaving." },
      { who: "doctor", bn: "কাশি আছে? ঠিকমতো খাওয়াদাওয়া করছে?", en: "Any cough? Is he eating properly?" },
      { who: "patient", bn: "কাশি আছে, কিন্তু কিছু খেতে চাইছে না, নেতিয়ে আছে।", en: "Yes, cough. But he won't eat, he's listless." },
      { who: "doctor", bn: "একটু দেখি… শ্বাসের হার মিনিটে বাহান্ন, বুকের নিচের অংশ টেনে যাচ্ছে।", en: "Let me examine… breathing 52 a minute, lower chest is pulling in." },
      { who: "doctor", bn: "নিউমোনিয়া, গুরুতর। অ্যান্টিবায়োটিক লাগবে — অ্যামোক্সিসিলিন দিচ্ছি।", en: "Pneumonia, and it's severe. Needs an antibiotic — I'll give Amoxicillin." },
    ],
  },
  {
    id: "pneumonia",
    title: "Pneumonia — fast breathing only",
    expect: "🟠 Pneumonia → oral antibiotic + follow-up. Allergy not recorded → co-pilot prompts to check for a penicillin allergy first.",
    form: {
      ageMonths: "24", weightKg: "11", symptoms: "fever, cough",
      respiratoryRate: "44", chestIndrawing: false, dangerSigns: [],
      proposedMed: "Amoxicillin", allergies: "", currentMeds: "",
    },
    dialogue: [
      { who: "doctor", bn: "বলুন, বাচ্চার কী সমস্যা?", en: "Tell me, what's the problem?" },
      { who: "patient", bn: "দুই দিন ধরে জ্বর আর কাশি।", en: "Fever and cough for two days." },
      { who: "doctor", bn: "শ্বাস নিতে কষ্ট হচ্ছে বলে মনে হয়?", en: "Does breathing seem to be a struggle?" },
      { who: "patient", bn: "একটু জোরে জোরে নিঃশ্বাস নেয়, তবে খেলাধুলা করছে।", en: "Breathes a bit hard, but he's still playing." },
      { who: "doctor", bn: "দেখি… শ্বাস মিনিটে চুয়াল্লিশ, বুক টানছে না।", en: "Let me see… breathing 44 a minute, no chest indrawing." },
      { who: "doctor", bn: "নিউমোনিয়ার শুরু। অ্যামোক্সিসিলিন দেব।", en: "Early pneumonia. I'll give Amoxicillin." },
      { who: "doctor", bn: "— তার আগে অ্যালার্জির খোঁজ নেওয়া দরকার।", en: "— but I should check for any allergy first." },
    ],
  },
  {
    id: "no-pneumonia",
    title: "Cough & cold — no pneumonia",
    expect: "🟢 No pneumonia → home care, NO antibiotic. Shows the system does not over-refer or over-prescribe.",
    form: {
      ageMonths: "36", weightKg: "13", symptoms: "cough, runny nose",
      respiratoryRate: "30", chestIndrawing: false, dangerSigns: [],
      proposedMed: "", allergies: "", currentMeds: "",
    },
    dialogue: [
      { who: "doctor", bn: "কী হয়েছে, বলুন।", en: "Tell me what's wrong." },
      { who: "patient", bn: "সামান্য কাশি আর নাক দিয়ে পানি পড়ছে।", en: "A little cough and a runny nose." },
      { who: "doctor", bn: "জ্বর আছে?", en: "Any fever?" },
      { who: "patient", bn: "হালকা, কাল রাতে একটু ছিল।", en: "Mild — a little last night." },
      { who: "doctor", bn: "ঠিকমতো খাচ্ছে, খেলছে তো?", en: "Eating and playing okay?" },
      { who: "patient", bn: "হ্যাঁ, স্বাভাবিক আছে।", en: "Yes, quite normal." },
      { who: "doctor", bn: "শ্বাস স্বাভাবিক, মিনিটে ত্রিশ। নিউমোনিয়া নেই — সাধারণ ঠান্ডা। ঘরেই যত্ন নিন, অ্যান্টিবায়োটিক লাগবে না।", en: "Breathing normal, 30 a minute. No pneumonia — just a cold. Home care; no antibiotic needed." },
    ],
  },
  {
    id: "danger-sign",
    title: "General danger sign — convulsion",
    expect: "🔴 Very severe → URGENT referral regardless of breathing rate (a general danger sign overrides everything).",
    form: {
      ageMonths: "20", weightKg: "10", symptoms: "fever, convulsion",
      respiratoryRate: "30", chestIndrawing: false, dangerSigns: ["convulsions"],
      proposedMed: "", allergies: "", currentMeds: "",
    },
    dialogue: [
      { who: "doctor", bn: "কী হয়েছে বাচ্চার?", en: "What happened to the child?" },
      { who: "patient", bn: "জ্বরের মধ্যে হঠাৎ সারা শরীর কেঁপে উঠল, চোখ উল্টে গেল।", en: "During the fever his whole body suddenly shook and his eyes rolled up." },
      { who: "doctor", bn: "কতক্ষণ ছিল এমন?", en: "How long did it last?" },
      { who: "patient", bn: "মিনিট খানেক মতো, খুব ভয় পেয়ে গেছি।", en: "About a minute — we got very scared." },
      { who: "doctor", bn: "এখন কেমন আছে?", en: "How is he now?" },
      { who: "patient", bn: "নেতিয়ে পড়ে আছে, ঠিকমতো সাড়া দিচ্ছে না।", en: "Listless, not responding well." },
      { who: "doctor", bn: "শ্বাস মোটামুটি ঠিক, কিন্তু খিঁচুনি একটা বিপদ-চিহ্ন — এখনই হাসপাতালে নিতে হবে।", en: "Breathing is roughly fine, but a convulsion is a danger sign — must go to hospital now." },
    ],
  },
  {
    id: "interaction",
    title: "Dangerous drug interaction",
    expect: "🔴 Ciprofloxacin + Tizanidine (a current medicine) → contraindicated interaction is blocked.",
    form: {
      ageMonths: "48", weightKg: "15", symptoms: "fever, cough",
      respiratoryRate: "30", chestIndrawing: false, dangerSigns: [],
      proposedMed: "Ciprofloxacin", allergies: "", currentMeds: "Tizanidine",
    },
    dialogue: [
      { who: "doctor", bn: "বলুন, কী সমস্যা?", en: "Tell me, what's the trouble?" },
      { who: "patient", bn: "কয়েকদিন ধরে জ্বর আর কাশি যাচ্ছে না।", en: "Fever and cough for a few days, not going away." },
      { who: "doctor", bn: "আগে থেকে কোনো ওষুধ চলছে এখন?", en: "Any medicine you're already taking?" },
      { who: "patient", bn: "মাংসপেশির ব্যথার জন্য টিজানিডিন খাচ্ছি নিয়মিত।", en: "I take Tizanidine regularly for muscle pain." },
      { who: "doctor", bn: "আচ্ছা। জ্বর-কাশির জন্য একটা অ্যান্টিবায়োটিক ভাবছিলাম — সিপ্রোফ্লক্সাসিন।", en: "I see. For the fever and cough I was considering an antibiotic — Ciprofloxacin." },
      { who: "patient", bn: "যেটা ভালো হয় দেন ডাক্তার সাহেব।", en: "Give whatever is best, doctor." },
    ],
  },
  {
    id: "screening",
    title: "Allergy unknown — ask before prescribing",
    expect: "🧠 Co-pilot prompts: “ask about a penicillin allergy before Amoxicillin” — because the allergy isn't recorded yet.",
    form: {
      ageMonths: "36", weightKg: "12", symptoms: "fever, cough, fast breathing",
      respiratoryRate: "52", chestIndrawing: true, dangerSigns: [],
      proposedMed: "Amoxicillin", allergies: "", currentMeds: "",
    },
    dialogue: [
      { who: "doctor", bn: "বসুন, বাচ্চার কী হয়েছে?", en: "Please sit — what's wrong with the child?" },
      { who: "patient", bn: "তিন দিন ধরে জ্বর, আর খুব দ্রুত শ্বাস নিচ্ছে।", en: "Fever for three days, and breathing very fast." },
      { who: "doctor", bn: "কাশি আছে সাথে?", en: "Any cough with it?" },
      { who: "patient", bn: "হ্যাঁ, শুকনো কাশি আছে।", en: "Yes, a dry cough." },
      { who: "patient", bn: "কিছু খেতে চাইছে না ঠিকমতো।", en: "He doesn't really want to eat." },
      { who: "doctor", bn: "দেখি… শ্বাস মিনিটে বাহান্ন, বুক একটু টানছে। নিউমোনিয়া।", en: "Let me see… breathing 52 a minute, chest pulling a little. Pneumonia." },
      { who: "doctor", bn: "অ্যামোক্সিসিলিন দিচ্ছি —", en: "I'll give Amoxicillin —" },
    ],
  },
];
