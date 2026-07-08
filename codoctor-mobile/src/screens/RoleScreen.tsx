import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';
import { LogoRow } from '../components/LogoMark';
import type { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList>;

export default function RoleScreen() {
  const navigation = useNavigation<Nav>();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LogoRow size={40} showBangla />
        </View>

        <Animated.View
          style={[styles.hero, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <Text style={styles.heroTitle}>Who is using this phone?</Text>
          <Text style={styles.heroSub}>
            A second pair of ears for the consultation — catches danger signs,
            checks drug safety, and gives the patient a Bangla record they keep.
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
          {/* Doctor / volunteer */}
          <TouchableOpacity
            style={[styles.card, styles.cardDoctor]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Doctor')}
          >
            <View style={styles.cardIconLight}>
              <MaterialCommunityIcons name="stethoscope" size={26} color={colors.white} />
            </View>
            <Text style={styles.cardTitle}>I'm the Doctor</Text>
            <Text style={styles.cardDesc}>
              Record the consultation on this phone — even if the patient has no
              phone. Get danger-sign & drug-safety checks, then share the
              prescription to the patient via WhatsApp, Telegram or SMS.
            </Text>
            <View style={styles.cardCta}>
              <Text style={styles.cardCtaText}>Start a consultation</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>

          {/* Patient */}
          <TouchableOpacity
            style={[styles.card, styles.cardPatient]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Patient')}
          >
            <View style={styles.cardIconDark}>
              <Ionicons name="person" size={24} color={colors.brand600} />
            </View>
            <Text style={[styles.cardTitle, styles.cardTitleDark]}>I'm the Patient</Text>
            <Text style={[styles.cardDesc, styles.cardDescDark]}>
              Upload your previous reports so the doctor sees your history, join
              the doctor's session with a QR, and get your record read aloud in
              Bangla.
            </Text>
            <View style={[styles.cardCta, styles.cardCtaDark]}>
              <Text style={[styles.cardCtaText, { color: colors.brand600 }]}>
                Open patient view
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.brand600} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.safety}>
          <Ionicons name="shield-checkmark" size={16} color={colors.brand600} />
          <Text style={styles.safetyText}>
            Advisory, not diagnostic. Danger-sign and drug-safety calls are made
            by deterministic rules with citations — the doctor always decides.
          </Text>
        </View>

        <Text style={styles.footer}>SciBlitz AI Challenge 2026 · Track A</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.base, paddingBottom: spacing.xl, gap: spacing.base },

  header: { paddingTop: spacing.sm, paddingBottom: spacing.xs },

  hero: { marginTop: spacing.sm, marginBottom: spacing.sm },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroSub: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    lineHeight: 21,
  },

  card: {
    borderRadius: 22,
    padding: spacing.xl,
    marginTop: spacing.base,
    ...shadow.md,
  },
  cardDoctor: { backgroundColor: colors.brand500 },
  cardPatient: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.brand200,
  },
  cardIconLight: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardIconDark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  cardTitleDark: { color: colors.ink },
  cardDesc: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: spacing.base,
  },
  cardDescDark: { color: colors.inkMuted },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  cardCtaDark: { backgroundColor: colors.brand50 },
  cardCtaText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },

  safety: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
    marginTop: spacing.base,
  },
  safetyText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    lineHeight: 18,
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: spacing.md,
  },
});
