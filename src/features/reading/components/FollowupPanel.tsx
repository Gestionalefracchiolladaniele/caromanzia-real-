import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
  userName?: string;
  userAvatar?: string | null;
  spreadName?: string;
  musicOn?: boolean;
  ttsOn?: boolean;
  isPlaying?: boolean;
  onToggleMusic?: () => void;
  onToggleTts?: () => void;
  onPlayTts?: () => void;
}

export function FollowupPanel({
  aiText, isStreaming, followups, onAskFollowup, maxFollowups = 3,
  userName, userAvatar, spreadName,
  musicOn, ttsOn, isPlaying,
  onToggleMusic, onToggleTts, onPlayTts,
}: FollowupPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const canAsk = followups.length < maxFollowups && !isStreaming;

  function handleAsk(q: string) {
    if (!canAsk || !q.trim()) return;
    onAskFollowup(q.trim());
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const showHeader = userName !== undefined || onToggleMusic !== undefined;

  return (
    <View style={styles.container}>
      {/* Header integrato: user + audio controls (compatto, dentro la chat) */}
      {showHeader && (
        <View style={styles.header}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>
                {(userName ?? 'U').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerUserName} numberOfLines={1}>{userName ?? 'Lettore'}</Text>
            {spreadName && <Text style={styles.headerUserSub} numberOfLines={1}>{spreadName}</Text>}
          </View>
          <View style={styles.headerActions}>
            {onToggleMusic && (
              <Pressable onPress={onToggleMusic} style={[styles.headerIconBtn, !musicOn && styles.headerIconBtnOff]}>
                <Svg width="13" height="13" viewBox="0 0 24 24" fill={musicOn ? '#D4AF37' : '#5a4a30'}>
                  <Path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
                </Svg>
              </Pressable>
            )}
            {onToggleTts && (
              <Pressable onPress={onToggleTts} style={[styles.headerIconBtn, !ttsOn && styles.headerIconBtnOff]}>
                <Svg width="13" height="13" viewBox="0 0 24 24" fill={ttsOn ? '#D4AF37' : '#5a4a30'}>
                  <Path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z" />
                </Svg>
              </Pressable>
            )}
            {ttsOn && aiText.length > 0 && onPlayTts && (
              <Pressable onPress={onPlayTts} style={[styles.headerIconBtn, !isPlaying && styles.headerIconBtnOff]}>
                <Text style={styles.headerIconBtnEmoji}>{isPlaying ? '⏸' : '▶'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Initial AI interpretation */}
        {aiText.length > 0 && (
          <View style={styles.aiBlock}>
            <View style={styles.bubbleWrap}>
              <View style={styles.skullIcon}>
                <ParticlesIcon size={24} />
              </View>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{aiText}</Text>
                {isStreaming && followups.length === 0 && (
                  <ActivityIndicator size="small" color="#D4AF37" style={styles.spinner} />
                )}
              </View>
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
                <ParticlesIcon size={24} />
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(20,13,46,0.6)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    backgroundColor: 'rgba(36,21,80,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.25)',
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  headerAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#5a2d9a',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    color: '#D4AF37',
    fontSize: 13,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  headerUserInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerUserName: {
    color: '#F0D060',
    fontSize: 12,
    fontFamily: 'Georgia',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerUserSub: {
    color: '#a890c8',
    fontSize: 9,
    fontFamily: 'Georgia',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(90,45,154,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnOff: {
    backgroundColor: 'rgba(36,21,80,0.4)',
    borderColor: 'rgba(90,74,48,0.3)',
  },
  headerIconBtnEmoji: {
    color: '#D4AF37',
    fontSize: 11,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
    paddingBottom: 4,
  },
  bubbleWrap: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    width: '100%',
  },
  skullIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    borderRadius: 10,
    borderTopLeftRadius: 2,
    padding: 8,
  },
  bubbleText: {
    color: '#e8dfc8',
    fontFamily: 'Georgia',
    fontSize: 12,
    lineHeight: 18,
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
    paddingHorizontal: 10,
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
  aiBlock: {
    gap: 8,
  },
});
