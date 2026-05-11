import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ElaborateFrame } from '@/components/ui/ElaborateFrame';
import { TabBar, type TabId } from '@/components/ui/TabBar';
import { TitleBox } from '@/components/ui/TitleBox';
import { useAuthStore, useIsCartomante, useSubscription } from '@/lib/auth-store';
import { getOfferings, purchasePackage, restorePurchases, type RCOffering } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import type { SubscriptionStatus } from '@/types';

const SPECIALIZZAZIONI_PRESET = [
  'Amore', 'Carriera', 'Spirituale', 'Salute', 'Famiglia', 'Perdita', 'Crescita personale',
];

const TIER_COLORS: Record<SubscriptionStatus, string> = {
  free: '#a890c8',
  premium: '#D4AF37',
  pro: '#C0A0FF',
  vip: '#FF9060',
};

const TIER_LABELS: Record<SubscriptionStatus, string> = {
  free: 'Gratuito',
  premium: 'Premium',
  pro: 'Pro',
  vip: 'VIP',
};

/* ─────────────────────────────────────────────
   UpgradeModal — stile NotificationCenter
───────────────────────────────────────────── */

function UpgradeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const currentTier = useSubscription();

  const [offerings, setOfferings] = useState<RCOffering[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [purchasing, setPurchasing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getOfferings().then((o) => {
      setOfferings(o.filter((x) => x.tier !== 'free'));
      setLoading(false);
    });
  }, [visible]);

  const handlePurchase = async () => {
    if (!selected) return;
    setPurchasing(true);
    try {
      const success = await purchasePackage(selected);
      if (!success) {
        Alert.alert('Acquisto non completato', 'Riprova o contatta il supporto.');
        setPurchasing(false);
        return;
      }
      const tier = offerings.find((o) => o.identifier === selected)?.tier ?? 'free';
      await updateUser({ subscription_status: tier });
      Alert.alert('Abbonamento attivato!', `Piano ${TIER_LABELS[tier]} attivo.`);
      onClose();
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Operazione fallita');
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const tier = await restorePurchases();
      await updateUser({ subscription_status: tier });
      Alert.alert('Acquisti ripristinati', `Piano ${TIER_LABELS[tier]} ripristinato.`);
      onClose();
    } catch {
      Alert.alert('Errore', 'Impossibile ripristinare gli acquisti.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={mStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={mStyles.container}>
          {/* Header */}
          <View style={mStyles.header}>
            <Pressable onPress={onClose} style={mStyles.closeBtn}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path d="M18 6L6 18M6 6l12 12" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </Pressable>
            <Text style={mStyles.title}>Abbonamento</Text>
            <View style={{ width: 32 }} />
          </View>

          <Text style={mStyles.sub}>Puoi annullare in qualsiasi momento</Text>

          {loading ? (
            <ActivityIndicator color="#D4AF37" style={{ marginVertical: 32 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
              {offerings.map((o) => {
                const color = TIER_COLORS[o.tier];
                const isActive = currentTier === o.tier;
                const isSelected = selected === o.identifier;
                return (
                  <Pressable
                    key={o.identifier}
                    style={[
                      mStyles.card,
                      isSelected && { borderColor: color, backgroundColor: 'rgba(52,26,106,0.95)' },
                      isActive && { opacity: 0.6 },
                    ]}
                    onPress={() => !isActive && setSelected(o.identifier)}
                  >
                    <View style={mStyles.cardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[mStyles.dot, { backgroundColor: color }]} />
                        <Text style={[mStyles.cardTitle, { color }]}>{o.title}</Text>
                        {isActive && (
                          <View style={[mStyles.activeBadge, { backgroundColor: color }]}>
                            <Text style={mStyles.activeBadgeText}>ATTIVO</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[mStyles.price, { color }]}>{o.priceString}</Text>
                    </View>
                    <Text style={mStyles.cardDesc}>{o.description}</Text>
                    {isSelected && !isActive && (
                      <View style={[mStyles.checkBadge, { backgroundColor: color }]}>
                        <Text style={mStyles.checkText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={{ paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}>
            <Pressable
              style={[mStyles.btn, (!selected || purchasing) && { opacity: 0.45 }]}
              onPress={handlePurchase}
              disabled={!selected || purchasing}
            >
              {purchasing ? <ActivityIndicator color="#140d2e" /> : (
                <Text style={mStyles.btnText}>{selected ? 'Abbonati' : 'Seleziona un piano'}</Text>
              )}
            </Pressable>
            <Pressable style={mStyles.restoreBtn} onPress={handleRestore} disabled={purchasing}>
              <Text style={mStyles.restoreText}>Ripristina acquisti</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   ProfileModal — stile NotificationCenter
───────────────────────────────────────────── */

const SOCIAL_PLATFORMS = [
  { key: 'whatsapp' as const, label: 'WhatsApp', placeholder: 'https://wa.me/39...' },
  { key: 'instagram' as const, label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'telegram' as const, label: 'Telegram', placeholder: 'https://t.me/...' },
  { key: 'tiktok' as const, label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
] as const;

function ProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const isCartomante = useIsCartomante();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [regione, setRegione] = useState('');
  const [interesseSpecifico, setInteresseSpecifico] = useState('');
  const [specializzazioni, setSpecializzazioni] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<{ whatsapp: string; instagram: string; telegram: string; tiktok: string }>({
    whatsapp: '', instagram: '', telegram: '', tiktok: '',
  });
  const [saving, setSaving] = useState(false);

  // Pre-popola ogni volta che il modal si apre
  useEffect(() => {
    if (!visible || !user) return;
    setName(user.name ?? '');
    setBio(user.bio ?? '');
    setRegione(user.regione ?? '');
    setInteresseSpecifico(user.interesse_specifico ?? '');
    if (user.birth_date) {
      const [y, m, d] = user.birth_date.split('-');
      setBirthDate(`${d}/${m}/${y}`);
    } else {
      setBirthDate('');
    }
    if (isCartomante) {
      supabase
        .from('cartomanti')
        .select('bio, specializzazioni, social_links')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (!data) return;
          if (data.specializzazioni?.length) setSpecializzazioni(data.specializzazioni);
          // bio da cartomanti ha precedenza su users.bio (più aggiornata)
          if (data.bio) setBio(data.bio);
          const sl = (data.social_links ?? {}) as Record<string, string>;
          setSocialLinks({
            whatsapp: sl.whatsapp ?? '',
            instagram: sl.instagram ?? '',
            telegram: sl.telegram ?? '',
            tiktok: sl.tiktok ?? '',
          });
        });
    }
  }, [visible, user?.id]);

  const initials = (user?.name ?? 'U').slice(0, 2).toUpperCase();

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Nome obbligatorio'); return; }
    setSaving(true);
    try {
      const parsedBirth = birthDate.trim().length === 10
        ? birthDate.trim().split('/').reverse().join('-')
        : null;

      if (isCartomante) {
        const cleanSocial: Record<string, string> = {};
        for (const { key } of SOCIAL_PLATFORMS) {
          const val = socialLinks[key].trim();
          if (val) cleanSocial[key] = val;
        }
        await updateUser({ name: name.trim(), bio: bio.trim() || null, regione: regione.trim() || null, birth_date: parsedBirth });
        await supabase.from('cartomanti').update({
          specializzazioni,
          regione: regione.trim() || null,
          bio: bio.trim() || null,
          social_links: cleanSocial,
        }).eq('id', user!.id);
      } else {
        await updateUser({
          name: name.trim(), bio: bio.trim() || null,
          regione: regione.trim() || null, interesse_specifico: interesseSpecifico || null,
          birth_date: parsedBirth,
        });
      }
      Alert.alert('Salvato!');
      onClose();
    } catch {
      Alert.alert('Errore', 'Impossibile salvare le modifiche.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={mStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={mStyles.container}>
          {/* Header */}
          <View style={mStyles.header}>
            <Pressable onPress={onClose} style={mStyles.closeBtn}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path d="M18 6L6 18M6 6l12 12" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </Pressable>
            <Text style={mStyles.title}>Il tuo profilo</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 28 }}>
            {/* Avatar */}
            <View style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={mStyles.avatar}>
                {user?.avatar_url
                  ? <Image source={{ uri: user.avatar_url }} style={mStyles.avatarImg} />
                  : <Text style={mStyles.avatarInitials}>{initials}</Text>
                }
              </View>
            </View>

            {/* Nome */}
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>Nome</Text>
              <TextInput style={mStyles.input} value={name} onChangeText={setName} placeholderTextColor="#6b5a8a" placeholder="Il tuo nome" />
            </View>

            {/* Email readonly */}
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>Email</Text>
              <View style={mStyles.inputReadonly}>
                <Text style={mStyles.inputReadonlyText}>{user?.email ?? '—'}</Text>
              </View>
            </View>

            {/* Bio */}
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>Bio</Text>
              <TextInput
                value={bio} onChangeText={setBio}
                placeholder="Raccontati in poche parole..." placeholderTextColor="#6b5a8a"
                multiline numberOfLines={4}
                style={[mStyles.input, { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }]}
              />
            </View>

            {/* Specializzazioni / Interesse */}
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>{isCartomante ? 'Specializzazioni' : 'Interesse specifico'}</Text>
              <View style={mStyles.chipsWrap}>
                {SPECIALIZZAZIONI_PRESET.map((s) => {
                  const active = isCartomante ? specializzazioni.includes(s) : interesseSpecifico === s;
                  return (
                    <Pressable
                      key={s}
                      style={[mStyles.chip, active && mStyles.chipActive]}
                      onPress={() => {
                        if (isCartomante) {
                          setSpecializzazioni((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
                        } else {
                          setInteresseSpecifico(interesseSpecifico === s ? '' : s);
                        }
                      }}
                    >
                      <Text style={[mStyles.chipText, active && mStyles.chipTextActive]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Regione */}
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>Regione</Text>
              <TextInput style={mStyles.input} value={regione} onChangeText={setRegione} placeholder="es. Sicilia, Milano, Roma..." placeholderTextColor="#6b5a8a" maxLength={60} />
            </View>

            {/* Data di nascita */}
            <View style={mStyles.fieldGroup}>
              <Text style={mStyles.fieldLabel}>Data di nascita</Text>
              <TextInput
                style={mStyles.input}
                value={birthDate}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, '').slice(0, 8);
                  let formatted = digits;
                  if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
                  else if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
                  setBirthDate(formatted);
                }}
                placeholder="GG/MM/AAAA"
                placeholderTextColor="#6b5a8a"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            {/* Social Links — solo cartomante */}
            {isCartomante && (
              <View style={mStyles.fieldGroup}>
                <Text style={mStyles.fieldLabel}>Link Social</Text>
                {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
                  <View key={key} style={mStyles.socialInputRow}>
                    <Text style={mStyles.socialInputLabel}>{label}</Text>
                    <TextInput
                      style={mStyles.input}
                      value={socialLinks[key]}
                      onChangeText={(val) => setSocialLinks((prev) => ({ ...prev, [key]: val }))}
                      placeholder={placeholder}
                      placeholderTextColor="#6b5a8a"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Salva */}
            <Pressable style={[mStyles.btn, saving && { opacity: 0.55 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#140d2e" /> : <Text style={mStyles.btnText}>SALVA MODIFICHE</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Stili condivisi modal (stile NotificationCenter)
───────────────────────────────────────────── */

const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,6,25,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: 'rgba(36,21,80,0.98)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#D4AF37', fontFamily: 'Georgia', letterSpacing: 1 },
  sub: { color: '#a890c8', fontSize: 12, textAlign: 'center', fontFamily: 'Georgia', paddingHorizontal: 16, paddingTop: 12 },
  card: {
    backgroundColor: 'rgba(36,21,80,0.8)', borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.25)',
    padding: 14, position: 'relative',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  activeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  activeBadgeText: { fontSize: 9, fontWeight: '700', color: '#140d2e', letterSpacing: 1 },
  price: { fontSize: 14, fontWeight: '600' },
  cardDesc: { fontSize: 12, color: '#a890c8', lineHeight: 17 },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  checkText: { fontSize: 12, color: '#140d2e', fontWeight: '700' },
  btn: { backgroundColor: '#D4AF37', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#140d2e', fontFamily: 'Georgia', letterSpacing: 0.5 },
  restoreBtn: { paddingVertical: 10, alignItems: 'center' },
  restoreText: { fontSize: 13, color: '#a890c8' },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#5a2d9a', borderWidth: 2, borderColor: '#D4AF37',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarInitials: { color: '#D4AF37', fontSize: 22, fontWeight: '700', fontFamily: 'Georgia' },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: '#D4AF37', fontSize: 11, letterSpacing: 1.5, fontFamily: 'Georgia', textTransform: 'uppercase' },
  input: {
    backgroundColor: 'rgba(36,21,80,0.97)', borderWidth: 1.5, borderColor: '#8B7020',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    color: '#F0E6FF', fontFamily: 'Georgia', fontSize: 15,
  },
  inputReadonly: {
    backgroundColor: 'rgba(36,21,80,0.5)', borderWidth: 1.5,
    borderColor: 'rgba(139,112,32,0.4)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  inputReadonlyText: { color: '#a890c8', fontFamily: 'Georgia', fontSize: 14 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18,
    backgroundColor: 'rgba(52,26,106,0.85)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  },
  chipActive: { backgroundColor: '#5a2d9a', borderColor: '#D4AF37' },
  chipText: { fontSize: 12, color: '#a890c8', fontFamily: 'Georgia' },
  chipTextActive: { color: '#D4AF37', fontWeight: '600' },
  socialInputRow: { gap: 4 },
  socialInputLabel: { color: '#c4a878', fontSize: 11, fontFamily: 'Georgia', letterSpacing: 0.5 },
});

/* ─────────────────────────────────────────────
   Main Screen — Impostazioni
───────────────────────────────────────────── */

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const signOut = useAuthStore((s) => s.signOut);
  const subscription = useSubscription();

  const [isPublic, setIsPublic] = useState(user?.is_public ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notifications_enabled ?? true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setIsPublic(user.is_public ?? true);
      setNotificationsEnabled(user.notifications_enabled ?? true);
    }
  }, [user?.id]);

  const handleNav = (id: TabId) => {
    router.push(`/(tabs)/${id}` as any);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateUser({ is_public: isPublic, notifications_enabled: notificationsEnabled });
      Alert.alert('Impostazioni salvate');
    } catch {
      Alert.alert('Errore', 'Impossibile salvare le impostazioni.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Esci', 'Sei sicuro di voler uscire?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const tierColor = TIER_COLORS[subscription];
  const tierLabel = TIER_LABELS[subscription];
  const initials = (user?.name ?? 'U').slice(0, 2).toUpperCase();

  return (
    <View style={styles.screen}>
      <ElaborateFrame />

      <View style={styles.inner}>
        <View style={styles.titleArea}>
          <TitleBox sub="Gestisci il tuo account">IMPOSTAZIONI</TitleBox>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Sezione: Preferenze ── */}
          <Text style={styles.sectionLabel}>PREFERENZE</Text>

          {/* Lingua */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Text style={styles.rowEmoji}>🌍</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Lingua</Text>
              <Text style={styles.rowSub}>Lingua dell'app</Text>
            </View>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>IT</Text>
            </View>
          </View>

          {/* Notifiche */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Text style={styles.rowEmoji}>🔔</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Notifiche</Text>
              <Text style={styles.rowSub}>Ping e aggiornamenti</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: 'rgba(90,45,154,0.4)', true: 'rgba(212,175,55,0.6)' }}
              thumbColor={notificationsEnabled ? '#D4AF37' : '#5a2d9a'}
            />
          </View>

          {/* Profilo pubblico */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Text style={styles.rowEmoji}>🔒</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Profilo pubblico</Text>
              <Text style={styles.rowSub}>
                {isPublic ? 'Visibile nella directory' : 'Nascosto dalla directory'}
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: 'rgba(90,45,154,0.4)', true: 'rgba(212,175,55,0.6)' }}
              thumbColor={isPublic ? '#D4AF37' : '#5a2d9a'}
            />
          </View>

          {/* Salva preferenze */}
          <Pressable
            style={[styles.saveBtn, savingSettings && { opacity: 0.55 }]}
            onPress={handleSaveSettings}
            disabled={savingSettings}
          >
            {savingSettings ? (
              <ActivityIndicator color="#140d2e" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>SALVA PREFERENZE</Text>
            )}
          </Pressable>

          {/* ── Sezione: Account ── */}
          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>ACCOUNT</Text>

          {/* Abbonamento */}
          <Pressable style={styles.row} onPress={() => setUpgradeOpen(true)}>
            <View style={styles.rowIcon}>
              <Text style={styles.rowEmoji}>💳</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Abbonamento</Text>
              <Text style={[styles.rowSub, { color: tierColor }]}>{tierLabel}</Text>
            </View>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <Path d="M9 18l6-6-6-6" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
            </Svg>
          </Pressable>

          {/* Profilo */}
          <Pressable style={styles.row} onPress={() => setProfileOpen(true)}>
            <View style={[styles.rowIcon, styles.rowIconAvatar]}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarThumb} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Profilo</Text>
              <Text style={styles.rowSub}>{user?.name ?? 'Modifica i tuoi dati'}</Text>
            </View>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <Path d="M9 18l6-6-6-6" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
            </Svg>
          </Pressable>

          {/* ── Esci ── */}
          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                stroke="#e05050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.signOutText}>Esci dall'account</Text>
          </Pressable>

          <View style={{ height: 16 }} />
        </ScrollView>

        <TabBar active="impostazioni" onChange={handleNav} />
      </View>

      <UpgradeModal visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      <ProfileModal visible={profileOpen} onClose={() => setProfileOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#140d2e', overflow: 'hidden' },
  inner: { flex: 1, zIndex: 5 },
  titleArea: { paddingTop: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 10, paddingBottom: 16 },

  sectionLabel: {
    color: '#a890c8',
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'Georgia',
    marginBottom: 2,
    marginLeft: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1.5,
    borderColor: '#8B7020',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#5a2d9a',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconAvatar: {
    overflow: 'hidden',
    backgroundColor: '#5a2d9a',
  },
  rowEmoji: { fontSize: 20 },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { color: '#F0D060', fontSize: 15, fontWeight: '600', fontFamily: 'Georgia' },
  rowSub: { color: '#a890c8', fontSize: 12, fontFamily: 'Georgia' },

  langBadge: {
    backgroundColor: 'rgba(90,45,154,0.6)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  langBadgeText: {
    color: '#D4AF37', fontSize: 13, fontWeight: '700', fontFamily: 'Georgia',
  },

  saveBtn: {
    backgroundColor: '#5a2d9a',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  saveBtnText: {
    color: '#D4AF37', fontSize: 12, fontWeight: '700',
    fontFamily: 'Georgia', letterSpacing: 1,
  },

  avatarThumb: { width: 42, height: 42, borderRadius: 21 },
  avatarInitials: { color: '#D4AF37', fontSize: 16, fontWeight: '700', fontFamily: 'Georgia' },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, marginTop: 4,
    borderWidth: 1.5, borderColor: 'rgba(224,80,80,0.4)',
    borderRadius: 8, backgroundColor: 'rgba(80,10,10,0.3)',
  },
  signOutText: { color: '#e05050', fontSize: 14, fontFamily: 'Georgia', fontWeight: '600' },
});
