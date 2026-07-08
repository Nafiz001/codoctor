// Respiratory-rate measuring tool. Standard IMCI practice: count each breath for
// 60 seconds. The clinician taps once per breath; we time it and, if they stop
// early, extrapolate to a per-minute rate. Fully offline. Feeds the deterministic
// IMCI engine (fast-breathing thresholds are age-specific).

import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, shadow } from '../lib/theme';

const DURATION = 60; // seconds

export default function RrCounter({
  visible,
  onClose,
  onResult,
}: {
  visible: boolean;
  onClose: () => void;
  onResult: (rr: number) => void;
}) {
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) reset();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [visible]);

  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setCount(0);
    setElapsed(0);
    setRunning(false);
  };

  const startOnFirstTap = () => {
    if (running) return;
    setRunning(true);
    timer.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= DURATION) {
          if (timer.current) clearInterval(timer.current);
          setRunning(false);
          return DURATION;
        }
        return e + 1;
      });
    }, 1000);
  };

  const tap = () => {
    if (!running && elapsed === 0) startOnFirstTap();
    if (elapsed >= DURATION) return;
    setCount((c) => c + 1);
  };

  // Extrapolate to a full minute if stopped early (need a few seconds first).
  const rr = elapsed > 0 ? Math.round((count / Math.max(elapsed, 1)) * 60) : 0;
  const canUse = count > 0 && elapsed >= 10;

  const finish = () => {
    onResult(rr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Measure breathing rate</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.inkMuted} /></TouchableOpacity>
          </View>
          <Text style={styles.help}>
            Watch the child’s chest. Tap the circle once for every breath. Timer
            starts on your first tap; aim for a full 60 seconds.
          </Text>

          <View style={styles.readouts}>
            <View style={styles.readout}><Text style={styles.readoutVal}>{count}</Text><Text style={styles.readoutLbl}>breaths</Text></View>
            <View style={styles.readout}><Text style={styles.readoutVal}>{DURATION - elapsed}s</Text><Text style={styles.readoutLbl}>left</Text></View>
            <View style={styles.readout}><Text style={[styles.readoutVal, { color: colors.brand600 }]}>{rr || '—'}</Text><Text style={styles.readoutLbl}>per min</Text></View>
          </View>

          <TouchableOpacity style={styles.tapZone} onPress={tap} activeOpacity={0.7}>
            <Ionicons name="fitness" size={40} color={colors.white} />
            <Text style={styles.tapText}>{elapsed === 0 ? 'Tap to start' : elapsed >= DURATION ? 'Done' : 'Tap each breath'}</Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.useBtn, !canUse && { opacity: 0.4 }]}
              onPress={finish}
              disabled={!canUse}
            >
              <Text style={styles.useText}>Use {rr}/min</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, gap: spacing.base, ...shadow.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.ink },
  help: { fontSize: fontSize.sm, color: colors.inkMuted, lineHeight: 19 },
  readouts: { flexDirection: 'row', justifyContent: 'space-around' },
  readout: { alignItems: 'center' },
  readoutVal: { fontSize: 28, fontWeight: '800', color: colors.ink },
  readoutLbl: { fontSize: fontSize.xs, color: colors.inkMuted },
  tapZone: { backgroundColor: colors.brand500, borderRadius: 24, paddingVertical: 36, alignItems: 'center', gap: spacing.sm, ...shadow.md },
  tapText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.md },
  resetBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.slate300, backgroundColor: colors.white },
  resetText: { fontSize: fontSize.base, fontWeight: '600', color: colors.inkSoft },
  useBtn: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: colors.emerald600 },
  useText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
});
