import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

interface ChipsProps {
  items: string[];
  onSelect?: (index: number, item: string) => void;
}

export function Chips({ items, onSelect }: ChipsProps) {
  const [active, setActive] = useState(0);

  const handlePress = (i: number) => {
    setActive(i);
    onSelect?.(i, items[i]);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((chip, i) => {
        const isActive = active === i;
        return (
          <Pressable
            key={i}
            onPress={() => handlePress(i)}
            style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
          >
            <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
              {chip}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  chipActive: {
    backgroundColor: '#D4AF37',
    borderWidth: 1.5,
    borderColor: '#F0D060',
  },
  chipInactive: {
    backgroundColor: 'rgba(52,26,106,0.85)',
    borderWidth: 1.5,
    borderColor: '#6B5010',
  },
  chipText: {
    fontFamily: 'Georgia',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: '#0d0918',
  },
  chipTextInactive: {
    color: '#D4AF37',
  },
});
