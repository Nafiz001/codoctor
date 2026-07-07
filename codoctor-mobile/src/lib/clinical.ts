// On-device deterministic clinical engines — a faithful TypeScript port of the
// backend's safety core (app/safety/imci.py, medsafety.py, dosing.py).
//
// WHY: in a flood / rural field visit there may be NO connectivity. The danger-
// sign, drug-safety, and dosing calls must still work. These are exact-match
// rules — identical to the server — so the offline result equals the online one.

import type { ImciResult, MedFinding, PatientSummary } from './api';

// ── WHO IMCI — cough / difficult breathing ──────────────────────────────────
const FAST_BREATHING: [number, number, number][] = [
  [2, 12, 50], // 2–11 months → ≥50/min
  [12, 60, 40], // 12–59 months → ≥40/min
];
const GENERAL_DANGER_SIGNS = new Set([
  'not_able_to_drink_or_breastfeed',
  'vomits_everything',
  'convulsions',
  'lethargic_or_unconscious',
]);
const CITATION_IMCI = {
  source: 'WHO IMCI chart booklet',
  ref: 'Cough or difficult breathing — assess & classify',
};

export function fastBreathingThreshold(ageMonths: number): number | null {
  for (const [lo, hi, thr] of FAST_BREATHING) {
    if (ageMonths >= lo && ageMonths < hi) return thr;
  }
  return null;
}

export function classifyAri(input: {
  ageMonths: number;
  respiratoryRate?: number | null;
  chestIndrawing?: boolean;
  stridor?: boolean;
  generalDangerSigns?: string[];
}): ImciResult {
  const { ageMonths, respiratoryRate = null, chestIndrawing = false, stridor = false } = input;
  const danger = [...new Set(input.generalDangerSigns ?? [])]
    .filter((d) => GENERAL_DANGER_SIGNS.has(d))
    .sort();
  const threshold = fastBreathingThreshold(ageMonths);
  const fast = respiratoryRate != null && threshold != null && respiratoryRate >= threshold;

  const reasons: string[] = [];
  if (danger.length) reasons.push('general danger sign: ' + danger.join(', '));
  if (chestIndrawing) reasons.push('lower chest-wall indrawing');
  if (stridor) reasons.push('stridor in a calm child');

  let classification: string, severity: string, refer: boolean, action: string;
  if (danger.length || chestIndrawing || stridor) {
    classification = 'Severe pneumonia or very severe disease';
    severity = 'critical';
    refer = true;
    action =
      'URGENT referral to hospital. Give the first pre-referral antibiotic dose per protocol, keep the child warm, and treat to prevent low blood sugar.';
  } else if (fast) {
    classification = 'Pneumonia';
    severity = 'moderate';
    refer = false;
    action = 'Oral antibiotic per guideline; soothe the throat; advise return signs; follow up in 3 days.';
    reasons.push(`fast breathing: RR ${respiratoryRate} ≥ ${threshold}/min for age`);
  } else {
    classification = 'Cough or cold (no pneumonia)';
    severity = 'low';
    refer = false;
    action = 'Home care; soothe the throat; advise when to return. No antibiotic.';
    if (respiratoryRate != null && threshold != null) {
      reasons.push(`RR ${respiratoryRate} < ${threshold}/min — not fast for age`);
    }
  }

  return { classification, severity, refer, reasons, action, citation: CITATION_IMCI };
}

// ── Medication safety ────────────────────────────────────────────────────────
const DRUG_CLASS: Record<string, string> = {
  amoxicillin: 'penicillin', ampicillin: 'penicillin', flucloxacillin: 'penicillin',
  cloxacillin: 'penicillin', penicillin: 'penicillin', 'co-amoxiclav': 'penicillin',
  'amoxicillin-clavulanate': 'penicillin',
  ceftriaxone: 'cephalosporin', cefixime: 'cephalosporin', cephalexin: 'cephalosporin',
  azithromycin: 'macrolide', erythromycin: 'macrolide', clarithromycin: 'macrolide',
  ciprofloxacin: 'fluoroquinolone', levofloxacin: 'fluoroquinolone',
  paracetamol: 'analgesic-antipyretic', ibuprofen: 'nsaid', aspirin: 'nsaid',
  warfarin: 'anticoagulant', tizanidine: 'muscle-relaxant', salbutamol: 'beta-agonist',
};
const CROSS_SENSITIVITY: Record<string, string[]> = { penicillin: ['cephalosporin'] };
const INTERACTION_PAIRS: Record<string, string> = {
  'ciprofloxacin|tizanidine': 'Ciprofloxacin sharply raises tizanidine levels — risk of dangerous hypotension and sedation. Contraindicated.',
  'aspirin|warfarin': 'Additive bleeding risk (anticoagulant + antiplatelet).',
  'ibuprofen|warfarin': 'NSAID increases bleeding risk on warfarin.',
  'clarithromycin|warfarin': 'Macrolide potentiates warfarin — raised bleeding risk.',
  'aspirin|ibuprofen': 'Combined NSAIDs — GI bleeding risk and reduced cardioprotection.',
};
const CITATION_FORMULARY = {
  source: 'National Drug Formulary (BD) / BNF',
  ref: 'Contraindications, interactions & hypersensitivity',
};
const norm = (s: string) => (s || '').trim().toLowerCase();
const pairKey = (a: string, b: string) => [a, b].sort().join('|');

export function checkMedication(
  proposed: string[],
  allergies: string[] = [],
  currentMeds: string[] = []
): MedFinding[] {
  const P = (proposed || []).map(norm);
  const A = (allergies || []).map(norm);
  const C = (currentMeds || []).map(norm);
  const findings: MedFinding[] = [];

  for (const drug of P) {
    const dclass = DRUG_CLASS[drug];
    for (const allergen of A) {
      const allergenClass = DRUG_CLASS[allergen] ?? allergen;
      const direct = allergen === drug || (dclass != null && (allergen === dclass || allergenClass === dclass));
      if (direct) {
        const what = dclass ? `a ${dclass}` : 'the named allergen';
        findings.push({
          type: 'allergy', severity: 'critical', drug,
          reason: `${cap(drug)} is ${what}; patient is allergic to ${allergen}.`,
          action: 'Do not prescribe. Choose a non–cross-reacting alternative.',
          citation: CITATION_FORMULARY,
        });
      } else if (dclass != null && (CROSS_SENSITIVITY[allergenClass] ?? []).includes(dclass)) {
        findings.push({
          type: 'cross-sensitivity', severity: 'caution', drug,
          reason: `${cap(drug)} (${dclass}) may cross-react with a ${allergen} allergy.`,
          action: 'Use with caution or pick an alternative class.',
          citation: CITATION_FORMULARY,
        });
      }
    }
    for (const cm of C) {
      const key = pairKey(drug, cm);
      if (INTERACTION_PAIRS[key]) {
        findings.push({
          type: 'interaction', severity: 'critical', drug, interacts_with: cm,
          reason: INTERACTION_PAIRS[key],
          action: 'Avoid the combination or choose an alternative.',
          citation: CITATION_FORMULARY,
        });
      }
    }
    for (const cm of C) {
      const cmClass = DRUG_CLASS[cm];
      if (dclass && cmClass && dclass === cmClass && drug !== cm) {
        findings.push({
          type: 'duplicate', severity: 'caution', drug, interacts_with: cm,
          reason: `${cap(drug)} and ${cap(cm)} are both ${dclass} — duplicate therapy.`,
          action: 'Avoid duplication.', citation: CITATION_FORMULARY,
        });
      }
    }
  }
  return findings;
}

// ── Weight-based paediatric dosing ───────────────────────────────────────────
interface DoseSpec { perDose: [number, number]; freq: number; maxPerKgDay: number; note: string; }
const DOSING: Record<string, DoseSpec> = {
  paracetamol: { perDose: [10, 15], freq: 4, maxPerKgDay: 60, note: 'For fever/pain. Every 4–6 hours as needed.' },
  ibuprofen: { perDose: [5, 10], freq: 3, maxPerKgDay: 30, note: 'Give with food. Avoid in dehydration.' },
  amoxicillin: { perDose: [25, 40], freq: 2, maxPerKgDay: 90, note: 'High-dose oral for pneumonia, twice daily.' },
  azithromycin: { perDose: [10, 10], freq: 1, maxPerKgDay: 10, note: 'Once daily, typically 3–5 days.' },
  cefixime: { perDose: [4, 4], freq: 2, maxPerKgDay: 8, note: 'Twice daily.' },
};
export interface DoseResult {
  known: boolean; drug: string; needWeight?: boolean;
  perDoseMg?: [number, number]; frequencyPerDay?: number;
  maxDailyMg?: number; exceedsMax?: boolean; note: string;
}
const CITATION_DOSING = { source: 'WHO Pocket Book / BNF for Children', ref: 'Paediatric weight-based dosing' };

export function dose(drug: string, weightKg?: number | null): DoseResult {
  const key = norm(drug);
  const spec = DOSING[key];
  if (!spec) return { known: false, drug, note: `No standard weight-based dose on file for ${drug}. Confirm against the formulary.` };
  if (!weightKg || weightKg <= 0) return { known: true, drug, needWeight: true, note: 'Enter the child’s weight (kg) to compute the dose.' };
  const [lo, hi] = spec.perDose;
  const perDoseMg: [number, number] = [round(lo * weightKg), round(hi * weightKg)];
  const dailyHigh = round(perDoseMg[1] * spec.freq);
  const maxDaily = round(spec.maxPerKgDay * weightKg);
  const exceeds = dailyHigh > maxDaily;
  return {
    known: true, drug, perDoseMg, frequencyPerDay: spec.freq, maxDailyMg: maxDaily, exceedsMax: exceeds,
    note: `${spec.note}${exceeds ? ` ⚠️ Cap at ${maxDaily} mg/day.` : ''}`,
  };
}

export const DOSING_CITATION = CITATION_DOSING;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const round = (x: number) => Math.round(x * 10) / 10;

// ── Build a patient-shareable summary from offline engine output ─────────────
const DANGER_BN = [
  'শ্বাস আরও দ্রুত বা কষ্টকর হলে',
  'বুক আরও বেশি টেনে শ্বাস নিলে',
  'খিঁচুনি হলে',
  'বাচ্চা নিস্তেজ বা অজ্ঞান হয়ে পড়লে',
  'কিছু খেতে বা পান করতে না পারলে',
];
const DANGER_EN = [
  'Breathing gets faster or harder',
  'Chest pulls in even more',
  'Any convulsion / fit',
  'Child becomes drowsy or unconscious',
  'Cannot eat or drink anything',
];

export function offlineSummary(imci: ImciResult, criticalMeds: MedFinding[]): PatientSummary {
  const cls = imci.classification;
  let conditionBn: string, actionBn: string;
  if (cls.startsWith('Severe')) {
    conditionBn = 'শিশুর গুরুতর নিউমোনিয়া হয়েছে।';
    actionBn = 'এখনই কাছের হাসপাতালে নিয়ে যান।';
  } else if (cls === 'Pneumonia') {
    conditionBn = 'শিশুর নিউমোনিয়া হয়েছে।';
    actionBn = 'গাইডলাইন অনুযায়ী অ্যান্টিবায়োটিক দিন ও ৩ দিন পর আবার দেখান।';
  } else {
    conditionBn = 'নিউমোনিয়া নেই — সর্দি-কাশি।';
    actionBn = 'ঘরোয়া যত্ন নিন; প্রয়োজনে আবার দেখান।';
  }
  const medsBn = criticalMeds.length
    ? criticalMeds.map((m) => `${cap(m.drug)} দেওয়া যাবে না — ${m.reason}`).join(' ')
    : '';
  return {
    conditionBn, conditionEn: cls,
    meaningBn: imci.reasons.join('; '), meaningEn: imci.reasons.join('; '),
    actionBn, actionEn: imci.action,
    medsBn, medsEn: criticalMeds.map((m) => m.reason).join(' '),
    dangerSignsBn: DANGER_BN, dangerSignsEn: DANGER_EN,
    tone: imci.refer ? 'red' : 'brand', refer: imci.refer,
    citations: imci.citation ? [imci.citation] : [],
  };
}
