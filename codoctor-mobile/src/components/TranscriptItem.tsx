import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import type { TranscriptLine } from '../lib/demo-data';

interface Props {
  line: TranscriptLine;
}

export function TranscriptItem({ line }: Props) {
  const isDoctor = line.speaker === 'doctor';

  return (
    <View style={[styles.row, isDoctor ? styles.rowDoctor : styles.rowPatient]}>
      {/* Avatar */}
      <View style={[styles.avatar, isDoctor ? styles.avatarDoctor : styles.avatarPatient]}>
        <Text style={styles.avatarText}>{isDoctor ? '👨‍⚕️' : '👤'}</Text>
      </View>

      {/* Bubble */}
      <View style={[styles.bubble, isDoctor ? styles.bubbleDoctor : styles.bubblePatient]}>
        {/* Speaker label */}
        <View style={styles.headerRow}>
          <Text style={[styles.speakerLabel, isDoctor ? styles.labelDoctor : styles.labelPatient]}>
            {isDoctor ? 'Doctor' : 'Patient'}
          </Text>
          {line.fused && (
            <View style={styles.fusedBadge}>
              <Text style={styles.fusedText}>⚡ fused</Text>
            </View>
          )}
          <Text style={styles.conf}>{Math.round(line.conf * 100)}%</Text>
        </View>

        {/* Bangla text */}
        <Text style={styles.bn}>{line.bn}</Text>

        {/* English gloss */}
        <Text style={styles.en}>{line.en}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  rowDoctor: {
    flexDirection: 'row',
  },
  rowPatient: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarDoctor: {
    backgroundColor: colors.brand100,
  },
  avatarPatient: {
    backgroundColor: colors.slate100,
  },
  avatarText: {
    fontSize: 16,
  },
  bubble: {
    flex: 1,
    maxWidth: '80%',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bubbleDoctor: {
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand100,
    borderTopLeftRadius: 2,
  },
  bubblePatient: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderTopRightRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  speakerLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  labelDoctor: {
    color: colors.brand600,
  },
  labelPatient: {
    color: colors.inkMuted,
  },
  fusedBadge: {
    backgroundColor: colors.indigo100,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  fusedText: {
    fontSize: 10,
    color: colors.indigo600,
    fontWeight: '600',
  },
  conf: {
    fontSize: 10,
    color: colors.inkFaint,
    marginLeft: 'auto',
  },
  bn: {
    fontSize: fontSize.base,
    color: colors.ink,
    lineHeight: 22,
    fontWeight: '500',
  },
  en: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: 3,
    fontStyle: 'italic',
  },
});
