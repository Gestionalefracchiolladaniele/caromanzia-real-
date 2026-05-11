import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface TitleBoxProps {
  children: string;
  sub?: string;
}

export function TitleBox({ children, sub }: TitleBoxProps) {
  const corners = [
    { top: -4, left: -4 },
    { top: -4, right: -4 },
    { bottom: -4, left: -4 },
    { bottom: -4, right: -4 },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        {corners.map((pos, i) => (
          <View key={i} style={[styles.corner, pos]} />
        ))}
        <Text style={styles.title}>{children}</Text>
      </View>

      {/* Diamond divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Svg width="12" height="12" viewBox="0 0 12 12">
          <Path d="M6,0 L12,6 L6,12 L0,6Z" fill="#D4AF37" />
          <Path d="M6,2 L10,6 L6,10 L2,6Z" fill="#5a2d9a" />
        </Svg>
        <View style={styles.dividerLine} />
      </View>

      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 30,
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'center',
  },
  box: {
    backgroundColor: undefined,
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#3d1a6e' as any,
  },
  corner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 1,
  },
  title: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'Georgia',
    textShadowColor: 'rgba(212,175,55,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginHorizontal: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D4AF37',
    opacity: 0.6,
  },
  sub: {
    fontSize: 11,
    color: '#c4a0f0',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
    fontFamily: 'Georgia',
  },
});
