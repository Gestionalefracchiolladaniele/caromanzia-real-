import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { TitleBox } from '@/components/ui/TitleBox';

export default function ReadingsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <TitleBox title="LETTURE" subtitle="Storico letture cartomante" />
      <View style={styles.placeholder}>
        <Text style={styles.text}>Letture cartomante — FASE 4E</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#140d2e' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#a890c8', fontSize: 16 },
});
