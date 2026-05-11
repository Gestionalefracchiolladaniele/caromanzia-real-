import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DreamSymbol } from '@/types';

interface Props {
  symbols: DreamSymbol[];
}

export function SymbolExtractDisplay({ symbols }: Props) {
  if (symbols.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Nessun simbolo riconosciuto. L'interpretazione si baserà sul testo integrale del sogno.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Simboli riconosciuti</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {symbols.map((s) => (
          <View key={s.symbol} style={styles.chip}>
            <Text style={styles.chipSymbol}>{s.symbol}</Text>
            <Text style={styles.chipMeaning} numberOfLines={2}>
              {s.meaning}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  heading: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    backgroundColor: '#1e1630',
    borderWidth: 1,
    borderColor: '#3d1b69',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 130,
  },
  chipSymbol: {
    color: '#D4AF37',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 3,
    textTransform: 'capitalize',
  },
  chipMeaning: {
    color: '#a89bc2',
    fontSize: 11,
    lineHeight: 15,
  },
  empty: {
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#1e1630',
    borderRadius: 10,
  },
  emptyText: {
    color: '#6b5e8a',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
