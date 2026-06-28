import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import { CitationBadge } from './CitationBadge';

interface DangerAlertProps {
  titleBn: string;
  titleEn: string;
  trigger: string;
  action: string;
  citation: { source: string; ref: string };
}

export function DangerAlertCard({
  titleBn,
  titleEn,
  trigger,
  action,
  citation,
}: DangerAlertProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.92, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, styles.danger, { transform: [{ scale: pulse }] }]}>
      <View style={styles.topRow}>
        <Text style={styles.icon}>🔴</Text>
        <Text style={styles.label}>DANGER SIGN — Deterministic</Text>
      </View>
      <Text style={styles.titleBn}>{titleBn}</Text>
      <Text style={styles.titleEn}>{titleEn}</Text>

      <View style={styles.row}>
        <Text style={styles.fieldLabel}>Trigger</Text>
        <Text style={styles.fieldValue}>{trigger}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.fieldLabel}>Action</Text>
        <Text style={styles.fieldValue}>{action}</Text>
      </View>

      <CitationBadge source={citation.source} ref={citation.ref} />
    </Animated.View>
  );
}

interface MedAlertProps {
  drug: string;
  titleBn: string;
  titleEn: string;
  reason: string;
  alternative: string;
  citation: { source: string; ref: string };
}

export function MedSafetyCard({
  drug,
  titleBn,
  titleEn,
  reason,
  alternative,
  citation,
}: MedAlertProps) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        styles.medSafety,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.label}>MED-SAFETY — Deterministic</Text>
      </View>
      <View style={styles.drugPill}>
        <Text style={styles.drugName}>{drug}</Text>
      </View>
      <Text style={styles.titleBn}>{titleBn}</Text>
      <Text style={styles.titleEn}>{titleEn}</Text>

      <View style={styles.row}>
        <Text style={styles.fieldLabel}>Reason</Text>
        <Text style={styles.fieldValue}>{reason}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.fieldLabel}>Alternative</Text>
        <Text style={styles.fieldValue}>{alternative}</Text>
      </View>

      <CitationBadge source={citation.source} ref={citation.ref} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1.5,
  },
  danger: {
    backgroundColor: colors.red50,
    borderColor: colors.red500,
  },
  medSafety: {
    backgroundColor: colors.amber50,
    borderColor: colors.amber500,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleBn: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
    lineHeight: 22,
  },
  titleEn: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  drugPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amber500,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  drugName: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  row: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    lineHeight: 18,
  },
});
