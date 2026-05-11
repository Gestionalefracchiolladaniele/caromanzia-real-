import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface SearchBarProps {
  placeholder?: string;
  onChangeText?: (text: string) => void;
}

export function SearchBar({ placeholder, onChangeText }: SearchBarProps) {
  const [value, setValue] = useState('');

  const handleChange = (text: string) => {
    setValue(text);
    onChangeText?.(text);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Svg width="15" height="15" fill="none" stroke="#D4AF37" strokeWidth="2" viewBox="0 0 24 24">
          <Circle cx="11" cy="11" r="8" />
          <Path d="m21 21-4.35-4.35" />
        </Svg>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="#8060a0"
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52,26,106,0.85)',
    borderWidth: 1.5,
    borderColor: '#8B7020',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    color: '#E8D5A3',
    fontFamily: 'Georgia',
    fontSize: 14,
    letterSpacing: 0.5,
    padding: 0,
  },
});
