import React from 'react';
import { View, StyleSheet } from 'react-native';

const PARTICLES = [
  // Gold particles
  { x: 6,  y: 5,  r: 4.5, gold: true  },
  { x: 18, y: 3,  r: 3.5, gold: true  },
  { x: 24, y: 9,  r: 5,   gold: true  },
  { x: 12, y: 14, r: 3,   gold: true  },
  { x: 4,  y: 18, r: 4,   gold: true  },
  { x: 22, y: 20, r: 3.5, gold: true  },
  // Violet particles
  { x: 14, y: 6,  r: 3.5, gold: false },
  { x: 8,  y: 22, r: 4,   gold: false },
  { x: 20, y: 14, r: 3,   gold: false },
  { x: 3,  y: 11, r: 3,   gold: false },
];

interface ParticlesIconProps {
  size?: number;
}

export function ParticlesIcon({ size = 28 }: ParticlesIconProps) {
  const scale = size / 28;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {PARTICLES.map((p, i) => {
        const ps = p.r * 2 * scale;
        return (
          <View
            key={i}
            style={[
              styles.particle,
              {
                width: ps,
                height: ps,
                borderRadius: ps / 2,
                left: p.x * scale - ps / 2,
                top: p.y * scale - ps / 2,
                backgroundColor: p.gold ? '#D4AF37' : '#5a2d9a',
                shadowColor: p.gold ? '#D4AF37' : '#8B5CF6',
                shadowRadius: ps * 0.8,
                shadowOpacity: 0.9,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  particle: {
    position: 'absolute',
  },
});
