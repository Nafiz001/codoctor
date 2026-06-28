import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import { LogoRow } from './LogoMark';

interface TopAppBarProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  leftIcon?: { family?: 'ion' | 'mci'; name: string; onPress: () => void };
  rightIcon?: { family?: 'ion' | 'mci'; name: string; onPress: () => void };
  badge?: string;
}

/**
 * Sticky top app bar with brand logo, optional title, and round icon buttons.
 * Used on stack screens (Demo, LiveDoctor, Summary) above content.
 */
export default function TopAppBar({
  title,
  subtitle,
  showLogo = true,
  leftIcon,
  rightIcon,
  badge,
}: TopAppBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + 8, height: insets.top + 56 },
      ]}
    >
      <View style={styles.row}>
        {/* Left */}
        {leftIcon ? (
          <RoundIconButton {...leftIcon} side="left" />
        ) : showLogo ? (
          <View style={styles.logoWrap}>
            <LogoRow size={26} />
          </View>
        ) : (
          <View style={styles.spacer} />
        )}

        {/* Center */}
        {(title || badge) && (
          <View style={styles.center}>
            {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
            {badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
        )}

        {/* Right */}
        {rightIcon ? (
          <RoundIconButton {...rightIcon} side="right" />
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
}

function RoundIconButton({
  family = 'ion',
  name,
  onPress,
  side,
}: {
  family?: 'ion' | 'mci';
  name: string;
  onPress: () => void;
  side: 'left' | 'right';
}) {
  const Icon = family === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.iconBtn, side === 'right' && styles.iconBtnRight]}
      accessibilityRole="button"
    >
      <Icon name={name as any} size={20} color={colors.ink} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.base,
    paddingBottom: 10,
    justifyContent: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  logoWrap: {
    flex: 1,
  },
  center: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.inkMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  badge: {
    marginTop: 4,
    backgroundColor: colors.brand50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand200,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand600,
    letterSpacing: 0.3,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  iconBtnRight: {},
  spacer: {
    width: 38,
  },
});