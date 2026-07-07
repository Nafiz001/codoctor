/**
 * DoctorConsultScreen — the field consultation flow.
 *
 * Works solo: the doctor's phone is the source of truth. The patient does NOT
 * need a phone. Optionally a patient phone can join by QR to add a second mic.
 *
 * Flow:
 *   setup      → enter patient context, optionally attach a previous report
 *   recording  → doctor records the conversation (8s Bangla ASR chunks)
 *   analyzing  → backend fuses + runs IMCI danger-sign + med-safety + agents
 *   results    → real alerts, editable prescription, SHARE to patient
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';
import { DangerAlertCard, MedSafetyCard } from '../components/AlertCard';
import { CitationBadge } from '../components/CitationBadge';
import TopAppBar from '../components/TopAppBar';
import {
  API_URL,
  createSession,
  joinSession,
  getSession,
  analyzeSession,
  resetSession,
  warmBackend,
  appendTranscript,
  type SessionState,
  type SessionAnalyzeResult,
} from '../lib/api';
import { useChunkedRecording } from '../lib/useRecording';
import { shareConsult } from '../lib/share';
import { captureReportPhoto, pickReportImage, pickReportPdf } from '../lib/pickReport';
import type { ReportExtract } from '../lib/api';
import type { RootStackParamList } from '../../App';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Doctor'> };
type Phase = 'setup' | 'recording' | 'analyzing' | 'results' | 'error';

const splitList = (s: string): string[] =>
  s.split(',').map((x) => x.trim()).filter(Boolean);

export default function DoctorConsultScreen({ navigation }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [ageMonths, setAgeMonths] = useState('36');
  const [patientName, setPatientName] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [withPatientPhone, setWithPatientPhone] = useState(false);
  const [report, setReport] = useState<ReportExtract | null>(null);
  const [attaching, setAttaching] = useState(false);

  const [session, setSession] = useState<SessionState | null>(null);
  const [creating, setCreating] = useState(false);
  const [heard, setHeard] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<SessionAnalyzeResult | null>(null);
  const [prescription, setPrescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const sidRef = useRef<string | null>(null);
  sidRef.current = session?.id ?? null;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dot = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    warmBackend();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Pulsing REC dot
  useEffect(() => {
    if (phase !== 'recording') { dot.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 0.2, duration: 550, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 1, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // ── Recording ──────────────────────────────────────────────────────────────
  const onTranscript = useCallback(async (text: string, conf: number) => {
    const sid = sidRef.current;
    setHeard((h) => [...h, text]);
    if (sid) await appendTranscript(sid, 'doctor', text, conf);
  }, []);

  const recording = useChunkedRecording({
    onTranscript,
    onError: (m) => Alert.alert('Recording error', m),
    transcribeUrl: `${API_URL}/transcribe`,
    chunkDurationMs: 8000,
    language: 'bn',
  });

  // ── Attach a previous report ─────────────────────────────────────────────────
  const runAttach = async (kind: 'camera' | 'gallery' | 'pdf') => {
    setAttaching(true);
    try {
      const res =
        kind === 'camera' ? await captureReportPhoto()
        : kind === 'gallery' ? await pickReportImage()
        : await pickReportPdf();
      if (res.extract) {
        setReport(res.extract);
        // Merge any newly discovered allergies / meds into the context fields.
        if (res.extract.allergies.length) {
          setAllergies((prev) => mergeCsv(prev, res.extract!.allergies));
        }
        if (res.extract.medications.length) {
          setCurrentMeds((prev) => mergeCsv(prev, res.extract!.medications));
        }
      }
    } finally {
      setAttaching(false);
    }
  };

  // ── Start consultation ───────────────────────────────────────────────────────
  const start = async () => {
    setCreating(true);
    const patient = { allergies: splitList(allergies), current_meds: splitList(currentMeds) };
    const s = await createSession(patient);
    setCreating(false);
    if (!s) {
      setErrorMsg('Could not reach the backend. Check the connection and try again.');
      setPhase('error');
      return;
    }
    await joinSession(s.id, 'doctor');
    setSession(s);
    setPhase('recording');
    if (withPatientPhone) {
      pollRef.current = setInterval(async () => {
        const cur = await getSession(s.id);
        if (cur) setSession(cur);
      }, 3000);
    }
  };

  // ── Analyze ──────────────────────────────────────────────────────────────────
  const analyze = async () => {
    await recording.stop();
    const sid = sidRef.current;
    if (!sid) return;
    if (heard.length === 0) {
      Alert.alert('Nothing recorded', 'Record at least a few seconds of the consultation first.');
      return;
    }
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase('analyzing');
    const patient = { allergies: splitList(allergies), current_meds: splitList(currentMeds) };
    const result = await analyzeSession(sid, {
      patient,
      age_months: parseInt(ageMonths, 10) || undefined,
    });
    if (!result) {
      Alert.alert('Analysis failed', 'The backend did not respond. Please try again.');
      setPhase('recording');
      return;
    }
    setAnalysis(result);
    setPrescription(draftPrescription(result));
    setPhase('results');
  };

  const newConsult = async () => {
    const sid = sidRef.current;
    await recording.stop();
    if (sid) await resetSession(sid);
    setHeard([]);
    setAnalysis(null);
    setPrescription('');
    setPhase('recording');
  };

  const share = () => {
    shareConsult({
      summary: analysis?.summary ?? null,
      prescription,
      transcript: heard.join(' '),
      patientName,
    });
  };

  const patientUrl = session ? `codoctor://join?s=${session.id}` : '';
  const imci = analysis?.analysis?.safety?.imci;
  const meds = analysis?.analysis?.safety?.medication ?? [];
  const differential = analysis?.analysis?.differential ?? [];
  const isDanger = !!imci && (imci.refer || imci.severity === 'critical' || imci.severity === 'severe');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopAppBar
        showLogo={false}
        title="Consultation"
        subtitle={session ? `Session ${session.id}` : 'New patient'}
        leftIcon={{ family: 'ion', name: 'chevron-back', onPress: () => { recording.stop(); navigation.goBack(); } }}
        badge={phase === 'recording' ? 'REC' : undefined}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <>
            <Text style={styles.h1}>Patient details</Text>
            <View style={styles.card}>
              <Field label="Name (optional)" value={patientName} onChange={setPatientName} placeholder="e.g. Child of Rahima" />
              <Field label="Age in months" value={ageMonths} onChange={setAgeMonths} placeholder="36" keyboardType="numeric" hint="36 = 3 years · IMCI covers 2 months–5 years" />
              <Field label="Known allergies" value={allergies} onChange={setAllergies} placeholder="e.g. Penicillin" hint="comma-separated" />
              <Field label="Current medicines" value={currentMeds} onChange={setCurrentMeds} placeholder="e.g. Salbutamol" hint="comma-separated" />
            </View>

            <Text style={styles.h1}>Previous reports (optional)</Text>
            <View style={styles.card}>
              <Text style={styles.help}>
                Photograph a paper prescription/lab report or pick a PDF — the AI
                reads it and factors the history into the assessment.
              </Text>
              <View style={styles.attachRow}>
                <AttachBtn icon="camera" label="Photo" onPress={() => runAttach('camera')} disabled={attaching} />
                <AttachBtn icon="image" label="Gallery" onPress={() => runAttach('gallery')} disabled={attaching} />
                <AttachBtn icon="document-text" label="PDF" onPress={() => runAttach('pdf')} disabled={attaching} />
              </View>
              {attaching && (
                <View style={styles.inlineRow}>
                  <ActivityIndicator size="small" color={colors.brand500} />
                  <Text style={styles.inlineText}>Reading the report…</Text>
                </View>
              )}
              {report && (
                <View style={styles.reportBox}>
                  <Text style={styles.reportTitle}>📄 From the report</Text>
                  {report.summary_bn ? <Text style={styles.reportBn}>{report.summary_bn}</Text> : null}
                  {report.summary_en ? <Text style={styles.reportEn}>{report.summary_en}</Text> : null}
                  <ChipLine label="Conditions" items={report.conditions} />
                  <ChipLine label="Medicines" items={report.medications} />
                  <ChipLine label="Allergies" items={report.allergies} />
                </View>
              )}
            </View>

            <View style={[styles.card, styles.switchRow]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Patient has a phone?</Text>
                <Text style={styles.switchHint}>
                  On → show a QR so their phone joins and adds a second mic. Off →
                  this phone records everything (field / no-phone mode).
                </Text>
              </View>
              <Switch value={withPatientPhone} onValueChange={setWithPatientPhone} />
            </View>

            <TouchableOpacity style={[styles.primaryBtn, creating && { opacity: 0.6 }]} onPress={start} disabled={creating}>
              {creating ? <ActivityIndicator color={colors.white} />
                : <><Ionicons name="mic" size={18} color={colors.white} /><Text style={styles.primaryBtnText}>Start consultation</Text></>}
            </TouchableOpacity>
          </>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <View style={styles.errCard}>
            <Text style={styles.errText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('setup')}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── RECORDING ── */}
        {(phase === 'recording' || phase === 'analyzing') && (
          <>
            {withPatientPhone && session && !session.devices.patient && (
              <View style={styles.card}>
                <Text style={styles.qrLabel}>Patient scans this in the Codoctor app → Patient</Text>
                <View style={styles.qrWrap}>
                  {patientUrl ? <QRCode value={patientUrl} size={150} color={colors.ink} backgroundColor={colors.white} /> : null}
                </View>
              </View>
            )}
            {withPatientPhone && session?.devices.patient && (
              <View style={styles.connectedBanner}>
                <Text style={styles.connectedText}>🟢 Patient phone connected — both mics active</Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.h2}>Record the conversation</Text>
              {phase === 'recording' && recording.state === 'idle' && (
                <TouchableOpacity style={styles.recBtn} onPress={() => recording.start()}>
                  <Ionicons name="mic" size={18} color={colors.white} />
                  <Text style={styles.recBtnText}>Start recording</Text>
                </TouchableOpacity>
              )}
              {phase === 'recording' && recording.state !== 'idle' && (
                <>
                  <View style={styles.recStatus}>
                    <Animated.View style={[styles.recDot, { opacity: dot }]} />
                    <Text style={styles.recStatusText}>
                      {recording.state === 'processing' ? 'Transcribing…' : 'Listening — speak clearly'}
                    </Text>
                  </View>
                  <TouchableOpacity style={[styles.recBtn, styles.recBtnStop]} onPress={() => recording.stop()}>
                    <Ionicons name="stop" size={18} color={colors.red600} />
                    <Text style={[styles.recBtnText, { color: colors.red600 }]}>Pause</Text>
                  </TouchableOpacity>
                </>
              )}
              {heard.length > 0 && phase === 'recording' && (
                <TouchableOpacity style={styles.primaryBtn} onPress={analyze}>
                  <Ionicons name="flask" size={18} color={colors.white} />
                  <Text style={styles.primaryBtnText}>Analyze &amp; finish</Text>
                </TouchableOpacity>
              )}
            </View>

            {heard.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>Transcript ({heard.length})</Text>
                {heard.map((t, i) => (
                  <Text key={i} style={styles.transcriptLine}>• {t}</Text>
                ))}
              </View>
            )}

            {phase === 'analyzing' && (
              <View style={[styles.card, styles.center]}>
                <ActivityIndicator size="large" color={colors.brand500} />
                <Text style={styles.h2}>Agents working…</Text>
                <Text style={styles.help}>Fuse → Scribe → Differential → Danger-Sign → Med-Safety → Critic</Text>
              </View>
            )}
          </>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && analysis && (
          <>
            {isDanger && imci && (
              <DangerAlertCard
                titleBn={analysis.summary?.conditionBn || imci.classification}
                titleEn={imci.classification}
                trigger={imci.reasons?.join('; ') || '—'}
                action={imci.action}
                citation={imci.citation ?? { source: 'WHO IMCI', ref: 'Cough or difficult breathing' }}
              />
            )}
            {meds.filter((m) => m.severity === 'critical').map((m, i) => (
              <MedSafetyCard
                key={i}
                drug={m.drug}
                titleBn={m.type === 'allergy' ? 'এই ওষুধ দেওয়া যাবে না — অ্যালার্জি' : 'ওষুধের সতর্কতা'}
                titleEn={m.type === 'allergy' ? 'Allergy contraindication' : 'Medication caution'}
                reason={m.reason}
                alternative={m.action ?? 'Choose a safer alternative per guideline.'}
                citation={m.citation ?? { source: 'National Formulary (BD)', ref: 'Contraindications & interactions' }}
              />
            ))}

            {differential.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>🔎 Consider (differential)</Text>
                {differential.map((d, i) => (
                  <View key={i} style={styles.diffRow}>
                    <Text style={styles.diffName}>{d.condition}</Text>
                    <Text style={styles.diffRationale}>{d.rationale}</Text>
                    {d.citation ? <CitationBadge source={d.citation.source} ref={d.citation.ref} /> : null}
                  </View>
                ))}
              </View>
            )}

            {/* Editable prescription */}
            <View style={styles.card}>
              <Text style={styles.h2}>💊 Prescription</Text>
              <Text style={styles.help}>
                Pre-filled with medicines you mentioned. Edit freely — one per
                line. Safety warnings above are checked against allergies & meds.
              </Text>
              <TextInput
                style={styles.rxInput}
                value={prescription}
                onChangeText={setPrescription}
                placeholder={'e.g.\nParacetamol syrup 5ml, three times daily\nRefer to hospital'}
                placeholderTextColor={colors.inkFaint}
                multiline
              />
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={share}>
              <Ionicons name="share-social" size={18} color={colors.white} />
              <Text style={styles.primaryBtnText}>Share record to patient</Text>
            </TouchableOpacity>
            <Text style={styles.shareHint}>Sends via WhatsApp, Telegram, SMS — whatever the patient uses.</Text>

            <TouchableOpacity style={styles.secondaryBtn} onPress={newConsult}>
              <Ionicons name="refresh" size={16} color={colors.inkSoft} />
              <Text style={styles.secondaryBtnText}>New consultation</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
function mergeCsv(existing: string, add: string[]): string {
  const have = new Set(existing.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const merged = existing.split(',').map((s) => s.trim()).filter(Boolean);
  add.forEach((a) => { if (a && !have.has(a.toLowerCase())) { merged.push(a); have.add(a.toLowerCase()); } });
  return merged.join(', ');
}

function draftPrescription(result: SessionAnalyzeResult): string {
  const enc = (result.extracted_encounter ?? {}) as { proposed_meds?: string[] };
  const spoken = Array.isArray(enc.proposed_meds) ? enc.proposed_meds : [];
  const lines = [...spoken];
  const imci = result.analysis?.safety?.imci;
  if (imci?.refer) lines.push('Refer urgently to hospital');
  return lines.join('\n');
}

// ── small components ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, hint, keyboardType }: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string; hint?: string;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        keyboardType={keyboardType ?? 'default'}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function AttachBtn({ icon, label, onPress, disabled }: {
  icon: string; label: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.attachBtn, disabled && { opacity: 0.5 }]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon as any} size={20} color={colors.brand600} />
      <Text style={styles.attachLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ChipLine({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.chipLine}>
      <Text style={styles.chipLineLabel}>{label}</Text>
      <View style={styles.chipWrap}>
        {items.map((it, i) => (
          <View key={i} style={styles.chip}><Text style={styles.chipText}>{it}</Text></View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: 48, gap: spacing.md },
  center: { alignItems: 'center', gap: spacing.sm },

  h1: { fontSize: fontSize.md, fontWeight: '800', color: colors.ink, marginTop: spacing.xs },
  h2: { fontSize: fontSize.md, fontWeight: '700', color: colors.ink },
  help: { fontSize: fontSize.xs, color: colors.inkMuted, lineHeight: 17 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.slate200, padding: spacing.base, gap: spacing.md, ...shadow.sm,
  },

  field: { gap: 5 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.inkSoft },
  fieldHint: { fontSize: 11, color: colors.inkFaint },
  input: {
    backgroundColor: colors.paper, borderRadius: 10, borderWidth: 1, borderColor: colors.slate200,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: fontSize.base, color: colors.ink,
  },

  attachRow: { flexDirection: 'row', gap: spacing.sm },
  attachBtn: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.brand50, borderWidth: 1, borderColor: colors.brand200,
  },
  attachLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.brand600 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inlineText: { fontSize: fontSize.sm, color: colors.inkMuted },

  reportBox: {
    backgroundColor: colors.slate50, borderRadius: 12, borderWidth: 1, borderColor: colors.slate200,
    padding: spacing.md, gap: 6,
  },
  reportTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  reportBn: { fontSize: fontSize.sm, color: colors.ink, lineHeight: 20 },
  reportEn: { fontSize: fontSize.xs, color: colors.inkMuted, fontStyle: 'italic' },
  chipLine: { marginTop: 4, gap: 4 },
  chipLineLabel: { fontSize: 11, fontWeight: '700', color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  switchHint: { fontSize: 11, color: colors.inkMuted, lineHeight: 15, marginTop: 2 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.brand500, borderRadius: 14, paddingVertical: 14, ...shadow.sm,
  },
  primaryBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.white, borderRadius: 14, paddingVertical: 13, borderWidth: 1, borderColor: colors.slate300,
  },
  secondaryBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.inkSoft },

  qrLabel: { fontSize: fontSize.xs, color: colors.inkMuted, textAlign: 'center' },
  qrWrap: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: spacing.base },
  connectedBanner: { backgroundColor: colors.emerald50, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.emerald500 },
  connectedText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '600', textAlign: 'center' },

  recBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.brand500, borderRadius: 14, paddingVertical: 14,
  },
  recBtnStop: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.red200 },
  recBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  recStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.red500 },
  recStatusText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '500' },
  transcriptLine: { fontSize: fontSize.sm, color: colors.inkSoft, lineHeight: 20 },

  diffRow: { gap: 4, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.slate100 },
  diffName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  diffRationale: { fontSize: fontSize.xs, color: colors.inkMuted, lineHeight: 17 },

  rxInput: {
    backgroundColor: colors.paper, borderRadius: 12, borderWidth: 1, borderColor: colors.slate200,
    padding: 12, fontSize: fontSize.base, color: colors.ink, minHeight: 110, textAlignVertical: 'top',
  },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.emerald600 ?? colors.brand500, borderRadius: 14, paddingVertical: 15, ...shadow.sm,
  },
  shareHint: { fontSize: 11, color: colors.inkFaint, textAlign: 'center', marginTop: -spacing.xs },

  errCard: { backgroundColor: colors.red50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.red200, padding: spacing.base, gap: spacing.md },
  errText: { fontSize: fontSize.sm, color: colors.red700, lineHeight: 20 },
});
