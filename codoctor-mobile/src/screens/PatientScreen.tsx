import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';
import { joinSession, getSession, appendTranscript, type SessionState, type PatientSummary, type ReportExtract } from '../lib/api';
import { useNativeDictation } from '../lib/useNativeDictation';
import { captureReportPhoto, pickReportImage, pickReportPdf } from '../lib/pickReport';
import TopAppBar from '../components/TopAppBar';
import type { RootStackParamList } from '../../App';

type Props = {
  navigation?: StackNavigationProp<RootStackParamList>;
};

type ViewMode = 'choose' | 'scan' | 'connecting' | 'waiting' | 'done';

export default function PatientScreen({ navigation: navProp }: Props) {
  const hookNav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const navigation = navProp ?? hookNav;
  const [mode, setMode] = useState<ViewMode>('choose');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [utteranceCount, setUtteranceCount] = useState(0);
  const [report, setReport] = useState<ReportExtract | null>(null);
  const [attaching, setAttaching] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sidRef = useRef<string | null>(null);
  sidRef.current = sessionId;
  const dotOpacity = useRef(new Animated.Value(1)).current;

  // Recording — patient contributes their voice to the dual-device fusion
  const onTranscript = useCallback(async (text: string, conf: number) => {
    const sid = sidRef.current;
    if (!sid || !text.trim()) return;
    setUtteranceCount((c) => c + 1);
    await appendTranscript(sid, 'patient', text, conf);
  }, []);

  const patientRecording = useNativeDictation({
    onTranscript,
    onError: (msg) => Alert.alert('Recording error', msg),
    language: 'bn-BD',
  });

  // Pulsing dot for recording indicator
  useEffect(() => {
    if (patientRecording.state !== 'recording') { dotOpacity.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [patientRecording.state]);

  // Stop recording when leaving
  useEffect(() => {
    return () => { patientRecording.stop(); };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Poll session when we have a session ID
  useEffect(() => {
    if (!sessionId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const s = await getSession(sessionId);
      if (s) {
        setSession(s);
        if (s.status === 'ready' && s.summary) {
          clearInterval(pollRef.current!);
          navigation.navigate('Summary', { summary: s.summary as PatientSummary });
        }
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, navigation]);

  // QR scan handler
  const handleBarcodeScan = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);

      try {
        // Accept any QR that carries the session id: a deep link
        // (codoctor://join?s=ID), a URL (…?s=ID), or the bare id itself.
        const raw = data.trim();
        const match = raw.match(/[?&]s=([^&\s]+)/);
        const sid = match
          ? decodeURIComponent(match[1])
          : (raw && !/\s/.test(raw) && !raw.includes('://') && raw.length <= 64 ? raw : null);
        if (sid) {
          setSessionId(sid);
          setMode('connecting');
          const joined = await joinSession(sid, 'patient');
          if (joined) {
            setSession(joined);
            setMode('waiting');
          } else {
            setError('Could not connect to session. Check your connection and try again.');
            setMode('choose');
            setScanned(false);
          }
        } else {
          setError('QR code does not contain a session ID. Ask the doctor to show their QR.');
          setMode('choose');
          setScanned(false);
        }
      } catch {
        setError('Could not read QR code. Please try again.');
        setMode('choose');
        setScanned(false);
      }
    },
    [scanned, navigation]
  );

  // Upload a previous report; if already in a session, forward a concise note
  // to the doctor so it informs the live analysis.
  const runAttach = async (kind: 'camera' | 'gallery' | 'pdf') => {
    setAttaching(true);
    try {
      const res =
        kind === 'camera' ? await captureReportPhoto()
        : kind === 'gallery' ? await pickReportImage()
        : await pickReportPdf();
      if (res.extract) {
        setReport(res.extract);
        const sid = sidRef.current;
        if (sid) {
          const parts = [
            res.extract.summary_bn || res.extract.summary_en,
            res.extract.medications.length ? `আগের ওষুধ: ${res.extract.medications.join(', ')}` : '',
            res.extract.allergies.length ? `অ্যালার্জি: ${res.extract.allergies.join(', ')}` : '',
          ].filter(Boolean);
          if (parts.length) await appendTranscript(sid, 'patient', parts.join('। '), 0.99);
        }
      }
    } finally {
      setAttaching(false);
    }
  };

  // Request camera permission
  const startScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera permission needed',
          'Please allow camera access to scan the doctor QR code. You can enable it in Settings.',
          [
            { text: 'Cancel' },
            {
              text: 'Open Settings',
              onPress: () =>
                Platform.OS === 'ios'
                  ? Linking.openURL('app-settings:')
                  : Linking.openSettings(),
            },
          ]
        );
        return;
      }
    }
    setScanned(false);
    setError(null);
    setMode('scan');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopAppBar
        showLogo={false}
        title="Patient"
        subtitle="আপনার স্বাস্থ্য রেকর্ড"
        rightIcon={
          mode === 'scan'
            ? {
                family: 'ion',
                name: 'close',
                onPress: () => {
                  setMode('choose');
                  setScanned(false);
                },
              }
            : undefined
        }
      />

      {/* QR Scanner */}
      {mode === 'scan' && (
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
            <View style={styles.scanHintWrap}>
              <Text style={styles.scanHint}>
                Point at the QR code on the doctor's door or screen
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Choose / Connecting / Waiting modes */}
      {mode !== 'scan' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="person" size={28} color={colors.brand600} />
            </View>
            <Text style={styles.heroTitle}>আপনার স্বাস্থ্য রেকর্ড</Text>
            <Text style={styles.heroSub}>Your health record</Text>
            <Text style={styles.heroDesc}>
              Scan the QR code on the doctor's door to join the live
              consultation, or view the demo patient summary.
            </Text>
          </View>

          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.red600} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Connecting spinner */}
          {mode === 'connecting' && (
            <View style={styles.statusCard}>
              <ActivityIndicator size="large" color={colors.brand500} />
              <Text style={styles.statusTitle}>Connecting to session…</Text>
              <Text style={styles.statusSub}>Joining the doctor's consultation</Text>
            </View>
          )}

          {/* Waiting for doctor */}
          {mode === 'waiting' && session && (
            <View style={styles.statusCard}>
              <View style={styles.waitingIcon}>
                <Ionicons name="hourglass-outline" size={28} color={colors.brand600} />
              </View>
              <Text style={styles.statusTitle}>Connected · In session</Text>
              <View style={styles.deviceRow}>
                <DeviceChip label="Doctor" connected={session.devices.doctor} />
                <DeviceChip label="Your phone" connected={session.devices.patient} />
              </View>

              {/* Patient microphone contribution */}
              <View style={styles.recSection}>
                <View style={styles.recHeader}>
                  <Ionicons name="mic" size={16} color={colors.ink} />
                  <Text style={styles.recSectionTitle}>Your microphone</Text>
                </View>
                <Text style={styles.recSectionDesc}>
                  Speak during the consultation — your voice helps the AI hear
                  both sides more accurately.
                </Text>
                {patientRecording.state === 'idle' && (
                  <TouchableOpacity
                    style={[styles.recBtn, styles.recBtnStart]}
                    onPress={() => patientRecording.start()}
                  >
                    <Ionicons name="mic" size={16} color={colors.white} />
                    <Text style={styles.recBtnText}>Start Contributing</Text>
                  </TouchableOpacity>
                )}
                {(patientRecording.state === 'recording' || patientRecording.state === 'processing') && (
                  <>
                    <View style={styles.recActiveRow}>
                      <Animated.View style={[styles.recActiveDot, { opacity: dotOpacity }]} />
                      <Text style={styles.recActiveText}>
                        {patientRecording.state === 'processing' ? 'Transcribing…' : 'Listening…'}
                      </Text>
                      <Text style={styles.recCount}>{utteranceCount} sent</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.recBtn, styles.recBtnStop]}
                      onPress={() => patientRecording.stop()}
                    >
                      <Ionicons name="stop" size={16} color={colors.red600} />
                      <Text style={[styles.recBtnText, { color: colors.red600 }]}>Stop</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <Text style={styles.waitNote}>
                Your summary will appear automatically when the doctor finishes.
              </Text>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => {
                  patientRecording.stop();
                  if (pollRef.current) clearInterval(pollRef.current);
                  setMode('choose');
                  setSessionId(null);
                  setSession(null);
                  setScanned(false);
                  setUtteranceCount(0);
                }}
              >
                <Text style={styles.linkBtnText}>Leave session</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons (only in choose mode) */}
          {mode === 'choose' && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={startScan}
                activeOpacity={0.85}
              >
                <View style={styles.actionBtnIcon}>
                  <Ionicons name="qr-code" size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionBtnTitle}>Scan QR Code</Text>
                  <Text style={styles.actionBtnSub}>
                    Join the doctor's live session
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </TouchableOpacity>

              <View style={styles.uploadCard}>
                <Text style={styles.uploadTitle}>Upload previous reports</Text>
                <Text style={styles.uploadSub}>
                  Add an old prescription or lab report — the AI reads it so the
                  doctor sees your history.
                </Text>
                <View style={styles.uploadRow}>
                  <UploadBtn icon="camera" label="Photo" onPress={() => runAttach('camera')} disabled={attaching} />
                  <UploadBtn icon="image" label="Gallery" onPress={() => runAttach('gallery')} disabled={attaching} />
                  <UploadBtn icon="document-text" label="PDF" onPress={() => runAttach('pdf')} disabled={attaching} />
                </View>
                {attaching && (
                  <View style={styles.uploadStatus}>
                    <ActivityIndicator size="small" color={colors.brand500} />
                    <Text style={styles.uploadStatusText}>Reading your report…</Text>
                  </View>
                )}
                {report && (
                  <View style={styles.reportResult}>
                    {report.summary_bn ? <Text style={styles.reportResultBn}>{report.summary_bn}</Text> : null}
                    {report.medications.length ? (
                      <Text style={styles.reportResultLine}>ওষুধ: {report.medications.join(', ')}</Text>
                    ) : null}
                    {report.allergies.length ? (
                      <Text style={styles.reportResultLine}>অ্যালার্জি: {report.allergies.join(', ')}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Info cards */}
          {mode === 'choose' && (
            <View style={styles.infoCards}>
              <InfoCard
                iconFamily="ion"
                icon="lock-closed-outline"
                title="Your data, your phone"
                desc="Your health record is stored on your device. Nobody shares it without your consent."
              />
              <InfoCard
                iconFamily="mci"
                icon="account-voice"
                title="Bangla audio summary"
                desc="Your summary is read aloud in Bangla so you always understand your own health."
              />
              <InfoCard
                iconFamily="ion"
                icon="phone-portrait-outline"
                title="Keep it forever"
                desc="Load your record on any visit — just scan the QR. No login, no account needed."
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DeviceChip({ label, connected }: { label: string; connected: boolean }) {
  return (
    <View
      style={[
        chipStyles.chip,
        connected ? chipStyles.connected : chipStyles.disconnected,
      ]}
    >
      <View
        style={[
          chipStyles.dot,
          { backgroundColor: connected ? colors.emerald500 : colors.inkFaint },
        ]}
      />
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

function UploadBtn({ icon, label, onPress, disabled }: {
  icon: string; label: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[uploadStyles.btn, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name={icon as any} size={20} color={colors.brand600} />
      <Text style={uploadStyles.btnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoCard({
  iconFamily,
  icon,
  title,
  desc,
}: {
  iconFamily: 'ion' | 'mci';
  icon: string;
  title: string;
  desc: string;
}) {
  const Icon = iconFamily === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={infoStyles.card}>
      <View style={infoStyles.iconWrap}>
        <Icon name={icon as any} size={18} color={colors.brand600} />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.title}>{title}</Text>
        <Text style={infoStyles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

// ── StyleSheets ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: 140, gap: spacing.base },

  // Scanner
  scannerContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: colors.brand400,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  scanHintWrap: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  scanHint: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.brand50,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.brand200,
    padding: spacing.xl,
    alignItems: 'center',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: fontSize.base,
    color: colors.brand600,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  heroDesc: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red200,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.red600,
    lineHeight: 18,
  },

  // Status card
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.sm,
  },
  waitingIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  statusSub: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  deviceRow: { flexDirection: 'row', gap: spacing.md },
  linkBtn: { marginTop: spacing.sm },
  linkBtnText: {
    fontSize: fontSize.sm,
    color: colors.red500,
    fontWeight: '600',
  },
  waitNote: {
    fontSize: fontSize.xs,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 17,
    fontStyle: 'italic',
  },

  // Patient recording controls
  recSection: {
    width: '100%',
    backgroundColor: colors.slate50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.md,
    gap: spacing.sm,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  recSectionDesc: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    lineHeight: 17,
  },
  recBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
  recBtnStart: { backgroundColor: colors.brand500 },
  recBtnStop: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.red200,
  },
  recBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },
  recActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recActiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red500,
  },
  recActiveText: {
    fontSize: fontSize.sm,
    color: colors.ink,
    fontWeight: '500',
    flex: 1,
  },
  recCount: {
    fontSize: fontSize.xs,
    color: colors.inkFaint,
  },

  // Actions
  actions: { gap: spacing.md },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: 16,
    ...shadow.sm,
  },
  actionBtnPrimary: { backgroundColor: colors.brand500 },
  actionBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  actionBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnIconDark: {
    backgroundColor: colors.brand50,
  },
  actionBtnTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  actionBtnSub: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  infoCards: { gap: spacing.md, marginTop: spacing.sm },

  // Upload previous reports
  uploadCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadow.sm,
  },
  uploadTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  uploadSub: { fontSize: fontSize.xs, color: colors.inkMuted, lineHeight: 17 },
  uploadRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  uploadStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  uploadStatusText: { fontSize: fontSize.sm, color: colors.inkMuted },
  reportResult: {
    backgroundColor: colors.slate50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.md,
    gap: 4,
    marginTop: 4,
  },
  reportResultBn: { fontSize: fontSize.sm, color: colors.ink, lineHeight: 20 },
  reportResultLine: { fontSize: fontSize.xs, color: colors.inkSoft },
});

const uploadStyles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand200,
  },
  btnLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.brand600 },
});

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  connected: { backgroundColor: colors.emerald50 },
  disconnected: { backgroundColor: colors.slate100 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.inkSoft },
});

const infoStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1 },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 3,
  },
  desc: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    lineHeight: 18,
  },
});