import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';
import {
  TRANSCRIPT,
  AGENT_EVENTS,
  PATIENT,
  DANGER_ALERT,
  MEDSAFETY_ALERT,
  SOAP_NOTE,
  type TranscriptLine,
  type AgentEvent,
} from '../lib/demo-data';
import { TranscriptItem } from '../components/TranscriptItem';
import { AgentCard } from '../components/AgentCard';
import { DangerAlertCard, MedSafetyCard } from '../components/AlertCard';
import { PatientHeaderCard } from '../components/PatientHeaderCard';
import { SoapNote } from '../components/SoapNote';
import TopAppBar from '../components/TopAppBar';
import type { RootStackParamList } from '../../App';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Demo'>;
};

const LAST_LINE = TRANSCRIPT[TRANSCRIPT.length - 1].id;
const STEP_MS = 2200;

type ActiveTab = 'transcript' | 'agents' | 'alerts' | 'soap';

export default function DoctorScreen({ navigation }: Props) {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('transcript');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptScrollRef = useRef<ScrollView>(null);
  const agentScrollRef = useRef<ScrollView>(null);

  const done = cursor >= LAST_LINE;
  const lines: TranscriptLine[] = TRANSCRIPT.filter((l) => l.id <= cursor);
  const events: AgentEvent[] = AGENT_EVENTS.filter((e) => e.afterLine <= cursor);
  const showDanger = cursor >= 8;
  const showMed = cursor >= 9;
  const alertCount = (showDanger ? 1 : 0) + (showMed ? 1 : 0);

  // ── Playback ──────────────────────────────────────────────────────────────
  const startPlaying = useCallback(() => {
    if (done) return;
    setPlaying(true);
  }, [done]);

  const pausePlaying = useCallback(() => {
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCursor((c) => {
        if (c >= LAST_LINE) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, STEP_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing]);

  // Auto-switch to Alerts tab when a critical event fires
  useEffect(() => {
    if (showDanger && alertCount > 0) {
      setActiveTab('alerts');
    }
  }, [showDanger]);

  const handleRestart = () => {
    setPlaying(false);
    setCursor(0);
    setConfirmed(false);
    setActiveTab('transcript');
  };

  const handleStep = () => {
    setPlaying(false);
    setCursor((c) => Math.min(LAST_LINE, c + 1));
  };

  const handleConfirm = () => {
    Alert.alert(
      'Confirm & Save',
      'SOAP note and prescription confirmed. Patient record updated.',
      [
        {
          text: 'Send to Patient',
          onPress: () => {
            setConfirmed(true);
            navigation.navigate('Summary', {});
          },
        },
        { text: 'Done', onPress: () => setConfirmed(true) },
      ]
    );
  };

  // ── Recording dot animation ───────────────────────────────────────────────
  const dotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!playing) {
      dotOpacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.15, duration: 500, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [playing]);

  // ── Tab bar ───────────────────────────────────────────────────────────────
  const TABS: { key: ActiveTab; label: string; icon: string; iconFamily: 'ion' | 'mci'; badge?: number }[] = [
    { key: 'transcript', label: 'Transcript', iconFamily: 'mci', icon: 'microphone-outline', badge: lines.length },
    { key: 'agents', label: 'Agents', iconFamily: 'ion', icon: 'hardware-chip-outline', badge: events.length },
    { key: 'alerts', label: 'Alerts', iconFamily: 'ion', icon: 'alert-circle-outline', badge: alertCount || undefined },
    { key: 'soap', label: 'SOAP', iconFamily: 'ion', icon: 'document-text-outline', badge: done ? 1 : undefined },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopAppBar
        title="Consultation Cockpit"
        subtitle="Demo mode · scripted"
        leftIcon={{
          family: 'ion',
          name: 'chevron-back',
          onPress: () => navigation.goBack(),
        }}
        rightIcon={
          playing
            ? undefined
            : { family: 'ion', name: 'refresh', onPress: handleRestart }
        }
        badge={playing ? 'LIVE' : undefined}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ── Patient card ── */}
        <View style={styles.section}>
          <PatientHeaderCard patient={PATIENT} />
        </View>

        {/* ── Playback controls ── */}
        <View style={styles.controls}>
          {!playing && !done && (
            <TouchableOpacity
              style={[styles.controlBtn, styles.controlBtnPrimary]}
              onPress={startPlaying}
            >
              <Ionicons name="play" size={18} color={colors.white} />
              <Text style={styles.controlBtnText}>
                {cursor === 0 ? 'Play Consultation' : 'Resume'}
              </Text>
            </TouchableOpacity>
          )}
          {playing && (
            <TouchableOpacity
              style={[styles.controlBtn, styles.controlBtnSecondary]}
              onPress={pausePlaying}
            >
              <Ionicons name="pause" size={18} color={colors.ink} />
              <Text style={[styles.controlBtnText, { color: colors.ink }]}>
                Pause
              </Text>
            </TouchableOpacity>
          )}
          {done && !confirmed && (
            <TouchableOpacity
              style={[styles.controlBtn, styles.controlBtnSuccess]}
              onPress={handleConfirm}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <Text style={styles.controlBtnText}>Confirm & Save</Text>
            </TouchableOpacity>
          )}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlBtnSmall}
              onPress={handleStep}
              disabled={done}
            >
              <Ionicons name="play-skip-forward" size={16} color={colors.inkSoft} />
              <Text style={styles.controlBtnSmallText}>Step</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtnSmall} onPress={handleRestart}>
              <Ionicons name="refresh" size={16} color={colors.inkSoft} />
              <Text style={styles.controlBtnSmallText}>Restart</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(cursor / LAST_LINE) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {cursor}/{LAST_LINE} transcript lines
          {done ? ' · Consultation complete' : playing ? ' · Listening…' : ''}
        </Text>

        {/* ── Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((tab) => {
            const TabIcon = tab.iconFamily === 'mci' ? MaterialCommunityIcons : Ionicons;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <TabIcon
                  name={tab.icon as any}
                  size={14}
                  color={activeTab === tab.key ? colors.white : colors.inkMuted}
                />
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {tab.badge != null && tab.badge > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      tab.key === 'alerts' && tab.badge > 0
                        ? styles.tabBadgeDanger
                        : styles.tabBadgeNormal,
                    ]}
                  >
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Tab content ── */}
        <View style={styles.tabContent}>
          {/* Transcript tab */}
          {activeTab === 'transcript' && (
            <View>
              {lines.length === 0 ? (
                <EmptyState
                  emoji="🎙️"
                  text="Press Play to start the scripted consultation"
                />
              ) : (
                lines.map((line) => <TranscriptItem key={line.id} line={line} />)
              )}
              {playing && (
                <View style={styles.listeningRow}>
                  <Animated.View style={[styles.listeningDot, { opacity: dotOpacity }]} />
                  <Text style={styles.listeningText}>
                    Capturing from both devices…
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Agents tab */}
          {activeTab === 'agents' && (
            <View>
              {events.length === 0 ? (
                <EmptyState
                  emoji="🤖"
                  text="Agent trace will appear as the consultation plays"
                />
              ) : (
                events.map((evt) => <AgentCard key={evt.id} event={evt} />)
              )}
            </View>
          )}

          {/* Alerts tab */}
          {activeTab === 'alerts' && (
            <View>
              {!showDanger && !showMed ? (
                <EmptyState
                  emoji="🛡️"
                  text="No alerts yet — danger-sign and med-safety checks are running"
                />
              ) : (
                <>
                  {showDanger && (
                    <DangerAlertCard
                      titleBn={DANGER_ALERT.titleBn}
                      titleEn={DANGER_ALERT.titleEn}
                      trigger={DANGER_ALERT.trigger}
                      action={DANGER_ALERT.action}
                      citation={DANGER_ALERT.citation}
                    />
                  )}
                  {showMed && (
                    <MedSafetyCard
                      drug={MEDSAFETY_ALERT.drug}
                      titleBn={MEDSAFETY_ALERT.titleBn}
                      titleEn={MEDSAFETY_ALERT.titleEn}
                      reason={MEDSAFETY_ALERT.reason}
                      alternative={MEDSAFETY_ALERT.alternative}
                      citation={MEDSAFETY_ALERT.citation}
                    />
                  )}
                </>
              )}
            </View>
          )}

          {/* SOAP tab */}
          {activeTab === 'soap' && (
            <View>
              {!done ? (
                <EmptyState
                  emoji="📋"
                  text="SOAP note is auto-drafted when the consultation finishes"
                />
              ) : (
                <>
                  <SoapNote
                    subjective={SOAP_NOTE.subjective}
                    objective={SOAP_NOTE.objective}
                    assessment={SOAP_NOTE.assessment}
                    plan={SOAP_NOTE.plan}
                  />
                  {!confirmed && (
                    <TouchableOpacity
                      style={[styles.controlBtn, styles.controlBtnSuccess, { marginTop: spacing.md }]}
                      onPress={handleConfirm}
                    >
                      <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                      <Text style={styles.controlBtnText}>
                        Confirm & Send to Patient
                      </Text>
                    </TouchableOpacity>
                  )}
                  {confirmed && (
                    <View style={styles.confirmedBanner}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.emerald600} />
                      <Text style={styles.confirmedText}>
                        Saved · Patient record updated
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* ── QR code share ── */}
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Share session QR</Text>
          <Text style={styles.qrSub}>
            Patient scans this to join the live session on their phone
          </Text>
          <View style={styles.qrBox}>
            <QRCode
              value="https://codoctor.vercel.app/patient"
              size={140}
              color={colors.ink}
              backgroundColor={colors.white}
            />
          </View>
          <Text style={styles.qrUrl}>codoctor.vercel.app/patient</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>{emoji}</Text>
      <Text style={emptyStyles.text}>{text}</Text>
    </View>
  );
}

// ── Note: kept for compatibility with existing tab content blocks above ─────


// ── StyleSheets ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  section: { padding: spacing.base },

  // Controls
  controls: { paddingHorizontal: spacing.base, gap: spacing.sm },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 14,
    ...shadow.sm,
  },
  controlBtnPrimary: { backgroundColor: colors.brand500 },
  controlBtnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate300,
  },
  controlBtnSuccess: { backgroundColor: colors.emerald500 },
  controlBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  controlBtnSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  controlBtnSmallText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.inkSoft,
  },

  // Progress
  progressBar: {
    height: 4,
    backgroundColor: colors.slate200,
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand500,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },

  // Tabs
  tabScroll: { flexGrow: 0 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  tabActive: {
    backgroundColor: colors.brand500,
    borderColor: colors.brand500,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.white,
  },
  tabBadge: {
    borderRadius: radius.full,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeNormal: { backgroundColor: colors.slate300 },
  tabBadgeDanger: { backgroundColor: colors.red500 },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },

  tabContent: { padding: spacing.base },

  // Listening indicator
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.sm,
  },
  listeningDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red500,
  },
  listeningText: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    fontStyle: 'italic',
  },

  // Confirmed banner
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.emerald50,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.emerald100,
  },
  confirmedText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.emerald600,
  },

  // QR section
  qrSection: {
    margin: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    ...shadow.sm,
  },
  qrTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  qrSub: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  qrBox: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  qrUrl: {
    fontSize: fontSize.xs,
    color: colors.inkFaint,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: spacing.sm,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emoji: {
    fontSize: 36,
    marginBottom: spacing.md,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});
