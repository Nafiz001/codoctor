import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';
import TopAppBar from '../components/TopAppBar';
import type { RootStackParamList } from '../../App';

type RootNav = StackNavigationProp<RootStackParamList>;

const TIPS = [
  { icon: 'qr-code-outline', text: 'Show the QR — patient scans it on their phone' },
  { icon: 'mic-outline', text: 'Keep both phones near the speakers for dual-mic capture' },
  { icon: 'checkmark-circle-outline', text: 'Tap "Analyze & Finish" when done to generate the report' },
  { icon: 'phone-portrait-outline', text: "The patient's phone shows the Bangla summary automatically" },
];

export default function DoctorModeScreen() {
  const navigation = useNavigation<RootNav>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar
        title="Doctor Mode"
        subtitle="Choose how to run your consultation"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Live Session Card ── */}
          <TouchableOpacity
            style={[styles.card, styles.cardLive]}
            onPress={() => navigation.navigate('LiveDoctor')}
            activeOpacity={0.87}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircleLive}>
                <MaterialCommunityIcons name="broadcast" size={24} color={colors.white} />
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveBadgeDot} />
                <Text style={styles.liveBadgeLabel}>LIVE</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>Live Session</Text>
            <Text style={styles.cardDesc}>
              Both phones capture audio simultaneously. AI fuses transcripts,
              checks WHO IMCI danger signs, and generates a Bangla summary.
            </Text>

            <View style={styles.chipRow}>
              {['Dual-mic', 'WHO IMCI', 'Bangla TTS', 'RAG'].map((c) => (
                <View key={c} style={styles.chipLight}>
                  <Text style={styles.chipLightText}>{c}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardBtnLive}>
              <Text style={styles.cardBtnText}>Launch Live Session</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>

          {/* ── Demo Card ── */}
          <TouchableOpacity
            style={[styles.card, styles.cardDemo]}
            onPress={() => navigation.navigate('Demo')}
            activeOpacity={0.87}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircleDemo}>
                <MaterialCommunityIcons name="play-circle-outline" size={24} color={colors.brand600} />
              </View>
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline-outline" size={12} color={colors.inkSoft} />
                <Text style={styles.offlineBadgeText}>Offline</Text>
              </View>
            </View>

            <Text style={[styles.cardTitle, styles.cardTitleDark]}>Scripted Demo</Text>
            <Text style={[styles.cardDesc, styles.cardDescDark]}>
              Watch the full AI pipeline play out on a pre-recorded paediatric
              consultation — no backend connection required.
            </Text>

            <View style={styles.chipRow}>
              {['Pre-recorded', '90 seconds', 'Full pipeline'].map((c) => (
                <View key={c} style={[styles.chipLight, styles.chipDark]}>
                  <Text style={[styles.chipLightText, styles.chipDarkText]}>{c}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.cardBtnLive, styles.cardBtnDemo]}>
              <Text style={[styles.cardBtnText, { color: colors.brand600 }]}>
                Watch Demo
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.brand600} />
            </View>
          </TouchableOpacity>

          {/* ── Tips ── */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={16} color={colors.brand500} />
              <Text style={styles.tipsHeaderText}>Live session tips</Text>
            </View>
            {TIPS.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipIconWrap}>
                  <Ionicons name={tip.icon as any} size={18} color={colors.brand600} />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: 140, gap: spacing.base },

  // Cards
  card: {
    borderRadius: 22,
    padding: spacing.xl,
    ...shadow.md,
  },
  cardLive: {
    backgroundColor: colors.brand500,
  },
  cardDemo: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.brand200,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  iconCircleLive: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleDemo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#86EFAC',
  },
  liveBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.6,
  },

  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.slate100,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  offlineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkSoft,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  cardTitleDark: { color: colors.ink },
  cardDesc: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
    marginBottom: spacing.base,
  },
  cardDescDark: { color: colors.inkMuted },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.base,
  },
  chipLight: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipLightText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  chipDark: {
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand200,
  },
  chipDarkText: { color: colors.brand700 ?? colors.brand500 },

  cardBtnLive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  cardBtnDemo: {
    backgroundColor: colors.brand50,
  },
  cardBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },

  // Tips
  tipsCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  tipsHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    lineHeight: 19,
  },
});