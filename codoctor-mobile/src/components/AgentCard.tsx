import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fontSize, radius, spacing, TONE_PALETTES } from '../lib/theme';
import { CitationBadge } from './CitationBadge';
import type { AgentEvent, AgentKey } from '../lib/demo-data';
import { AGENT_BY_KEY } from '../lib/demo-data';

const STATUS_ICONS: Record<string, string> = {
  info: 'ℹ️',
  working: '⚙️',
  flag: '🚩',
  critical: '🔴',
  ok: '✅',
};

interface Props {
  event: AgentEvent;
}

export function AgentCard({ event }: Props) {
  const agent = AGENT_BY_KEY[event.agent as AgentKey];
  const tone = agent?.tone ?? 'slate';
  const palette = TONE_PALETTES[tone];
  const isCritical = event.status === 'critical';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: palette.bg,
          borderColor: isCritical ? colors.red500 : palette.border,
          borderWidth: isCritical ? 1.5 : 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.agentBadge, { backgroundColor: palette.badge }]}>
          <Text style={[styles.agentBadgeText, { color: palette.badgeText }]}>
            {agent?.nameBn ?? event.agent}
          </Text>
        </View>
        <Text style={styles.statusIcon}>{STATUS_ICONS[event.status] ?? 'ℹ️'}</Text>
        {agent?.deterministic && (
          <View style={styles.detBadge}>
            <Text style={styles.detText}>deterministic</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, isCritical && { color: colors.red600 }]}>
        {event.title}
      </Text>

      {/* Detail */}
      <Text style={styles.detail}>{event.detail}</Text>

      {/* Citation */}
      {event.citation && (
        <CitationBadge source={event.citation.source} ref={event.citation.ref} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  agentBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  agentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusIcon: {
    fontSize: 14,
  },
  detBadge: {
    backgroundColor: colors.slate200,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  detText: {
    fontSize: 10,
    color: colors.slate700,
    fontWeight: '500',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 3,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    lineHeight: 18,
  },
});
