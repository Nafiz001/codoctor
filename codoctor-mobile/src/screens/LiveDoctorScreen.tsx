/**
 * LiveDoctorScreen — the real two-phone consultation cockpit.
 *
 * Flow:
 *  1. Create session → show QR for patient to scan
 *  2. Both devices join; doctor starts recording
 *  3. Every 8s a chunk is sent to /transcribe → text appended to session
 *  4. Doctor taps "Analyze & Finish" → backend fuses both transcripts → analysis
 *  5. Danger / med-safety alerts appear; doctor confirms SOAP → navigates to Summary
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';
import { PATIENT, SOAP_NOTE, DANGER_ALERT, MEDSAFETY_ALERT } from '../lib/demo-data';
import { DangerAlertCard, MedSafetyCard } from '../components/AlertCard';
import { SoapNote } from '../components/SoapNote';
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
  type PatientSummary,
} from '../lib/api';
import { useChunkedRecording } from '../lib/useRecording';
import type { RootStackParamList } from '../../App';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'LiveDoctor'>;
};

// Default patient context (doctor edits this in production; for demo use seeded values)
const DEFAULT_PATIENT = {
  allergies: PATIENT.allergies,
  current_meds: PATIENT.meds,
};

interface UtteranceItem {
  id: number;
  role: 'doctor' | 'patient';
  text: string;
  conf: number;
  ts: number;
}

export default function LiveDoctorScreen({ navigation }: Props) {
  const [phase, setPhase] = useState<
    'setup' | 'session' | 'recording' | 'analyzing' | 'results' | 'error'
  >('setup');
  const [session, setSession] = useState<SessionState | null>(null);
  const [utterances, setUtterances] = useState<UtteranceItem[]>([]);
  const [analysis, setAnalysis] = useState<SessionAnalyzeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [proposedMed, setProposedMed] = useState('Amoxicillin');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceIdRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const sidRef = useRef<string | null>(null);

  sidRef.current = session?.id ?? null;

  // Warm the backend immediately so the user doesn't wait on first tap
  useEffect(() => {
    warmBackend();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Poll session state ────────────────────────────────────────────────────
  const startPolling = useCallback((sid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const s = await getSession(sid);
      if (s) setSession(s);
    }, 3000);
  }, []);

  // ── Create session ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    const s = await createSession(DEFAULT_PATIENT);
    setCreating(false);
    if (!s) {
      setErrorMsg(
        'Cannot reach the backend. Check your connection or try the scripted demo.'
      );
      setPhase('error');
      return;
    }
    // Doctor joins as doctor immediately
    await joinSession(s.id, 'doctor');
    setSession(s);
    setPhase('session');
    startPolling(s.id);
  };

  // ── Recording callback: transcribed text received ─────────────────────────
  const onTranscript = useCallback(async (text: string, conf: number) => {
    const sid = sidRef.current;
    if (!sid) return;
    utteranceIdRef.current += 1;
    const item: UtteranceItem = {
      id: utteranceIdRef.current,
      role: 'doctor',
      text,
      conf,
      ts: Date.now(),
    };
    setUtterances((u) => [...u, item]);
    await appendTranscript(sid, 'doctor', text, conf);
    // Auto-scroll to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const onRecordingError = useCallback((msg: string) => {
    Alert.alert('Recording error', msg);
  }, []);

  const recording = useChunkedRecording({
    onTranscript,
    onError: onRecordingError,
    transcribeUrl: `${API_URL}/transcribe`,
    chunkDurationMs: 8000,
    language: 'bn',
  });

  const handleStartRecording = async () => {
    setPhase('recording');
    await recording.start();
    // start() sets state to 'error' internally if permission denied
  };

  const handleStopRecording = async () => {
    await recording.stop();
    setPhase('session');
  };

  // ── Analyze ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    await recording.stop();
    const sid = sidRef.current;
    if (!sid) return;
    if (utterances.length === 0) {
      Alert.alert(
        'Nothing to analyze',
        'No speech was captured yet. Record at least one utterance first, or use the Demo mode on the Home screen.'
      );
      return;
    }
    setPhase('analyzing');
    if (pollRef.current) clearInterval(pollRef.current);

    const result = await analyzeSession(sid, {
      patient: DEFAULT_PATIENT,
      age_months: 36, // 3 years (matches the seeded patient)
      proposed_meds: proposedMed ? [proposedMed] : [],
    });

    if (!result) {
      Alert.alert('Analysis failed', 'The backend did not respond. Please try again.');
      setPhase('recording');
      return;
    }
    setAnalysis(result);
    setPhase('results');
  };

  // ── Restart ───────────────────────────────────────────────────────────────
  const handleRestart = async () => {
    const sid = sidRef.current;
    await recording.stop();
    if (sid) await resetSession(sid);
    setUtterances([]);
    setAnalysis(null);
    setPhase('session');
    if (sid) startPolling(sid);
  };

  // ── Confirm & navigate to patient summary ─────────────────────────────────
  const handleConfirm = () => {
    const summary = analysis?.summary;
    if (summary) {
      navigation.navigate('Summary', { summary: summary as PatientSummary });
    }
  };

  // ── Patient URL for QR ────────────────────────────────────────────────────
  const patientUrl = session
    ? `https://codoctor.vercel.app/patient?s=${session.id}`
    : '';

  // ── Pulsing recording dot ─────────────────────────────────────────────────
  const dotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== 'recording') { dotOpacity.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  const hasDanger =
    (analysis?.analysis?.safety?.imci?.refer) ||
    (analysis?.analysis?.safety?.imci?.severity === 'severe');
  const hasMedBlock = (analysis?.analysis?.safety?.medication ?? []).some(
    (m: { severity: string }) => m.severity === 'critical'
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopAppBar
        showLogo={false}
        title="Live Session"
        subtitle={session ? `ID: ${session.id}` : 'Setting up…'}
        leftIcon={{
          family: 'ion',
          name: 'chevron-back',
          onPress: () => {
            recording.stop();
            navigation.goBack();
          },
        }}
        badge={phase === 'recording' ? 'REC' : undefined}
      />

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ── Setup phase ── */}
        {phase === 'setup' && (
          <SetupCard creating={creating} onCreate={handleCreate} />
        )}

        {/* ── Error phase ── */}
        {phase === 'error' && (
          <View style={styles.errorCard}>
            <View style={styles.errorTitleRow}>
              <Ionicons name="alert-circle" size={18} color={colors.red600} />
              <Text style={styles.errorTitle}>Connection failed</Text>
            </View>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setPhase('setup'); setErrorMsg(''); }}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Session / Recording / Analyzing / Results ── */}
        {session && phase !== 'setup' && phase !== 'error' && (
          <>
            {/* Session status + QR */}
            <SessionStatusCard
              session={session}
              qrUrl={patientUrl}
              sessionId={session.id}
            />

            {/* Recording controls */}
            {(phase === 'session' || phase === 'recording') && (
              <View style={styles.controlsCard}>
                <Text style={styles.controlsTitle}>Doctor microphone</Text>
                {phase === 'session' && (
                  <TouchableOpacity
                    style={[styles.bigBtn, styles.bigBtnRecord]}
                    onPress={handleStartRecording}
                  >
                    <Text style={styles.bigBtnIcon}>🎙️</Text>
                    <Text style={styles.bigBtnText}>Start Recording</Text>
                    <Text style={styles.bigBtnSub}>8-second chunks → Bangla ASR</Text>
                  </TouchableOpacity>
                )}
                {phase === 'recording' && (
                  <>
                    <View style={styles.recStatusRow}>
                      <Animated.Text style={[styles.recDotInline, { opacity: dotOpacity }]}>
                        ●
                      </Animated.Text>
                      <Text style={styles.recStatusText}>
                        {recording.state === 'processing'
                          ? 'Transcribing chunk…'
                          : 'Listening — speak clearly'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.bigBtn, styles.bigBtnStop]}
                      onPress={handleStopRecording}
                    >
                      <Text style={styles.bigBtnText}>⏹  Stop Recording</Text>
                    </TouchableOpacity>
                  </>
                )}

                {utterances.length > 0 && (
                  <TouchableOpacity
                    style={[styles.bigBtn, styles.bigBtnAnalyze]}
                    onPress={handleAnalyze}
                    disabled={phase === 'recording' && recording.state === 'processing'}
                  >
                    <Text style={[styles.bigBtnText, { color: colors.white }]}>
                      🔬  Analyze & Finish
                    </Text>
                    <Text style={styles.bigBtnSub}>
                      Fuses doctor + patient audio → agents run
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Analyzing spinner */}
            {phase === 'analyzing' && (
              <View style={styles.analyzingCard}>
                <ActivityIndicator size="large" color={colors.brand500} />
                <Text style={styles.analyzingTitle}>Agents working…</Text>
                <Text style={styles.analyzingDesc}>
                  Fusing transcripts → Scribe → Differential → Danger-Sign → Med-Safety → Critic
                </Text>
              </View>
            )}

            {/* Transcript so far */}
            {utterances.length > 0 && (
              <View style={styles.transcriptCard}>
                <Text style={styles.sectionTitle}>
                  🎙 Captured transcript ({utterances.length} utterance
                  {utterances.length !== 1 ? 's' : ''})
                </Text>
                {utterances.map((u) => (
                  <UtteranceBubble key={u.id} item={u} />
                ))}
                {recording.state === 'processing' && (
                  <View style={styles.processingRow}>
                    <ActivityIndicator size="small" color={colors.brand500} />
                    <Text style={styles.processingText}>Transcribing…</Text>
                  </View>
                )}
              </View>
            )}

            {/* Results */}
            {phase === 'results' && analysis && (
              <>
                {hasDanger && (
                  <DangerAlertCard
                    titleBn={DANGER_ALERT.titleBn}
                    titleEn={DANGER_ALERT.titleEn}
                    trigger={DANGER_ALERT.trigger}
                    action={DANGER_ALERT.action}
                    citation={DANGER_ALERT.citation}
                  />
                )}
                {hasMedBlock && (
                  <MedSafetyCard
                    drug={MEDSAFETY_ALERT.drug}
                    titleBn={MEDSAFETY_ALERT.titleBn}
                    titleEn={MEDSAFETY_ALERT.titleEn}
                    reason={MEDSAFETY_ALERT.reason}
                    alternative={MEDSAFETY_ALERT.alternative}
                    citation={MEDSAFETY_ALERT.citation}
                  />
                )}
                <SoapNote
                  subjective={SOAP_NOTE.subjective}
                  objective={SOAP_NOTE.objective}
                  assessment={SOAP_NOTE.assessment}
                  plan={SOAP_NOTE.plan}
                />
                <View style={styles.resultsActions}>
                  <TouchableOpacity
                    style={[styles.bigBtn, styles.bigBtnSuccess]}
                    onPress={handleConfirm}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                    <Text style={[styles.bigBtnText, { color: colors.white }]}>
                      Confirm & Send to Patient
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bigBtn, { backgroundColor: colors.slate100 }]}
                    onPress={handleRestart}
                  >
                    <Text style={[styles.bigBtnText, { color: colors.inkSoft }]}>
                      ↺ New Consultation
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SetupCard({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <View style={styles.setupCard}>
      <Text style={styles.setupEmoji}>🩺</Text>
      <Text style={styles.setupTitle}>Start a Live Consultation</Text>
      <Text style={styles.setupDesc}>
        Creates a session on the backend. Share the QR with your patient so their
        phone joins and contributes audio to the dual-device transcript fusion.
      </Text>
      <TouchableOpacity
        style={[styles.bigBtn, styles.bigBtnRecord, creating && { opacity: 0.6 }]}
        onPress={onCreate}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.bigBtnText}>🔗 Create Session</Text>
        )}
        {!creating && (
          <Text style={styles.bigBtnSub}>Wakes backend if sleeping (~30s first time)</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SessionStatusCard({
  session,
  qrUrl,
  sessionId,
}: {
  session: SessionState;
  qrUrl: string;
  sessionId: string;
}) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusRow}>
        <DeviceIndicator role="Doctor" connected={session.devices.doctor} count={session.counts.doctor} />
        <View style={styles.statusDivider} />
        <DeviceIndicator role="Patient" connected={session.devices.patient} count={session.counts.patient} />
      </View>
      {!session.devices.patient && (
        <>
          <Text style={styles.qrLabel}>Show this QR to the patient</Text>
          <View style={styles.qrWrapper}>
            {qrUrl ? (
              <QRCode
                value={qrUrl}
                size={160}
                color={colors.ink}
                backgroundColor={colors.white}
              />
            ) : (
              <ActivityIndicator color={colors.brand500} />
            )}
          </View>
          <Text style={styles.sessionIdText}>Session: {sessionId}</Text>
          <Text style={styles.qrUrlText}>{qrUrl}</Text>
        </>
      )}
      {session.devices.patient && (
        <View style={styles.patientConnectedBanner}>
          <Text style={styles.patientConnectedText}>
            🟢 Patient's phone is connected — both mics are active
          </Text>
        </View>
      )}
    </View>
  );
}

function DeviceIndicator({
  role,
  connected,
  count,
}: {
  role: string;
  connected: boolean;
  count: number;
}) {
  return (
    <View style={devStyles.container}>
      <Text style={devStyles.icon}>{connected ? '🟢' : '⚪'}</Text>
      <Text style={devStyles.role}>{role}</Text>
      <Text style={devStyles.count}>{count} utterances</Text>
    </View>
  );
}

function UtteranceBubble({ item }: { item: UtteranceItem }) {
  return (
    <View style={bubbleStyles.row}>
      <Text style={bubbleStyles.icon}>👨‍⚕️</Text>
      <View style={bubbleStyles.bubble}>
        <Text style={bubbleStyles.text}>{item.text}</Text>
        <Text style={bubbleStyles.conf}>{Math.round(item.conf * 100)}% conf</Text>
      </View>
    </View>
  );
}

// ── StyleSheets ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: 48, gap: spacing.md },

  setupCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.md,
  },
  setupEmoji: { fontSize: 48 },
  setupTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  setupDesc: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  errorCard: {
    backgroundColor: colors.red50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.red200,
    padding: spacing.base,
    gap: spacing.md,
  },
  errorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.red600 },
  errorMsg: { fontSize: fontSize.sm, color: colors.red600, lineHeight: 18 },
  retryBtn: {
    backgroundColor: colors.red500,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  retryBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },

  statusCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
    gap: spacing.md,
    alignItems: 'center',
    ...shadow.sm,
  },
  statusRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
    justifyContent: 'center',
  },
  statusDivider: { width: 1, backgroundColor: colors.slate200 },
  qrLabel: { fontSize: fontSize.sm, color: colors.inkMuted, textAlign: 'center' },
  qrWrapper: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  sessionIdText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  qrUrlText: {
    fontSize: fontSize.xs,
    color: colors.inkFaint,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  patientConnectedBanner: {
    backgroundColor: colors.emerald50,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.emerald100,
  },
  patientConnectedText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.emerald600,
    textAlign: 'center',
  },

  controlsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
    gap: spacing.md,
    ...shadow.sm,
  },
  controlsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recDotInline: { fontSize: 18, color: colors.red500 },
  recStatusText: { fontSize: fontSize.base, color: colors.ink, fontWeight: '500' },

  bigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  bigBtnRecord: { backgroundColor: colors.brand500 },
  bigBtnStop: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.red500,
  },
  bigBtnAnalyze: { backgroundColor: colors.slate800 },
  bigBtnSuccess: { backgroundColor: colors.emerald500 },
  bigBtnIcon: { fontSize: 24 },
  bigBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  bigBtnSub: { fontSize: fontSize.xs, color: colors.brand100 },

  analyzingCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.sm,
  },
  analyzingTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  analyzingDesc: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 19,
  },

  transcriptCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadow.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  processingText: {
    fontSize: fontSize.sm,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },

  resultsActions: { gap: spacing.sm },
});

const devStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', gap: 2 },
  icon: { fontSize: 20 },
  role: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  count: { fontSize: fontSize.xs, color: colors.inkFaint },
});

const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  icon: { fontSize: 18 },
  bubble: {
    flex: 1,
    backgroundColor: colors.brand50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand100,
    padding: spacing.sm,
  },
  text: {
    fontSize: fontSize.base,
    color: colors.ink,
    lineHeight: 21,
    fontWeight: '500',
  },
  conf: {
    fontSize: fontSize.xs,
    color: colors.inkFaint,
    marginTop: 3,
  },
});
