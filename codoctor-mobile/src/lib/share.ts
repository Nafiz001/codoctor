// Builds the record the doctor sends to the patient (WhatsApp / Telegram / SMS)
// via the OS share sheet. Bangla-first, with an English echo for each line.

import { Share } from 'react-native';
import type { PatientSummary } from './api';

export interface ConsultShareInput {
  summary: PatientSummary | null;
  /** Doctor-confirmed prescription, one medicine per line. */
  prescription: string;
  /** Optional plain-text conversation transcript. */
  transcript?: string;
  patientName?: string;
}

function todayBn(): string {
  const d = new Date();
  return d.toLocaleDateString('en-GB'); // dd/mm/yyyy — unambiguous in BD
}

export function buildConsultShareText(input: ConsultShareInput): string {
  const { summary, prescription, transcript, patientName } = input;
  const lines: string[] = [];

  lines.push('🩺 Codoctor — রোগীর রেকর্ড');
  if (patientName?.trim()) lines.push(`রোগী: ${patientName.trim()}`);
  lines.push(`তারিখ: ${todayBn()}`);
  lines.push('');

  if (summary) {
    lines.push('রোগ নির্ণয় (Diagnosis):');
    if (summary.conditionBn) lines.push(summary.conditionBn);
    if (summary.conditionEn) lines.push(summary.conditionEn);
    lines.push('');

    if (summary.actionBn || summary.actionEn) {
      lines.push('করণীয় (What to do):');
      if (summary.actionBn) lines.push(summary.actionBn);
      if (summary.actionEn) lines.push(summary.actionEn);
      lines.push('');
    }
  }

  const rx = prescription.trim();
  if (rx) {
    lines.push('💊 ওষুধ / প্রেসক্রিপশন (Prescription):');
    rx.split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((l) => lines.push(`• ${l}`));
    lines.push('');
  }

  if (summary?.dangerSignsBn?.length) {
    lines.push('⚠️ বিপদের লক্ষণ — এমন হলে দ্রুত হাসপাতালে যান (Danger signs):');
    summary.dangerSignsBn.forEach((s, i) => {
      const en = summary.dangerSignsEn?.[i];
      lines.push(en ? `• ${s} (${en})` : `• ${s}`);
    });
    lines.push('');
  }

  if (transcript?.trim()) {
    lines.push('🗣️ কথোপকথন (Conversation):');
    lines.push(transcript.trim());
    lines.push('');
  }

  lines.push('—');
  lines.push('পরামর্শমূলক; লাইসেন্সপ্রাপ্ত ডাক্তারের সিদ্ধান্তই চূড়ান্ত।');
  lines.push('Advisory record generated with Codoctor.');

  return lines.join('\n');
}

/** Open the OS share sheet with the consultation record. */
export async function shareConsult(input: ConsultShareInput): Promise<void> {
  const message = buildConsultShareText(input);
  try {
    await Share.share({ message, title: 'Codoctor — রোগীর রেকর্ড' });
  } catch {
    // user dismissed the sheet
  }
}
