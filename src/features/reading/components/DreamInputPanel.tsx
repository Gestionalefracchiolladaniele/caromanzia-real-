import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getTopSymbols } from '../dream-processor';
import { useReadingStore } from '../reading-store';

const MIN_CHARS = 20;
const MAX_CHARS = 1000;

export function DreamInputPanel() {
  const { dreamText, dreamQuestion, setDreamText, setDreamQuestion, setExtractedSymbols, setPhase } =
    useReadingStore((s) => ({
      dreamText: s.dreamText,
      dreamQuestion: s.dreamQuestion,
      setDreamText: s.setDreamText,
      setDreamQuestion: s.setDreamQuestion,
      setExtractedSymbols: s.setExtractedSymbols,
      setPhase: s.setPhase,
    }));

  const [isProcessing, setIsProcessing] = useState(false);

  const charCount = dreamText.length;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  function handleAnalyse() {
    if (!isValid) return;
    setIsProcessing(true);
    // Symbol extraction is sync — wrapped in setTimeout to allow UI to show spinner
    setTimeout(() => {
      const symbols = getTopSymbols(dreamText, 8);
      setExtractedSymbols(symbols);
      setIsProcessing(false);
      setPhase('dream_processing');
    }, 400);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Racconta il tuo sogno</Text>
      <Text style={styles.subtitle}>
        Descrivi liberamente cosa hai sognato. Più dettagli fornisci, più precisa sarà l'interpretazione.
      </Text>

      <TextInput
        style={styles.textArea}
        value={dreamText}
        onChangeText={setDreamText}
        placeholder="Stamattina sognavo di volare sopra una foresta oscura, poi..."
        placeholderTextColor="#6b5e8a"
        multiline
        maxLength={MAX_CHARS}
        textAlignVertical="top"
        returnKeyType="default"
        blurOnSubmit={false}
      />

      <Text style={[styles.charCount, charCount > MAX_CHARS * 0.9 && styles.charCountWarn]}>
        {charCount}/{MAX_CHARS}
      </Text>

      <TextInput
        style={styles.questionInput}
        value={dreamQuestion}
        onChangeText={setDreamQuestion}
        placeholder="Hai una domanda specifica? (opzionale)"
        placeholderTextColor="#6b5e8a"
        returnKeyType="done"
        maxLength={200}
      />

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleAnalyse}
        disabled={!isValid || isProcessing}
        activeOpacity={0.8}
      >
        {isProcessing ? (
          <ActivityIndicator color="#100c1e" />
        ) : (
          <Text style={styles.buttonText}>Analizza Sogno</Text>
        )}
      </TouchableOpacity>

      {charCount > 0 && charCount < MIN_CHARS && (
        <Text style={styles.hint}>Ancora {MIN_CHARS - charCount} caratteri minimi</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#100c1e',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#a89bc2',
    marginBottom: 16,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: '#1e1630',
    borderWidth: 1,
    borderColor: '#3d1b69',
    borderRadius: 12,
    padding: 14,
    color: '#f0e6ff',
    fontSize: 15,
    minHeight: 160,
    maxHeight: 260,
    lineHeight: 22,
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: 11,
    color: '#6b5e8a',
  },
  charCountWarn: {
    color: '#e07b39',
  },
  questionInput: {
    marginTop: 14,
    backgroundColor: '#1e1630',
    borderWidth: 1,
    borderColor: '#3d1b69',
    borderRadius: 10,
    padding: 12,
    color: '#f0e6ff',
    fontSize: 14,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#100c1e',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  hint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#6b5e8a',
  },
});
