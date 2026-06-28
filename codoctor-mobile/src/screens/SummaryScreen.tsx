import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';
import { PATIENT_SUMMARY_SPEECH } from '../lib/demo-data';
import { CitationBadge } from '../components/CitationBadge';
import TopAppBar from '../components/TopAppBar';
import type { RootStackParamList } from '../../App';
import type { PatientSummary } from '../lib/api';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Summary'>;
  route: RouteProp<RootStackParamList, 'Summary'>;
};

type SpeechState = 'idle' | 'speaking' | 'done';

export default function SummaryScreen({ navigation, route }: Props) {
  const summary: PatientSummary =
    route.params?.summary ?? (require('../lib/demo-data').PATIENT_SUMMARY as PatientSummary);

  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    return () => {
      Speech.stop();
    };
  }, []);

  const speechText =
    [
      summary.conditionBn,
      summary.meaningBn,
      summary.actionBn,
      summary.medsBn,
      'বিপদের লক্ষণ: ' + summary.dangerSignsBn.join('; ') + '।',
    ].join(' ') || PATIENT_SUMMARY_SPEECH;

  const handleSpeak = async () => {
    if (speechState === 'speaking') {
      await Speech.stop();
      setSpeechState('idle');
      return;
    }
    setSpeechState('speaking');
    Speech.speak(speechText, {
      language: 'bn-BD',
      rate: 0.85,
      pitch: 1.0,
      onDone: () => setSpeechState('done'),
      onError: () => {
        setSpeechState('idle');
        Alert.alert(
          'Text-to-speech error',
          'Could not read aloud. Please check that Bangla language support is installed on your device.'
        );
      },
      onStopped: () => setSpeechState('idle'),
    });
  };

  const handleShare = async () => {
    const shareText = [
      '--- Codoctor স্বাস্থ্য রেকর্ড ---',
      '',
      summary.conditionBn,
      summary.conditionEn,
      '',
      summary.actionBn,
      summary.actionEn,
      '',
      'ওষুধ: ' + summary.medsBn,
      '',
      'বিপদের লক্ষণ:',
      ...summary.dangerSignsBn.map((s, i) => `• ${s} (${summary.dangerSignsEn[i] ?? ''})`),
      '',
      'Advisory only. Not a substitute for professional medical advice.',
    ].join('\n');

    try {
      await Share.share({ message: shareText, title: 'Codoctor Health Record' });
    } catch {
      // user cancelled
    }
  };

  const isRed = summary.tone === 'red' || summary.refer;
  const urgencyBg = isRed ? colors.red50 : colors.amber50;
  const urgencyBorder = isRed ? colors.red500 : colors.amber500;
  const urgencyText = isRed ? colors.red700 : colors.amber700;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopAppBar
        showLogo={false}
        title="স্বাস্থ্য রেকর্ড"
        subtitle="Health record"
        leftIcon={{
          family: 'ion',
          name: 'chevron-back',
          onPress: () => navigation.goBack(),
        }}
        rightIcon={{
          family: 'ion',
          name: 'share-outline',
          onPress: handleShare,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Read aloud button — top priority */}
        <Animated.View
          style={[styles.ttsCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity
            style={[
              styles.ttsBtn,
              speechState === 'speaking' && styles.ttsBtnActive,
            ]}
            onPress={handleSpeak}
            activeOpacity={0.85}
          >
            <View style={styles.ttsBtnIconWrap}>
              <Ionicons
                name={speechState === 'speaking' ? 'stop' : 'volume-high'}
                size={24}
                color={colors.white}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ttsBtnTitle}>
                {speechState === 'speaking'
                  ? 'পড়া বন্ধ করুন · Stop'
                  : speechState === 'done'
                  ? 'আবার পড়ুন · Read again'
                  : 'বাংলায় পড়ুন · Read aloud in Bangla'}
              </Text>
              <Text style={styles.ttsBtnSub}>
                {speechState === 'speaking'
                  ? 'আপনার স্বাস্থ্য তথ্য পড়া হচ্ছে…'
                  : 'Tap to hear your health summary'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Urgency / referral banner */}
        {summary.refer && (
          <View
            style={[
              styles.urgencyBanner,
              { backgroundColor: urgencyBg, borderColor: urgencyBorder },
            ]}
          >
            <View
              style={[
                styles.urgencyIconWrap,
                { backgroundColor: urgencyBorder },
              ]}
            >
              <Ionicons name="alert" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.urgencyTitle, { color: urgencyText }]}>
                {summary.actionBn}
              </Text>
              <Text style={[styles.urgencyEn, { color: urgencyText }]}>
                {summary.actionEn}
              </Text>
            </View>
          </View>
        )}

        {/* Condition card */}
        <SummaryCard
          label="রোগ নির্ণয় · Condition"
          iconFamily="mci"
          icon="stethoscope"
          color={colors.brand600}
        >
          <Text style={sCardStyles.textBn}>{summary.conditionBn}</Text>
          <Text style={sCardStyles.textEn}>{summary.conditionEn}</Text>
          <Text style={sCardStyles.textBn}>{summary.meaningBn}</Text>
          <Text style={sCardStyles.textEn}>{summary.meaningEn}</Text>
        </SummaryCard>

        {/* Medicines card */}
        <SummaryCard
          label="ওষুধ · Medicines"
          iconFamily="mci"
          icon="pill"
          color={colors.indigo600}
        >
          <Text style={sCardStyles.textBn}>{summary.medsBn}</Text>
          <Text style={sCardStyles.textEn}>{summary.medsEn}</Text>
        </SummaryCard>

        {/* Danger signs card */}
        <SummaryCard
          label="বিপদের লক্ষণ · Danger signs"
          iconFamily="ion"
          icon="alert-circle"
          color={colors.red600}
          dangerous
        >
          <Text style={sCardStyles.dangerHeading}>
            এই লক্ষণ দেখলেই হাসপাতালে যান —
          </Text>
          <Text style={sCardStyles.textEn}>
            Go to hospital immediately if you see any of these:
          </Text>
          <View style={sCardStyles.dangerList}>
            {summary.dangerSignsBn.map((sign, i) => (
              <View key={i} style={sCardStyles.dangerRow}>
                <View style={sCardStyles.dangerBullet}>
                  <Ionicons name="warning" size={16} color={colors.red600} />
                </View>
                <View style={sCardStyles.dangerTextBlock}>
                  <Text style={sCardStyles.dangerBn}>{sign}</Text>
                  {summary.dangerSignsEn[i] && (
                    <Text style={sCardStyles.dangerEn}>{summary.dangerSignsEn[i]}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </SummaryCard>

        {/* Citations */}
        {summary.citations && summary.citations.length > 0 && (
          <View style={styles.citationsSection}>
            <Text style={styles.citationsLabel}>Based on</Text>
            {summary.citations.map((c, i) => (
              <CitationBadge key={i} source={c.source} ref={c.ref} />
            ))}
          </View>
        )}

        {/* Advisory disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark" size={16} color={colors.inkMuted} />
          <Text style={styles.disclaimerText}>
            Advisory only. Codoctor does not diagnose or prescribe autonomously.
            All prompts are reviewed by a licensed doctor. Keep this record and
            show it at your next visit.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.shareFullBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color={colors.white} />
            <Text style={styles.shareFullBtnText}>Share this record</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('Main')}
          >
            <Ionicons name="chevron-back" size={16} color={colors.inkSoft} />
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  iconFamily,
  icon,
  color,
  dangerous,
  children,
}: {
  label: string;
  iconFamily: 'ion' | 'mci';
  icon: string;
  color: string;
  dangerous?: boolean;
  children: React.ReactNode;
}) {
  const Icon = iconFamily === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <View
      style={[
        sCardStyles.card,
        dangerous && {
          borderColor: colors.red200,
          backgroundColor: colors.red50,
        },
      ]}
    >
      <View style={sCardStyles.header}>
        <View style={[sCardStyles.iconWrap, { backgroundColor: `${color}15` }]}>
          <Icon name={icon as any} size={18} color={color} />
        </View>
        <Text style={[sCardStyles.label, { color }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

// ── StyleSheets ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: {
    padding: spacing.base,
    paddingBottom: 48,
    gap: spacing.md,
  },

  // TTS card
  ttsCard: {
    ...shadow.md,
  },
  ttsBtn: {
    backgroundColor: colors.brand500,
    borderRadius: 22,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ttsBtnActive: {
    backgroundColor: colors.red500,
  },
  ttsBtnIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ttsBtnTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 20,
  },
  ttsBtnSub: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  // Urgency banner
  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 2,
    borderRadius: 16,
    padding: spacing.base,
  },
  urgencyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    lineHeight: 22,
  },
  urgencyEn: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    marginTop: 2,
  },

  citationsSection: {
    backgroundColor: colors.slate50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.md,
  },
  citationsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },

  disclaimer: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.slate50,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  disclaimerText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    lineHeight: 17,
  },

  bottomButtons: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  shareFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand500,
    borderRadius: 14,
    paddingVertical: 14,
    ...shadow.sm,
  },
  shareFullBtnText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
  },
  homeBtnText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.inkSoft,
  },
});

const sCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
    gap: spacing.md,
    ...shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  textBn: {
    fontSize: fontSize.base,
    color: colors.ink,
    lineHeight: 23,
    fontWeight: '500',
  },
  textEn: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  dangerHeading: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.red600,
  },
  dangerList: {
    gap: spacing.sm,
  },
  dangerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  dangerBullet: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  dangerTextBlock: { flex: 1 },
  dangerBn: {
    fontSize: fontSize.base,
    color: colors.ink,
    fontWeight: '600',
    lineHeight: 21,
  },
  dangerEn: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
