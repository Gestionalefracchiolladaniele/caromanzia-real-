import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ParticlesIcon } from '@/components/ui/ParticlesIcon';

const SUGGESTED_CHIPS = [
  'Approfondisci il passato',
  'Cosa dovrei fare?',
  'Cosa evitare?',
  'Cosa dice il futuro?',
];

interface FollowupPanelProps {
  aiText: string;
  isStreaming: boolean;
  followups: Array<{ question: string; answer: string }>;
  onAskFollowup: (question: string) => void;
  maxFollowups?: number;
}

export function FollowupPanel({ aiText, isStreaming, followups, onAskFollowup, maxFollowups = 3 }: FollowupPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const canAsk = followups.length < maxFollowups && !isStreaming;

  function handleAsk(q: string) {
    if (!canAsk || !q.trim()) return;
    onAskFollowup(q.trim());
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.divider} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Initial AI interpretation */}
        {aiText.length > 0 && (
          <View style={styles.bubbleWrap}>
            <View style={styles.skullIcon}>
              <ParticlesIcon size={28} />
            </View>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{aiText}</Text>
              {isStreaming && followups.length === 0 && (
                <ActivityIndicator size="small" color="#D4AF37" style={styles.spinner} />
              )}
            </View>
          </View>
        )}

        {/* Followup Q&A */}
        {followups.map((fu, i) => (
          <View key={i} style={styles.fuBlock}>
            {/* User question */}
            <View style={styles.userBubble}>
              <Text style={styles.userBubbleText}>{fu.question}</Text>
            </View>
            {/* AI answer */}
            <View style={styles.bubbleWrap}>
              <View style={styles.skullIcon}>
                <ParticlesIcon size={28} />
              </View>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{fu.answer}</Text>
                {isStreaming && i === followups.length - 1 && !fu.answer && (
                  <ActivityIndicator size="small" color="#D4AF37" style={styles.spinner} />
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Suggested chips + input */}
      {canAsk && aiText.length > 0 && (
        <View style={styles.inputArea}>
          {followups.length === 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {SUGGESTED_CHIPS.map((chip, i) => (
                <Pressable key={i} style={styles.chip} onPress={() => handleAsk(chip)}>
                  <Text style={styles.chipText}>{chip}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Chiedi qualcosa…"
              placeholderTextColor="#5a4a70"
              multiline
              maxLength={150}
              returnKeyType="send"
              onSubmitEditing={() => handleAsk(input)}
            />
            <Pressable
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={() => handleAsk(input)}
              disabled={!input.trim()}
            >
              <Text style={styles.sendBtnText}>↑</Text>
            </Pressable>
          </View>

          <Text style={styles.counter}>{followups.length}/{maxFollowups} domande usate</Text>
        </View>
      )}

      {followups.length >= maxFollowups && (
        <View style={styles.limitRow}>
          <Text style={styles.limitText}>Limite domande raggiunto</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#D4AF37',
    opacity: 0.3,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 4,
  },
  bubbleWrap: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  skullIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a1050',
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
    overflow: 'hidden',
  },
  bubble: {
    flex: 1,
    backgroundColor: 'rgba(42,16,80,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: 12,
    borderTopLeftRadius: 2,
    padding: 10,
  },
  bubbleText: {
    color: '#e8dfc8',
    fontFamily: 'Georgia',
    fontSize: 13,
    lineHeight: 20,
  },
  spinner: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  fuBlock: {
    gap: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(30,60,100,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(41,128,185,0.4)',
    borderRadius: 12,
    borderTopRightRadius: 2,
    padding: 10,
    maxWidth: '80%',
  },
  userBubbleText: {
    color: '#b8d4f0',
    fontFamily: 'Georgia',
    fontSize: 12,
  },
  inputArea: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: 'rgba(30,21,53,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(26,10,46,0.95)',
    borderWidth: 1.5,
    borderColor: '#6B5010',
    borderRadius: 8,
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  sendBtnText: {
    color: '#0d0918',
    fontSize: 18,
    fontWeight: 'bold',
  },
  counter: {
    color: '#5a4a70',
    fontFamily: 'Georgia',
    fontSize: 10,
    textAlign: 'right',
  },
  limitRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  limitText: {
    color: '#5a4a70',
    fontFamily: 'Georgia',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
