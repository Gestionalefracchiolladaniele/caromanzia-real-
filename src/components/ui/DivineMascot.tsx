import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const GOLD = '#D4AF37';
const VIOLET = '#5a2d9a';
const GOLD_RGB = { r: 212, g: 175, b: 55 };
const VIOLET_RGB = { r: 90, g: 45, b: 154 };
const PARTICLE_COUNT = 40;

function srnd(a: number, b: number, seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return a + (x - Math.floor(x)) * (b - a);
}

interface PData {
  bx: number; by: number; r: number; isGold: boolean;
  ampX: number; ampY: number;
  phX: number; phY: number; phA: number;
  spdX: number; spdY: number; spdA: number;
  bAlpha: number; pAmp: number;
}

function Particle({ p, t }: { p: PData; t: Animated.SharedValue<number> }) {
  const col = p.isGold ? GOLD_RGB : VIOLET_RGB;
  const size = p.r * 2;
  const glowSize = p.r * 9;

  const animStyle = useAnimatedStyle(() => {
    const x = p.bx + Math.sin(t.value * (1 / p.spdX) + p.phX) * p.ampX;
    const y = p.by + Math.cos(t.value * (1 / p.spdY) + p.phY) * p.ampY;
    const alpha = Math.max(0.08, Math.min(1, p.bAlpha + Math.sin(t.value * (1 / p.spdA) + p.phA) * p.pAmp));
    return {
      transform: [{ translateX: x - p.r }, { translateY: y - p.r }],
      opacity: alpha,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const x = p.bx + Math.sin(t.value * (1 / p.spdX) + p.phX) * p.ampX;
    const y = p.by + Math.cos(t.value * (1 / p.spdY) + p.phY) * p.ampY;
    const alpha = Math.max(0.04, Math.min(0.4, (p.bAlpha + Math.sin(t.value * (1 / p.spdA) + p.phA) * p.pAmp) * 0.35));
    return {
      transform: [{ translateX: x - glowSize / 2 }, { translateY: y - glowSize / 2 }],
      opacity: alpha,
    };
  });

  return (
    <>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.abs,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: `rgb(${col.r},${col.g},${col.b})`,
            shadowColor: `rgb(${col.r},${col.g},${col.b})`,
            shadowRadius: glowSize * 0.6,
            shadowOpacity: 1,
            shadowOffset: { width: 0, height: 0 },
          },
          glowStyle,
        ]}
      />
      {/* Core */}
      <Animated.View
        style={[
          styles.abs,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: `rgb(${col.r},${col.g},${col.b})`,
            shadowColor: `rgb(${col.r},${col.g},${col.b})`,
            shadowRadius: p.r * 2,
            shadowOpacity: 1,
            shadowOffset: { width: 0, height: 0 },
          },
          animStyle,
        ]}
      />
      {/* White center dot */}
      <Animated.View
        style={[
          styles.abs,
          {
            width: size * 0.45,
            height: size * 0.45,
            borderRadius: size * 0.225,
            backgroundColor: 'rgba(255,255,255,0.92)',
            left: size * 0.275,
            top: size * 0.275,
          },
          animStyle,
        ]}
      />
    </>
  );
}

interface DivineMascotProps {
  message: string;
  width?: number;
}

export function DivineMascot({ message, width = 320 }: DivineMascotProps) {
  const H = 130;
  const CX = width / 2;
  const CY = H / 2;
  const hw = width * 0.38;

  const particles = useMemo<PData[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const isGold = srnd(0, 1, i * 7.3) < 0.6;
      return {
        bx: srnd(CX - 120, CX + 120, i * 3.1),
        by: srnd(CY - 25, CY + 25, i * 5.7),
        r: isGold ? srnd(3.5, 7, i * 2.3) : srnd(3, 6, i * 4.1),
        isGold,
        ampX: srnd(22, 50, i * 1.9),
        ampY: srnd(5, 15, i * 6.2),
        phX: srnd(0, Math.PI * 2, i * 0.8),
        phY: srnd(0, Math.PI * 2, i * 1.4),
        phA: srnd(0, Math.PI * 2, i * 2.1),
        spdX: srnd(2000, 4000, i * 0.7),
        spdY: srnd(2800, 5600, i * 1.3),
        spdA: srnd(1200, 2800, i * 2.9),
        bAlpha: srnd(0.75, 1.0, i * 8.1),
        pAmp: srnd(0.15, 0.3, i * 3.7),
      };
    }), [CX, CY]);

  const sparks = useMemo(() => [
    { x: CX - hw,           y: CY - 8,  v: true  },
    { x: CX + hw,           y: CY + 6,  v: false },
    { x: CX - hw * 0.8,     y: CY - 30, v: false },
    { x: CX + hw * 0.8,     y: CY + 28, v: true  },
    { x: CX - hw * 0.4,     y: CY - 38, v: false },
    { x: CX + hw * 0.43,    y: CY - 36, v: false },
    { x: CX - width * 0.05, y: CY + 38, v: true  },
    { x: CX + width * 0.08, y: CY + 36, v: false },
    { x: CX - hw * 0.63,    y: CY + 32, v: false },
    { x: CX + hw * 0.65,    y: CY - 32, v: true  },
    { x: CX,                y: CY - 40, v: false },
    { x: CX + width * 0.01, y: CY + 40, v: false },
  ], [CX, CY, hw, width]);

  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(20000, { duration: 20000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, []);

  return (
    <View style={[styles.container, { width, height: H + 28 }]}>
      <View style={{ width, height: H, overflow: 'hidden' }}>
        {particles.map((p, i) => (
          <Particle key={i} p={p} t={t} />
        ))}
        {/* Static sparks */}
        {sparks.map((s, i) => (
          <View
            key={`sk${i}`}
            style={[
              styles.abs,
              {
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: s.v ? VIOLET : GOLD,
                left: s.x - 5,
                top: s.y - 5,
                shadowColor: s.v ? VIOLET : GOLD,
                shadowRadius: 6,
                shadowOpacity: 0.9,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  abs: {
    position: 'absolute',
  },
  message: {
    color: 'rgba(212,175,55,0.85)',
    fontFamily: 'Georgia',
    fontSize: 13,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginTop: 4,
  },
});
