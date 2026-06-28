import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontSize, radius, shadow } from '../lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');

export interface TabBarItem {
  key: string;
  label: string;
  iconFamily?: 'ion' | 'mci';
  icon: string;
  iconActive: string;
}

interface FloatingTabBarProps {
  activeKey: string;
  items: TabBarItem[];
  onSelect: (key: string) => void;
}

/**
 * Floating glass-morphism bottom navigation bar.
 * Sits as a pill above the home indicator, not flush to the bottom.
 */
export default function FloatingTabBar({ activeKey, items, onSelect }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const slideIn = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  // Width: fit the screen with side margins, max 460 for tablets
  const barWidth = Math.min(SCREEN_W - 32, 460);
  const itemWidth = barWidth / items.length;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, 12) + 8,
          opacity: fadeIn,
          transform: [{ translateY: slideIn }],
        },
      ]}
    >
      <View style={[styles.shadow, { width: barWidth }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={60}
            tint="light"
            style={[styles.bar, { width: barWidth }]}
          >
            {items.map((it) => (
              <TabButton
                key={it.key}
                item={it}
                active={activeKey === it.key}
                width={itemWidth}
                onPress={() => onSelect(it.key)}
              />
            ))}
          </BlurView>
        ) : (
          // Android: solid translucent surface (BlurView less reliable on Android without extra setup)
          <View style={[styles.bar, styles.barAndroid, { width: barWidth }]}>
            {items.map((it) => (
              <TabButton
                key={it.key}
                item={it}
                active={activeKey === it.key}
                width={itemWidth}
                onPress={() => onSelect(it.key)}
              />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function TabButton({
  item,
  active,
  width,
  onPress,
}: {
  item: TabBarItem;
  active: boolean;
  width: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(active ? 1 : 0.85)).current;
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: active ? 1 : 0.85, useNativeDriver: true, friction: 7 }),
      Animated.timing(opacity, { toValue: active ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [active]);

  const IconFamily = item.iconFamily === 'mci' ? MaterialCommunityIcons : Ionicons;
  const iconName: any = active ? item.iconActive : item.icon;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.item, { width }]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
    >
      {/* Active pill background */}
      <Animated.View style={[styles.activePill, { opacity }]} />
      <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
        <IconFamily
          name={iconName}
          size={22}
          color={active ? colors.brand600 : colors.inkFaint}
        />
      </Animated.View>
      <Text
        style={[
          styles.label,
          { color: active ? colors.brand600 : colors.inkFaint },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shadow: {
    borderRadius: 28,
    ...shadow.lg,
    shadowColor: '#2A2320',
    shadowOpacity: 0.18,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 28,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
  },
  barAndroid: {
    backgroundColor: colors.surface,
    borderColor: colors.slate200,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  activePill: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    bottom: 4,
    borderRadius: 20,
    backgroundColor: colors.brand50,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});