import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';
import { PROBLEM_STATS, HOW_IT_WORKS } from '../lib/demo-data';
import { LogoRow } from '../components/LogoMark';
import type { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList>;

const { width: SCREEN_W } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fade, transform: [{ translateY: slide }] },
          ]}
        >
          <LogoRow size={36} showBangla />
          <Text style={styles.greeting}>Welcome back</Text>
        </Animated.View>

        {/* ── Hero card ── */}
        <Animated.View style={[styles.hero, { opacity: fade }]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <View style={styles.heroBadgeDot} />
              <Text style={styles.heroBadgeText}>BETA · SciBlitz 2026</Text>
            </View>
            <Text style={styles.heroHeading}>
              A second pair of{'\n'}ears in the room
            </Text>
            <Text style={styles.heroSub}>
              Listens on both phones. Catches danger signs. Gives the patient
              a spoken Bangla record — in 90 seconds.
            </Text>
          </View>
        </Animated.View>

        {/* ── Quick Actions (Demo entry points) ── */}
        <View style={styles.actionsBlock}>
          <Text style={styles.sectionLabel}>TRY IT NOW</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              iconFamily="mci"
              icon="play-circle-outline"
              tint={colors.brand500}
              title="Watch Demo"
              subtitle="90s scripted walkthrough"
              onPress={() => navigation.navigate('Demo')}
            />
            <ActionCard
              iconFamily="mci"
              icon="stethoscope"
              tint={colors.indigo500}
              title="Doctor Mode"
              subtitle="Start a live session"
              onPress={() => navigation.navigate('LiveDoctor')}
            />
            <ActionCard
              iconFamily="ion"
              icon="qr-code-outline"
              tint={colors.emerald500}
              title="Patient Demo"
              subtitle="See a sample record"
              onPress={() =>
                navigation.navigate('Summary', { summary: undefined })
              }
            />
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE PROBLEM</Text>
          <Text style={styles.sectionTitle}>Bangladesh's OPD crisis</Text>
          <View style={styles.statsGrid}>
            {PROBLEM_STATS.map((s, i) => (
              <StatCard key={i} value={s.value} label={s.label} />
            ))}
          </View>
        </View>

        {/* ── How it works ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Four steps, one consultation</Text>
          <View style={styles.stepsWrap}>
            {HOW_IT_WORKS.map((item, i) => (
              <HowStep key={i} index={i + 1} title={item.title} desc={item.desc} />
            ))}
          </View>
        </View>

        {/* ── Safety ── */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyIconWrap}>
            <Ionicons name="shield-checkmark" size={20} color={colors.brand600} />
          </View>
          <View style={styles.safetyTextWrap}>
            <Text style={styles.safetyTitle}>Advisory, not diagnostic</Text>
            <Text style={styles.safetyText}>
              Codoctor surfaces cited guideline prompts and deterministic
              safety checks. All decisions stay with the licensed clinician.
            </Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={styles.footer}>
          SciBlitz AI Challenge 2026 · Track A — Health & Society
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ActionCard({
  iconFamily,
  icon,
  tint,
  title,
  subtitle,
  onPress,
}: {
  iconFamily: 'ion' | 'mci';
  icon: string;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const Icon = iconFamily === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <TouchableOpacity
      style={actionStyles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[actionStyles.iconWrap, { backgroundColor: `${tint}15` }]}>
        <Icon name={icon as any} size={22} color={tint} />
      </View>
      <Text style={actionStyles.title}>{title}</Text>
      <Text style={actionStyles.subtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function HowStep({
  index,
  title,
  desc,
}: {
  index: number;
  title: string;
  desc: string;
}) {
  return (
    <View style={stepStyles.row}>
      <View style={stepStyles.numberWrap}>
        <Text style={stepStyles.number}>{index.toString().padStart(2, '0')}</Text>
      </View>
      <View style={stepStyles.content}>
        <Text style={stepStyles.title}>{title}</Text>
        <Text style={stepStyles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

// ── StyleSheets ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: { paddingBottom: 140 },

  // Header
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.inkFaint,
    fontWeight: '500',
  },

  // Hero
  hero: {
    marginHorizontal: spacing.base,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.brand500,
    ...shadow.md,
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.brand400,
    opacity: 0.55,
  },
  heroContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#86EFAC',
  },
  heroBadgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 21,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
  },
  sectionLabel: {
    fontSize: 10,
    color: colors.brand500,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    color: colors.ink,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.base,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stepsWrap: {
    gap: 0,
  },

  // Actions block
  actionsBlock: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  // Safety
  safetyCard: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
  },
  safetyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyTextWrap: { flex: 1 },
  safetyTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  safetyText: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    lineHeight: 18,
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.base,
  },
});

const actionStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 15,
  },
});

const statStyles = StyleSheet.create({
  card: {
    width: (SCREEN_W - spacing.base * 2 - spacing.md) / 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
    ...shadow.sm,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brand500,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 15,
  },
});

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.base,
    alignItems: 'flex-start',
  },
  numberWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand200,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  number: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand600,
    letterSpacing: 0.4,
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  desc: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    lineHeight: 18,
  },
});