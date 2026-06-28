import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

interface Props {
  patient: {
    id: string;
    name: string;
    nameBn: string;
    age: string;
    ageBn: string;
    sex: string;
    weightKg: number;
    allergies: string[];
    chronic: string[];
    meds: string[];
    lastVisit: { date: string; reason: string; note: string };
  };
}

export function PatientHeaderCard({ patient }: Props) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>🧒</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.nameBn}>{patient.nameBn}</Text>
          <Text style={styles.nameEn}>{patient.name}</Text>
          <View style={styles.pills}>
            <Pill text={patient.ageBn} />
            <Pill text={patient.sex} />
            <Pill text={`${patient.weightKg} kg`} />
          </View>
        </View>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>{patient.id}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Clinical info */}
      <View style={styles.grid}>
        <InfoRow
          label="Allergies"
          value={patient.allergies.join(', ')}
          danger
        />
        <InfoRow label="Chronic" value={patient.chronic.join(', ')} />
        <InfoRow label="Current meds" value={patient.meds.join(', ')} />
      </View>

      {/* Last visit */}
      <View style={styles.lastVisit}>
        <Text style={styles.lastVisitLabel}>Last visit · {patient.lastVisit.date}</Text>
        <Text style={styles.lastVisitReason}>{patient.lastVisit.reason}</Text>
        <Text style={styles.lastVisitNote}>{patient.lastVisit.note}</Text>
      </View>
    </View>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View style={pillStyles.pill}>
      <Text style={pillStyles.text}>{text}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View style={infoRowStyles.row}>
      <Text style={infoRowStyles.label}>{label}</Text>
      <Text style={[infoRowStyles.value, danger && infoRowStyles.dangerValue]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.base,
    gap: spacing.md,
    backgroundColor: colors.brand50,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  nameBn: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
  },
  nameEn: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  idBadge: {
    backgroundColor: colors.brand200,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  idText: {
    fontSize: 10,
    color: colors.brand700,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate200,
  },
  grid: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  lastVisit: {
    backgroundColor: colors.slate50,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    padding: spacing.base,
  },
  lastVisitLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  lastVisitReason: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  lastVisitNote: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    fontStyle: 'italic',
  },
});

const pillStyles = StyleSheet.create({
  pill: {
    backgroundColor: colors.brand100,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: fontSize.xs,
    color: colors.brand700,
    fontWeight: '600',
  },
});

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    width: 80,
    paddingTop: 1,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    flex: 1,
    lineHeight: 18,
  },
  dangerValue: {
    color: colors.red600,
    fontWeight: '600',
  },
});
