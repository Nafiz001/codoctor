import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '../lib/theme';

interface LogoMarkProps {
  size?: number;
}

export function LogoMark({ size = 40 }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B85C38" />
          <Stop offset="1" stopColor="#813F27" />
        </LinearGradient>
      </Defs>
      <Rect width="32" height="32" rx="7" fill="url(#logoGrad)" />
      {/* Listening arcs (sound waves) */}
      <Path
        d="M21 9a10 10 0 0 1 0 14"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity={0.85}
      />
      <Path
        d="M24.5 6a15.5 15.5 0 0 1 0 20"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity={0.45}
      />
      {/* Clinical plus (cross) */}
      <Rect x="7" y="13.4" width="13" height="5.2" rx="2.6" fill="white" />
      <Rect x="10.9" y="9.5" width="5.2" height="13" rx="2.6" fill="white" />
    </Svg>
  );
}

interface LogoRowProps {
  size?: number;
  showBangla?: boolean;
}

export function LogoRow({ size = 36, showBangla = false }: LogoRowProps) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      <View style={styles.textBlock}>
        <Text style={[styles.name, { fontSize: size * 0.56 }]}>
          Co<Text style={styles.nameAccent}>doctor</Text>
        </Text>
        {showBangla && <Text style={[styles.nameBn, { fontSize: size * 0.34 }]}>কো-ডক্টর</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textBlock: {
    justifyContent: 'center',
  },
  name: {
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  nameAccent: {
    color: colors.brand600 ?? colors.brand500,
  },
  nameBn: {
    color: colors.brand500,
    fontWeight: '600',
    marginTop: -2,
  },
});
