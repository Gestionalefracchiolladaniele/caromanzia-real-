import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface FilterBarProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export function FilterBar({ label, options, selected, onSelect }: FilterBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} <Text style={styles.dropdown}>▼</Text>
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            style={[
              styles.chip,
              selected === opt ? styles.chipActive : styles.chipInactive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selected === opt ? styles.chipTextActive : styles.chipTextInactive,
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a890c8',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontFamily: 'Georgia',
  },
  dropdown: {
    fontSize: 10,
    color: '#D4AF37',
    marginLeft: 4,
  },
  scrollContent: {
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#5a2d9a',
    borderColor: '#D4AF37',
  },
  chipInactive: {
    backgroundColor: 'rgba(52,26,106,0.5)',
    borderColor: 'rgba(168,144,200,0.3)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#D4AF37',
  },
  chipTextInactive: {
    color: '#a890c8',
  },
});
