import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

interface Props {
  source: string;
  ref: string;
}

export function CitationBadge({ source, ref: refText }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>📖</Text>
      <Text style={styles.text} numberOfLines={2}>
        {source} — {refText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
    marginTop: spacing.xs,
  },
  icon: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  text: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    flex: 1,
    lineHeight: 16,
  },
});
