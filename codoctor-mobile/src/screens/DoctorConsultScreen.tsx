/**
 * DoctorConsultScreen — the field consultation flow.
 *
 * Two modes:
 *   ONLINE  → record → live "ask this next" prompts → AI analysis (RAG + agents)
 *   OFFLINE → manual IMCI entry → on-device deterministic engines (no signal needed)
 * Both end in cited alerts, a weight-based dose calculator, an editable
 * prescription, and a Bangla record shared to the patient.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Animated, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';
import { DangerAlertCard, MedSafetyCard } from '../components/AlertCard';
import { CitationBadge } from '../components/CitationBadge';
import RrCounter from '../components/RrCounter';
import TopAppBar from '../components/TopAppBar';
import {
  createSession, joinSession, getSession, analyzeSession, resetSession,
  warmBackend, appendTranscript, livePrompts, reconcileMeds,
  type SessionState, type SessionAnalyzeResult, type ReportExtract,
  type ImciResult, type MedFinding, type DifferentialItem, type PatientSummary,
  type MissingDatum, type LivePrompts, type ReconcileResult,
} from '../lib/api';
import { classifyAri, checkMedication, dose, offlineSummary } from '../lib/clinical';
import { useNativeDictation } from '../lib/useNativeDictation';
import { shareConsult } from '../lib/share';
import { captureReportPhoto, pickReportImage, pickReportPdf } from '../lib/pickReport';
import type { RootStackParamList } from '../../App';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Doctor'> };
type Phase = 'setup' | 'recording' | 'analyzing' | 'results' | 'error';

interface ConsultView {
  imci: ImciResult;
  meds: MedFinding[];
  differential: DifferentialItem[];
  summary: PatientSummary | null;
  confidence?: string;
  missing: MissingDatum[];
  offline: boolean;
}

const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const rxLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const rxDrugs = (s: string) => rxLines(s).map((l) => l.split(/[\s,]+/)[0]).filter(Boolean);

export default function DoctorConsultScreen({ navigation }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [offline, setOffline] = useState(false);

  // patient context
  const [ageMonths, setAgeMonths] = useState('36');
  const [patientName, setPatientName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [withPatientPhone, setWithPatientPhone] = useState(false);
  const [report, setReport] = useState<ReportExtract | null>(null);
  const [attaching, setAttaching] = useState(false);

  // RR tool
  const [rrModal, setRrModal] = useState(false);
  const [measuredRr, setMeasuredRr] = useState<number | null>(null);

  // offline clinical findings
  const [chestIndrawing, setChestIndrawing] = useState(false);
  const [stridor, setStridor] = useState(false);
  const [anyDanger, setAnyDanger] = useState(false);

  // session / online
  const [session, setSession] = useState<SessionState | null>(null);
  const [creating, setCreating] = useState(false);
  const [heard, setHeard] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<SessionAnalyzeResult | null>(null);
  const [offlineImci, setOfflineImci] = useState<ImciResult | null>(null);
  const [prompts, setPrompts] = useState<LivePrompts | null>(null);
  const [reconcile, setReconcile] = useState<ReconcileResult | null>(null);
  const [prescription, setPrescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const sidRef = useRef<string | null>(null);
  sidRef.current = session?.id ?? null;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dot = useRef(new Animated.Value(1)).current;
  const age = parseInt(ageMonths, 10) || 36;
  const weight = parseFloat(weightKg) || undefined;

  useEffect(() => {
    warmBackend();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (phase !== 'recording') { dot.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(dot, { toValue: 0.2, duration: 550, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // ── #2 live "ask this next" prompts (online, while recording) ──────────────
  useEffect(() => {
    if (phase !== 'recording' || offline || heard.length === 0) return;
    let stop = false;
    const tick = async () => {
      const p = await livePrompts(heard.join(' '), age, splitList(allergies), splitList(currentMeds));
      if (!stop && p) setPrompts(p);
    };
    void tick();
    const id = setInterval(tick, 7000);
    return () => { stop = true; clearInterval(id); };
  }, [phase, offline, heard.length]);

  // ── recording ──────────────────────────────────────────────────────────────
  const onTranscript = useCallback(async (text: string, conf: number) => {
    const sid = sidRef.current;
    setHeard((h) => [...h, text]);
    if (sid) await appendTranscript(sid, 'doctor', text, conf);
  }, []);

  const recording = useNativeDictation({
    onTranscript,
    onError: (m) => Alert.alert('Recording error', m),
    language: 'bn-BD',
    contextualStrings: ['নিউমোনিয়া', 'শ্বাসকষ্ট', 'জ্বর', 'কাশি', 'অ্যামোক্সিসিলিন', 'প্যারাসিটামল'],
  });

  // ── attach previous report ───────────────────────────────────────────────────
  const runAttach = async (kind: 'camera' | 'gallery' | 'pdf') => {
    setAttaching(true);
    try {
      const res = kind === 'camera' ? await captureReportPhoto()
        : kind === 'gallery' ? await pickReportImage() : await pickReportPdf();
      if (res.extract) {
        setReport(res.extract);
        if (res.extract.allergies.length) setAllergies((p) => mergeCsv(p, res.extract!.allergies));
        if (res.extract.medications.length) setCurrentMeds((p) => mergeCsv(p, res.extract!.medications));
      }
    } finally { setAttaching(false); }
  };

  // ── start (online) / assess (offline) ────────────────────────────────────────
  const start = async () => {
    setCreating(true);
    const patient = { allergies: splitList(allergies), current_meds: splitList(currentMeds) };
    const s = await createSession(patient);
    setCreating(false);
    if (!s) {
      Alert.alert(
        'No connection',
        'Could not reach the server. Switch on “Offline mode” to assess on this device without a signal.'
      );
      return;
    }
    await joinSession(s.id, 'doctor');
    setSession(s);
    setPhase('recording');
    if (withPatientPhone) {
      pollRef.current = setInterval(async () => {
        const cur = await getSession(s.id); if (cur) setSession(cur);
      }, 3000);
    }
  };

  const assessOffline = () => {
    const imci = classifyAri({
      ageMonths: age, respiratoryRate: measuredRr, chestIndrawing, stridor,
      generalDangerSigns: anyDanger ? ['lethargic_or_unconscious'] : [],
    });
    setOfflineImci(imci);
    setPhase('results');
  };

  const analyze = async () => {
    await recording.stop();
    const sid = sidRef.current;
    if (!sid) return;
    if (heard.length === 0) { Alert.alert('Nothing recorded', 'Record a few seconds first.'); return; }
    if (pollRef.current) clearInterval(pollRef.current);
    // feed a manually measured RR into the analysis
    if (measuredRr != null) await appendTranscript(sid, 'doctor', `respiratory rate ${measuredRr}`, 0.99);
    setPhase('analyzing');
    const patient = { allergies: splitList(allergies), current_meds: splitList(currentMeds) };
    const result = await analyzeSession(sid, { patient, age_months: age });
    if (!result) { Alert.alert('Analysis failed', 'Please try again.'); setPhase('recording'); return; }
    setAnalysis(result);
    setPrescription(draftPrescription(result));
    setPhase('results');
  };

  const newConsult = async () => {
    const sid = sidRef.current;
    await recording.stop();
    if (sid) await resetSession(sid);
    setHeard([]); setAnalysis(null); setOfflineImci(null); setPrompts(null);
    setReconcile(null); setPrescription('');
    setPhase(offline ? 'setup' : 'recording');
  };

  // ── unified view ─────────────────────────────────────────────────────────────
  const view: ConsultView | null = useMemo(() => {
    if (analysis?.analysis?.safety?.imci) {
      const a = analysis.analysis;
      return {
        imci: a.safety.imci!, meds: a.safety.medication ?? [], differential: a.differential ?? [],
        summary: analysis.summary, confidence: a.confidence, missing: a.missing_data ?? [], offline: false,
      };
    }
    if (offlineImci) {
      // offline med-safety runs live off the editable prescription
      const meds = checkMedication(rxDrugs(prescription), splitList(allergies), splitList(currentMeds));
      const crit = meds.filter((m) => m.severity === 'critical');
      const conf = offlineImci.refer || measuredRr != null ? 'high' : 'low';
      return {
        imci: offlineImci, meds, differential: [],
        summary: offlineSummary(offlineImci, crit), confidence: conf, missing: [], offline: true,
      };
    }
    return null;
  }, [analysis, offlineImci, prescription, allergies, currentMeds, measuredRr]);

  // ── #4 reconciliation (online, when a report was attached) ────────────────────
  useEffect(() => {
    if (phase !== 'results' || offline) return;
    const past = report?.medications ?? [];
    if (!past.length && !splitList(currentMeds).length) return;
    let stop = false;
    reconcileMeds({
      proposed: rxDrugs(prescription), allergies: splitList(allergies),
      current_meds: splitList(currentMeds), past_meds: past,
    }).then((r) => { if (!stop && r) setReconcile(r); });
    return () => { stop = true; };
  }, [phase, prescription]);

  const share = () => shareConsult({
    summary: view?.summary ?? null, prescription, transcript: heard.join(' '), patientName,
  });

  const patientUrl = session ? `codoctor://join?s=${session.id}` : '';
  const doseCards = weight ? rxDrugs(prescription).map((d) => dose(d, weight)).filter((r) => r.known) : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopAppBar
        showLogo={false}
        title="Consultation"
        subtitle={offline ? 'Offline mode' : session ? `Session ${session.id}` : 'New patient'}
        leftIcon={{ family: 'ion', name: 'chevron-back', onPress: () => { recording.stop(); navigation.goBack(); } }}
        badge={phase === 'recording' ? 'REC' : offline && phase !== 'setup' ? 'OFFLINE' : undefined}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <>
            <View style={[styles.card, styles.switchRow]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Offline mode (no signal)</Text>
                <Text style={styles.switchHint}>For flood/field visits. Enter findings by hand; danger-sign & drug checks run on this phone.</Text>
              </View>
              <Switch value={offline} onValueChange={setOffline} />
            </View>

            <Text style={styles.h1}>Patient details</Text>
            <View style={styles.card}>
              <Field label="Name (optional)" value={patientName} onChange={setPatientName} placeholder="e.g. Child of Rahima" />
              <View style={styles.row2}>
                <View style={{ flex: 1 }}><Field label="Age (months)" value={ageMonths} onChange={setAgeMonths} keyboardType="numeric" hint="36 = 3 yrs" /></View>
                <View style={{ flex: 1 }}><Field label="Weight (kg)" value={weightKg} onChange={setWeightKg} keyboardType="numeric" hint="for dosing" /></View>
              </View>
              <Field label="Known allergies" value={allergies} onChange={setAllergies} placeholder="Penicillin" hint="comma-separated" />
              <Field label="Current medicines" value={currentMeds} onChange={setCurrentMeds} placeholder="Salbutamol" hint="comma-separated" />
            </View>

            {/* RR tool */}
            <TouchableOpacity style={styles.card} onPress={() => setRrModal(true)} activeOpacity={0.85}>
              <View style={styles.rrRow}>
                <Ionicons name="fitness" size={22} color={colors.brand600} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.h2}>Measure breathing rate</Text>
                  <Text style={styles.help}>Tap-count for 60s — feeds the IMCI danger-sign check.</Text>
                </View>
                <Text style={styles.rrVal}>{measuredRr != null ? `${measuredRr}/min` : 'Measure'}</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.h1}>Previous reports (optional)</Text>
            <View style={styles.card}>
              <Text style={styles.help}>Photograph an old prescription/lab report or pick a PDF — the AI reads it into the history. (Needs signal.)</Text>
              <View style={styles.attachRow}>
                <AttachBtn icon="camera" label="Photo" onPress={() => runAttach('camera')} disabled={attaching || offline} />
                <AttachBtn icon="image" label="Gallery" onPress={() => runAttach('gallery')} disabled={attaching || offline} />
                <AttachBtn icon="document-text" label="PDF" onPress={() => runAttach('pdf')} disabled={attaching || offline} />
              </View>
              {attaching && <View style={styles.inlineRow}><ActivityIndicator size="small" color={colors.brand500} /><Text style={styles.inlineText}>Reading the report…</Text></View>}
              {report && (
                <View style={styles.reportBox}>
                  <Text style={styles.reportTitle}>📄 From the report</Text>
                  {report.summary_bn ? <Text style={styles.reportBn}>{report.summary_bn}</Text> : null}
                  <ChipLine label="Conditions" items={report.conditions} />
                  <ChipLine label="Medicines" items={report.medications} />
                  <ChipLine label="Allergies" items={report.allergies} />
                </View>
              )}
            </View>

            {/* Offline clinical findings */}
            {offline && (
              <>
                <Text style={styles.h1}>Examination</Text>
                <View style={styles.card}>
                  <Toggle label="Lower chest-wall indrawing" value={chestIndrawing} onChange={setChestIndrawing} />
                  <Toggle label="Stridor (calm child)" value={stridor} onChange={setStridor} />
                  <Toggle label="Any general danger sign (not drinking, vomiting all, convulsions, unconscious)" value={anyDanger} onChange={setAnyDanger} />
                </View>
              </>
            )}

            {!offline && (
              <View style={[styles.card, styles.switchRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Patient has a phone?</Text>
                  <Text style={styles.switchHint}>On → show a QR so their phone joins as a second mic.</Text>
                </View>
                <Switch value={withPatientPhone} onValueChange={setWithPatientPhone} />
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, creating && { opacity: 0.6 }]}
              onPress={offline ? assessOffline : start}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color={colors.white} /> : (
                <>
                  <Ionicons name={offline ? 'shield-checkmark' : 'mic'} size={18} color={colors.white} />
                  <Text style={styles.primaryBtnText}>{offline ? 'Assess on device' : 'Start consultation'}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── RECORDING (online) ── */}
        {(phase === 'recording' || phase === 'analyzing') && (
          <>
            {withPatientPhone && session && !session.devices.patient && (
              <View style={styles.card}>
                <Text style={styles.qrLabel}>Patient scans in the Codoctor app → Patient</Text>
                <View style={styles.qrWrap}>{patientUrl ? <QRCode value={patientUrl} size={150} color={colors.ink} backgroundColor={colors.white} /> : null}</View>
              </View>
            )}

            {/* #2 live prompts */}
            {phase === 'recording' && prompts && (prompts.red_flags.length > 0 || prompts.ask_these.length > 0) && (
              <View style={styles.promptCard}>
                <Text style={styles.promptHeader}>🧠 Co-pilot</Text>
                {prompts.red_flags.map((r, i) => (
                  <Text key={`r${i}`} style={styles.promptRed}>🔴 {r.title} — {r.detail}</Text>
                ))}
                {prompts.ask_these.map((q, i) => (
                  <Text key={`q${i}`} style={styles.promptAsk}>❓ {q.bn}  ·  {q.en}</Text>
                ))}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.h2}>Record the conversation</Text>
              {phase === 'recording' && recording.state === 'idle' && (
                <TouchableOpacity style={styles.recBtn} onPress={() => recording.start()}>
                  <Ionicons name="mic" size={18} color={colors.white} /><Text style={styles.recBtnText}>Start recording</Text>
                </TouchableOpacity>
              )}
              {phase === 'recording' && recording.state !== 'idle' && (
                <>
                  <View style={styles.recStatus}>
                    <Animated.View style={[styles.recDot, { opacity: dot }]} />
                    <Text style={styles.recStatusText}>{recording.state === 'processing' ? 'Transcribing…' : 'Listening — speak clearly'}</Text>
                  </View>
                  <TouchableOpacity style={[styles.recBtn, styles.recBtnStop]} onPress={() => recording.stop()}>
                    <Ionicons name="stop" size={18} color={colors.red600} /><Text style={[styles.recBtnText, { color: colors.red600 }]}>Pause</Text>
                  </TouchableOpacity>
                </>
              )}
              {heard.length > 0 && phase === 'recording' && (
                <TouchableOpacity style={styles.primaryBtn} onPress={analyze}>
                  <Ionicons name="flask" size={18} color={colors.white} /><Text style={styles.primaryBtnText}>Analyze &amp; finish</Text>
                </TouchableOpacity>
              )}
            </View>

            {heard.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>Transcript ({heard.length})</Text>
                {heard.map((t, i) => <Text key={i} style={styles.transcriptLine}>• {t}</Text>)}
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

        {/* ── RESULTS (shared) ── */}
        {phase === 'results' && view && (
          <>
            {/* #6 confidence */}
            {view.confidence && (
              <View style={[styles.confChip, confStyle(view.confidence)]}>
                <Text style={styles.confText}>Assessment confidence: {view.confidence.toUpperCase()}</Text>
              </View>
            )}
            {view.missing.length > 0 && (
              <View style={styles.missingCard}>
                <Text style={styles.missingTitle}>To be more sure, still recommended:</Text>
                {view.missing.map((m, i) => <Text key={i} style={styles.missingLine}>• {m.bn}  ·  {m.en}</Text>)}
              </View>
            )}

            {(view.imci.refer || view.imci.severity === 'critical' || view.imci.severity === 'severe') && (
              <DangerAlertCard
                titleBn={view.summary?.conditionBn || view.imci.classification}
                titleEn={view.imci.classification}
                trigger={view.imci.reasons?.join('; ') || '—'}
                action={view.imci.action}
                citation={view.imci.citation ?? { source: 'WHO IMCI', ref: 'Cough or difficult breathing' }}
              />
            )}
            {view.meds.filter((m) => m.severity === 'critical').map((m, i) => (
              <MedSafetyCard key={i} drug={m.drug}
                titleBn={m.type === 'allergy' ? 'এই ওষুধ দেওয়া যাবে না — অ্যালার্জি' : 'ওষুধের সতর্কতা'}
                titleEn={m.type === 'allergy' ? 'Allergy contraindication' : 'Medication caution'}
                reason={m.reason} alternative={m.action ?? 'Choose a safer alternative.'}
                citation={m.citation ?? { source: 'National Formulary (BD)', ref: 'Contraindications' }} />
            ))}

            {/* #4 reconciliation notes */}
            {reconcile && reconcile.notes.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>🧾 Reconciliation with history</Text>
                {reconcile.notes.map((n, i) => (
                  <View key={i} style={styles.noteRow}>
                    <Text style={styles.noteText}>{n.type === 'stewardship' ? '💊 ' : '↩️ '}{n.reason}</Text>
                    {n.citation ? <CitationBadge source={n.citation.source} ref={n.citation.ref} /> : null}
                  </View>
                ))}
              </View>
            )}

            {view.differential.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>🔎 Consider (differential)</Text>
                {view.differential.map((d, i) => (
                  <View key={i} style={styles.diffRow}>
                    <Text style={styles.diffName}>{d.condition}</Text>
                    <Text style={styles.diffRationale}>{d.rationale}</Text>
                    {d.citation ? <CitationBadge source={d.citation.source} ref={d.citation.ref} /> : null}
                  </View>
                ))}
              </View>
            )}

            {/* prescription */}
            <View style={styles.card}>
              <Text style={styles.h2}>💊 Prescription</Text>
              <Text style={styles.help}>{view.offline ? 'Type each medicine — drug safety runs on-device as you type.' : 'Pre-filled with medicines you mentioned. Edit freely — one per line.'}</Text>
              <TextInput style={styles.rxInput} value={prescription} onChangeText={setPrescription}
                placeholder={'e.g.\nParacetamol syrup 5ml, three times daily'} placeholderTextColor={colors.inkFaint} multiline />
            </View>

            {/* #5 dosing */}
            {doseCards.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>⚖️ Weight-based dose ({weight} kg)</Text>
                {doseCards.map((d, i) => (
                  <View key={i} style={styles.doseRow}>
                    <Text style={styles.doseName}>{cap(d.drug)}</Text>
                    {d.needWeight ? <Text style={styles.doseInfo}>Enter weight above.</Text> : (
                      <Text style={styles.doseInfo}>
                        {d.perDoseMg ? `${d.perDoseMg[0]}–${d.perDoseMg[1]} mg/dose · ${d.frequencyPerDay}×/day` : ''} {d.note}
                      </Text>
                    )}
                  </View>
                ))}
                <Text style={styles.doseCite}>WHO Pocket Book / BNF for Children — advisory; confirm before giving.</Text>
              </View>
            )}
            {!weight && rxDrugs(prescription).length > 0 && (
              <Text style={styles.doseHint}>Enter the child’s weight in setup to compute doses.</Text>
            )}

            <TouchableOpacity style={styles.shareBtn} onPress={share}>
              <Ionicons name="share-social" size={18} color={colors.white} /><Text style={styles.primaryBtnText}>Share record to patient</Text>
            </TouchableOpacity>
            <Text style={styles.shareHint}>Sends via WhatsApp, Telegram, SMS — whatever the patient uses.</Text>

            <TouchableOpacity style={styles.secondaryBtn} onPress={newConsult}>
              <Ionicons name="refresh" size={16} color={colors.inkSoft} /><Text style={styles.secondaryBtnText}>New consultation</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <RrCounter visible={rrModal} onClose={() => setRrModal(false)} onResult={setMeasuredRr} />
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
  if (result.analysis?.safety?.imci?.refer) lines.push('Refer urgently to hospital');
  return lines.join('\n');
}
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function confStyle(c: string) {
  if (c === 'high') return { backgroundColor: colors.emerald50, borderColor: colors.emerald500 };
  if (c === 'low' || c === 'insufficient') return { backgroundColor: colors.amber50, borderColor: colors.amber500 };
  return { backgroundColor: colors.slate50, borderColor: colors.slate300 };
}

// ── small components ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, hint, keyboardType }: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string; hint?: string; keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={colors.inkFaint} keyboardType={keyboardType ?? 'default'} />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
function AttachBtn({ icon, label, onPress, disabled }: { icon: string; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.attachBtn, disabled && { opacity: 0.4 }]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon as any} size={20} color={colors.brand600} /><Text style={styles.attachLabel}>{label}</Text>
    </TouchableOpacity>
  );
}
function ChipLine({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.chipLine}>
      <Text style={styles.chipLineLabel}>{label}</Text>
      <View style={styles.chipWrap}>{items.map((it, i) => <View key={i} style={styles.chip}><Text style={styles.chipText}>{it}</Text></View>)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: 48, gap: spacing.md },
  center: { alignItems: 'center', gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.md },

  h1: { fontSize: fontSize.md, fontWeight: '800', color: colors.ink, marginTop: spacing.xs },
  h2: { fontSize: fontSize.md, fontWeight: '700', color: colors.ink },
  help: { fontSize: fontSize.xs, color: colors.inkMuted, lineHeight: 17 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.slate200, padding: spacing.base, gap: spacing.md, ...shadow.sm },

  field: { gap: 5 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.inkSoft },
  fieldHint: { fontSize: 11, color: colors.inkFaint },
  input: { backgroundColor: colors.paper, borderRadius: 10, borderWidth: 1, borderColor: colors.slate200, paddingHorizontal: 12, paddingVertical: 10, fontSize: fontSize.base, color: colors.ink },

  rrRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rrVal: { fontSize: fontSize.base, fontWeight: '800', color: colors.brand600 },

  attachRow: { flexDirection: 'row', gap: spacing.sm },
  attachBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.brand50, borderWidth: 1, borderColor: colors.brand200 },
  attachLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.brand600 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inlineText: { fontSize: fontSize.sm, color: colors.inkMuted },

  reportBox: { backgroundColor: colors.slate50, borderRadius: 12, borderWidth: 1, borderColor: colors.slate200, padding: spacing.md, gap: 6 },
  reportTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  reportBn: { fontSize: fontSize.sm, color: colors.ink, lineHeight: 20 },
  chipLine: { marginTop: 4, gap: 4 },
  chipLineLabel: { fontSize: 11, fontWeight: '700', color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  switchHint: { fontSize: 11, color: colors.inkMuted, lineHeight: 15, marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  toggleLabel: { flex: 1, fontSize: fontSize.sm, color: colors.ink },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand500, borderRadius: 14, paddingVertical: 14, ...shadow.sm },
  primaryBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 14, paddingVertical: 13, borderWidth: 1, borderColor: colors.slate300 },
  secondaryBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.inkSoft },

  qrLabel: { fontSize: fontSize.xs, color: colors.inkMuted, textAlign: 'center' },
  qrWrap: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: spacing.base },

  promptCard: { backgroundColor: colors.indigo50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.indigo100, padding: spacing.base, gap: 6 },
  promptHeader: { fontSize: fontSize.xs, fontWeight: '800', color: colors.indigo600, textTransform: 'uppercase', letterSpacing: 0.6 },
  promptRed: { fontSize: fontSize.sm, color: colors.red700, fontWeight: '600', lineHeight: 19 },
  promptAsk: { fontSize: fontSize.sm, color: colors.ink, lineHeight: 19 },

  recBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand500, borderRadius: 14, paddingVertical: 14 },
  recBtnStop: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.red200 },
  recBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  recStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.red500 },
  recStatusText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '500' },
  transcriptLine: { fontSize: fontSize.sm, color: colors.inkSoft, lineHeight: 20 },

  confChip: { alignSelf: 'flex-start', borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  confText: { fontSize: fontSize.xs, fontWeight: '800', color: colors.ink, letterSpacing: 0.3 },
  missingCard: { backgroundColor: colors.amber50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.amber100, padding: spacing.base, gap: 4 },
  missingTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.amber700 },
  missingLine: { fontSize: fontSize.sm, color: colors.inkSoft, lineHeight: 19 },

  noteRow: { gap: 4, paddingVertical: 4 },
  noteText: { fontSize: fontSize.sm, color: colors.inkSoft, lineHeight: 19 },

  diffRow: { gap: 4, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.slate100 },
  diffName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  diffRationale: { fontSize: fontSize.xs, color: colors.inkMuted, lineHeight: 17 },

  rxInput: { backgroundColor: colors.paper, borderRadius: 12, borderWidth: 1, borderColor: colors.slate200, padding: 12, fontSize: fontSize.base, color: colors.ink, minHeight: 110, textAlignVertical: 'top' },

  doseRow: { gap: 2, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.slate100 },
  doseName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  doseInfo: { fontSize: fontSize.xs, color: colors.inkSoft, lineHeight: 17 },
  doseCite: { fontSize: 11, color: colors.inkFaint, marginTop: 4 },
  doseHint: { fontSize: fontSize.xs, color: colors.inkMuted, textAlign: 'center' },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.emerald600, borderRadius: 14, paddingVertical: 15, ...shadow.sm },
  shareHint: { fontSize: 11, color: colors.inkFaint, textAlign: 'center', marginTop: -spacing.xs },
});
