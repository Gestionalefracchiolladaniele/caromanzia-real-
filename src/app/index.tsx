import React, { useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { ElaborateFrame } from '@/components/ui/ElaborateFrame';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

const STARS = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  cx: 20 + Math.random() * 350,
  cy: 80 + Math.random() * 680,
  r: 0.4 + Math.random() * 1.4,
}));

export default function AuthScreen() {
  const [signingIn, setSigningIn] = useState(false);

  // Il routing è gestito da _layout.tsx via onAuthStateChange

  const handleLogin = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const redirectTo =
        typeof window !== 'undefined' && window.location
          ? window.location.origin
          : 'http://localhost:8081';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) Alert.alert('Errore login', error.message);
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Accesso fallito');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Starfield */}
      <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
        {STARS.map((s) => (
          <Circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill="#F0D060" opacity={0.6} />
        ))}
      </Svg>

      <ElaborateFrame />

      {/* Title box — stesso stile TitleBox delle altre schermate */}
      <View style={styles.titleWrap}>
        <View style={styles.titleBox}>
          {/* Angolini decorativi */}
          <View style={[styles.corner, { top: -4, left: -4 }]} />
          <View style={[styles.corner, { top: -4, right: -4 }]} />
          <View style={[styles.corner, { bottom: -4, left: -4 }]} />
          <View style={[styles.corner, { bottom: -4, right: -4 }]} />
          <Text style={styles.titleText}>DIVINAI</Text>
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
        <Text style={styles.titleSub}>IL TUO ORACOLO PERSONALE</Text>
      </View>

      {/* Center filigree + Google button */}
      <View style={styles.center}>
        <Svg width="300" height="300" viewBox="0 0 300 300">
          <Defs>
            <RadialGradient id="authBg" cx="40%" cy="35%">
              <Stop offset="0%"  stopColor="#5a2a90" />
              <Stop offset="60%" stopColor="#3d1b69" />
              <Stop offset="100%" stopColor="#1e0e3a" />
            </RadialGradient>
            <LinearGradient id="authGold" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor="#6B5010" />
              <Stop offset="40%"  stopColor="#F0D060" />
              <Stop offset="100%" stopColor="#6B5010" />
            </LinearGradient>
            <RadialGradient id="gemR2" cx="40%" cy="35%">
              <Stop offset="0%"   stopColor="#c090f0" />
              <Stop offset="60%"  stopColor="#6B4BA0" />
              <Stop offset="100%" stopColor="#2a1050" />
            </RadialGradient>
          </Defs>

          {/* Outer swirl ring */}
          <Circle cx="150" cy="150" r="138" fill="none" stroke="url(#authGold)" strokeWidth="2.5" opacity="0.5" />

          {/* Filigree tick marks */}
          {[0,40,80,120,160,200,240,280,320].map((a, i) => {
            const rad = (a * Math.PI) / 180;
            const x1 = 150 + 138 * Math.cos(rad);
            const y1 = 150 + 138 * Math.sin(rad);
            const x2 = 150 + 120 * Math.cos(rad);
            const y2 = 150 + 120 * Math.sin(rad);
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D4AF37" strokeWidth="2" opacity="0.6" />;
          })}

          {/* Gems on outer ring */}
          {[0,45,90,135,180,225,270,315].map((a, i) => {
            const rad = (a * Math.PI) / 180;
            const cx = 150 + 138 * Math.cos(rad);
            const cy = 150 + 138 * Math.sin(rad);
            return <Circle key={i} cx={cx} cy={cy} r="7" fill="url(#gemR2)" stroke="url(#authGold)" strokeWidth="1.5" />;
          })}

          {/* Filigree scrolls */}
          <Path d="M80,80 C90,70 100,80 95,90 C90,100 80,95 80,80Z" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
          <Path d="M220,80 C210,70 200,80 205,90 C210,100 220,95 220,80Z" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
          <Path d="M80,220 C90,230 100,220 95,210 C90,200 80,205 80,220Z" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
          <Path d="M220,220 C210,230 200,220 205,210 C210,200 220,205 220,220Z" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />

          {/* Middle ring */}
          <Circle cx="150" cy="150" r="100" fill="none" stroke="url(#authGold)" strokeWidth="4" opacity="0.8" />

          {/* Diamond accents */}
          {[0,90,180,270].map((a, i) => {
            const rad = (a * Math.PI) / 180;
            const cx = 150 + 100 * Math.cos(rad);
            const cy = 150 + 100 * Math.sin(rad);
            return <Path key={i} d={`M${cx},${cy-5} L${cx+4},${cy} L${cx},${cy+5} L${cx-4},${cy}Z`} fill="#D4AF37" />;
          })}
          {[45,135,225,315].map((a, i) => {
            const rad = (a * Math.PI) / 180;
            const cx = 150 + 100 * Math.cos(rad);
            const cy = 150 + 100 * Math.sin(rad);
            return <Circle key={i} cx={cx} cy={cy} r="4" fill="url(#gemR2)" stroke="#D4AF37" strokeWidth="1" />;
          })}

          {/* Main button circle */}
          <Circle cx="150" cy="150" r="80" fill="url(#authBg)" stroke="url(#authGold)" strokeWidth="5" />
          <Circle cx="150" cy="150" r="74" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.4" />

          {/* Google G */}
          <SvgText x="150" y="145" textAnchor="middle" fontSize="56" fontFamily="Arial" fontWeight="700" fill="#4285F4">G</SvgText>
          <SvgText x="150" y="164" textAnchor="middle" fontSize="13" fill="#E8D5A3" fontFamily="Georgia" letterSpacing="2" fontWeight="600">ACCEDI CON</SvgText>
          <SvgText x="150" y="180" textAnchor="middle" fontSize="13" fill="#D4AF37" fontFamily="Georgia" letterSpacing="2" fontWeight="700">GOOGLE</SvgText>
        </Svg>

        {/* Invisible hit target over the circle */}
        <Pressable onPress={handleLogin} style={styles.loginBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#100c1e',
    position: 'relative',
    overflow: 'hidden',
  },
  titleWrap: {
    position: 'absolute',
    top: 36,
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  titleBox: {
    backgroundColor: '#3d1a6e',
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 4,
    paddingHorizontal: 28,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 1,
  },
  titleText: {
    color: '#D4AF37',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 5,
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
    width: '80%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D4AF37',
    opacity: 0.6,
  },
  titleSub: {
    fontSize: 10,
    color: '#c4a0f0',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
    fontFamily: 'Georgia',
  },
  center: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -150 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtn: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'transparent',
  },
});
