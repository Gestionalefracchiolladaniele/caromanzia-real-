import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DivineMascot } from '@/components/ui/DivineMascot';
import { RolePicker } from '@/features/onboarding/RolePicker';
import { AvatarStep } from '@/features/onboarding/steps/AvatarStep';
import { BioStep } from '@/features/onboarding/steps/BioStep';
import { SubscriptionStep } from '@/features/onboarding/steps/SubscriptionStep';
import { useAuthStore } from '@/lib/auth-store';

type Step = 'role' | 'avatar' | 'bio' | 'subscription' | 'welcome';

const STEP_NUMBERS: Record<Exclude<Step, 'welcome'>, number> = {
  role: 0, avatar: 1, bio: 2, subscription: 3,
};

const STEP_MESSAGES: Record<Step, string> = {
  role:         'Scegli il tuo ruolo',
  avatar:       'Il tuo volto',
  bio:          'La tua essenza',
  subscription: 'Il tuo piano',
  welcome:      'Il tuo viaggio inizia ora',
};

function WelcomeScreen({ userName }: { userName: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const dissipateAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrata: fade in + scale up
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start(() => {
      // Pausa 2.5s poi dissipazione
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
          Animated.timing(dissipateAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]).start(() => {
          router.replace('/(tabs)/impostazioni');
        });
      }, 2500);
    });
  }, []);

  const name = userName ? userName.split(' ')[0] : 'Viaggiatore';

  return (
    <Animated.View style={[styles.welcomeScreen, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.welcomeContent, { transform: [{ scale: scaleAnim }], opacity: dissipateAnim }]}>
        <DivineMascot message={`Benvenuto, ${name}`} width={380} />
        <Text style={styles.welcomeTitle}>IL TUO VIAGGIO</Text>
        <Text style={styles.welcomeSubtitle}>inizia ora</Text>
        <View style={styles.welcomeDivider} />
        <Text style={styles.welcomeTagline}>Gli arcani ti attendono</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const updateUser = useAuthStore((s) => s.updateUser);
  const userName = useAuthStore((s) => s.user?.name ?? '');
  const [step, setStep] = useState<Step>('role');

  const handleRoleSelect = async (role: 'user' | 'cartomante') => {
    try {
      await updateUser({ role });
      setStep('avatar');
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Impossibile salvare il ruolo');
    }
  };

  const handleFinish = async () => {
    try {
      await updateUser({ role_completed: true });
      setStep('welcome');
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Errore nel completare il profilo');
    }
  };

  if (step === 'welcome') {
    return <WelcomeScreen userName={userName} />;
  }

  const currentIdx = STEP_NUMBERS[step as Exclude<Step, 'welcome'>];

  return (
    <View style={styles.screen}>
      {/* Header — solo progress bar, nessun titolo */}
      {step !== 'role' && (
        <View style={styles.header}>
          <View style={styles.progressRow}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.progressDot, currentIdx >= i && styles.progressDotActive]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Mascotte divina — visibile da avatar in poi */}
      {step !== 'role' && (
        <View style={styles.mascotArea}>
          <DivineMascot message={STEP_MESSAGES[step]} width={280} />
        </View>
      )}

      {/* Card centrata come RolePicker */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {step !== 'role' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {step === 'avatar' && (
                <AvatarStep onNext={() => setStep('bio')} />
              )}
              {step === 'bio' && (
                <BioStep onNext={() => setStep('subscription')} />
              )}
              {step === 'subscription' && (
                <SubscriptionStep onNext={handleFinish} />
              )}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* RolePicker come modal sopra */}
      <RolePicker visible={step === 'role'} onSelect={handleRoleSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'rgba(10,6,25,0.97)',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.15)',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(212,175,55,0.25)',
  },
  progressDotActive: {
    backgroundColor: '#D4AF37',
  },
  mascotArea: {
    alignItems: 'center',
    paddingTop: 8,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(36,21,80,0.98)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    padding: 28,
  },
  welcomeScreen: {
    flex: 1,
    backgroundColor: '#140d2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeContent: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    color: '#D4AF37',
    fontSize: 28,
    fontFamily: 'Georgia',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginTop: 16,
  },
  welcomeSubtitle: {
    color: '#c4a878',
    fontSize: 16,
    fontFamily: 'Georgia',
    letterSpacing: 3,
    fontStyle: 'italic',
  },
  welcomeDivider: {
    width: 60,
    height: 1.5,
    backgroundColor: '#D4AF37',
    opacity: 0.5,
    marginVertical: 8,
  },
  welcomeTagline: {
    color: '#a890c8',
    fontSize: 13,
    fontFamily: 'Georgia',
    letterSpacing: 2,
  },
});
