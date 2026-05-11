import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthStore } from '@/lib/auth-store';
import { getOfferings, purchasePackage, type RCOffering } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';

const TIER_COLORS: Record<string, string> = {
  free: '#a890c8',
  premium: '#D4AF37',
  pro: '#C0A0FF',
  vip: '#FF9060',
};

interface SubscriptionStepProps {
  onNext: () => void;
}

export function SubscriptionStep({ onNext }: SubscriptionStepProps) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [offerings, setOfferings] = useState<RCOffering[]>([]);
  const [selected, setSelected] = useState<string>('free');
  const [purchasing, setPurchasing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOfferings().then((o) => {
      setOfferings(o);
      setLoading(false);
    });
  }, []);

  const handleSelect = (identifier: string) => setSelected(identifier);

  const handleContinue = async () => {
    setPurchasing(true);
    try {
      if (selected !== 'free') {
        const success = await purchasePackage(selected);
        if (!success) {
          Alert.alert('Acquisto non completato', 'Continui con il piano gratuito?', [
            { text: 'Sì', onPress: () => finishWithTier('free') },
            { text: 'Riprova', onPress: () => setPurchasing(false) },
          ]);
          return;
        }
      }
      const tier = offerings.find((o) => o.identifier === selected)?.tier ?? 'free';
      await finishWithTier(tier);
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Operazione fallita');
      setPurchasing(false);
    }
  };

  const finishWithTier = async (tier: string) => {
    await updateUser({ subscription_status: tier as any });
    onNext();
  };

  const handleSkip = async () => {
    await finishWithTier('free');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4AF37" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Scegli il tuo piano</Text>
      <Text style={styles.sub}>Puoi cambiare o annullare in qualsiasi momento</Text>

      {offerings.map((o) => {
        const isSelected = selected === o.identifier;
        const color = TIER_COLORS[o.tier] ?? '#a890c8';
        return (
          <Pressable
            key={o.identifier}
            style={[styles.card, isSelected && { borderColor: color, backgroundColor: 'rgba(52,26,106,0.95)' }]}
            onPress={() => handleSelect(o.identifier)}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[styles.cardTitle, { color }]}>{o.title}</Text>
              </View>
              <Text style={[styles.price, { color }]}>{o.priceString}</Text>
            </View>
            <Text style={styles.cardDesc}>{o.description}</Text>
            {isSelected && (
              <View style={[styles.checkBadge, { backgroundColor: color }]}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      <Pressable
        style={[styles.btn, purchasing && styles.btnDisabled]}
        onPress={handleContinue}
        disabled={purchasing}
      >
        {purchasing ? (
          <ActivityIndicator color="#140d2e" />
        ) : (
          <Text style={styles.btnText}>
            {selected === 'free' ? 'Continua gratis' : 'Acquista e continua'}
          </Text>
        )}
      </Pressable>

      {selected !== 'free' && (
        <Pressable style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Continua gratis per ora</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  container: { paddingBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#D4AF37',
    fontFamily: 'Georgia',
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    color: '#a890c8',
    marginBottom: 28,
  },
  card: {
    backgroundColor: 'rgba(36,21,80,0.8)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.25)',
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  price: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 13,
    color: '#a890c8',
    lineHeight: 18,
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    fontSize: 13,
    color: '#140d2e',
    fontWeight: '700',
  },
  btn: {
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#140d2e',
  },
  skipBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#a890c8',
  },
});
