import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

interface GoldButtonProps {
  children: string;
  onPress?: () => void;
  variant?: 'solid' | 'outline';
  style?: ViewStyle;
}

export function GoldButton({ children, onPress, variant = 'solid', style }: GoldButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' ? styles.solid : styles.outline,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, variant === 'outline' && styles.textOutline]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 3,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: '#D4AF37',
    borderWidth: 1.5,
    borderColor: '#F0D060',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  pressed: {
    opacity: 0.75,
  },
  text: {
    color: '#0d0918',
    fontFamily: 'Georgia',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  textOutline: {
    color: '#D4AF37',
  },
});
