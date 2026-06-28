import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

interface Props {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string[];
}

export function SoapNote({ subjective, objective, assessment, plan }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Auto-drafted SOAP Note</Text>
      <Text style={styles.subheading}>Review and confirm with one tap</Text>

      <View style={styles.divider} />

      <Section label="S — Subjective" text={subjective} color={colors.brand600} />
      <Section label="O — Objective" text={objective} color={colors.sky600} />
      <Section label="A — Assessment" text={assessment} color={colors.amber600} />

      <View style={styles.planSection}>
        <Text style={[sectionStyles.label, { color: colors.emerald600 }]}>
          P — Plan
        </Text>
        {plan.map((item, i) => (
          <View key={i} style={styles.planRow}>
            <Text style={styles.planBullet}>{i + 1}.</Text>
            <Text style={styles.planText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Section({
  label,
  text,
  color,
}: {
  label: string;
  text: string;
  color: string;
}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.label, { color }]}>{label}</Text>
      <Text style={sectionStyles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.base,
  },
  heading: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
  },
  subheading: {
    fontSize: fontSize.xs,
    color: colors.inkFaint,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate200,
    marginBottom: spacing.md,
  },
  planSection: {
    marginTop: spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  planBullet: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.emerald600,
    width: 18,
  },
  planText: {
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    flex: 1,
    lineHeight: 18,
  },
});

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    lineHeight: 19,
  },
});
