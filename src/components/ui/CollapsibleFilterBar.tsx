import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface CollapsibleFilterBarProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export function CollapsibleFilterBar({
  label,
  options,
  selected,
  onSelect,
}: CollapsibleFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header cliccabile */}
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={[styles.header, isOpen && styles.headerOpen]}
      >
        <Text style={styles.headerText}>
          {label} <Text style={styles.dropdown}>{isOpen ? '▲' : '▼'}</Text>
        </Text>
        <Text style={styles.selectedValue}>{selected}</Text>
      </Pressable>

      {/* Menu espandibile */}
      {isOpen && (
        <View style={styles.menu}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  onSelect(opt);
                  setIsOpen(false);
                }}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 120,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#6B5010',
    backgroundColor: 'rgba(52,26,106,0.6)',
  },
  headerOpen: {
    backgroundColor: '#5a2d9a',
    borderColor: '#D4AF37',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a890c8',
    letterSpacing: 0.6,
    fontFamily: 'Georgia',
  },
  selectedValue: {
    fontSize: 10,
    color: '#D4AF37',
    fontWeight: '500',
    marginLeft: 4,
  },
  dropdown: {
    fontSize: 9,
    color: '#D4AF37',
    marginLeft: 3,
  },
  menu: {
    marginTop: 4,
    backgroundColor: 'rgba(36,21,80,0.95)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B7020',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#5a2d9a',
    borderColor: '#D4AF37',
  },
  chipInactive: {
    backgroundColor: 'rgba(52,26,106,0.7)',
    borderColor: '#6B5010',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#D4AF37',
  },
  chipTextInactive: {
    color: '#a890c8',
  },
});
