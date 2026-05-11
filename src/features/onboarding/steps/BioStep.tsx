import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';

const SPECIALIZZAZIONI_PRESET = [
  'Amore',
  'Carriera',
  'Spirituale',
  'Salute',
  'Famiglia',
  'Perdita',
  'Crescita personale',
];

interface BioStepProps {
  onNext: () => void;
}

export function BioStep({ onNext }: BioStepProps) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const isCartomante = user?.role === 'cartomante';

  const [bio, setBio] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [regione, setRegione] = useState('');
  const [specializzazioni, setSpecializzazioni] = useState<string[]>([]);
  const [interesseSpecifico, setInteresseSpecifico] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    whatsapp: '',
    instagram: '',
    telegram: '',
    tiktok: '',
  });
  const [saving, setSaving] = useState(false);

  const toggleSpec = (s: string) =>
    setSpecializzazioni((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const handleNext = async () => {
    if (isCartomante && !bio.trim()) {
      Alert.alert('Bio richiesta', 'Inserisci una breve descrizione di te.');
      return;
    }
    setSaving(true);
    try {
      const parsedBirth = birthDate.trim().length === 10
        ? birthDate.trim().split('/').reverse().join('-')
        : null;

      if (isCartomante) {
        await updateUser({ bio: bio.trim() || null, regione: regione.trim() || null, birth_date: parsedBirth });

        const social: Record<string, string> = {};
        if (socialLinks.whatsapp.trim()) social.whatsapp = socialLinks.whatsapp.trim();
        if (socialLinks.instagram.trim()) social.instagram = socialLinks.instagram.trim();
        if (socialLinks.telegram.trim()) social.telegram = socialLinks.telegram.trim();
        if (socialLinks.tiktok.trim()) social.tiktok = socialLinks.tiktok.trim();

        const { error } = await supabase
          .from('cartomanti')
          .upsert({
            id: user!.id,
            bio: bio.trim(),
            specializzazioni,
            regione: regione.trim() || null,
            social_links: social,
          });
        if (error) throw error;
      } else {
        await updateUser({
          bio: bio.trim() || null,
          interesse_specifico: interesseSpecifico || null,
          regione: regione.trim() || null,
          birth_date: parsedBirth,
        });
      }

      onNext();
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Salvataggio fallito');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>
        {isCartomante ? 'Il tuo profilo cartomante' : 'Le tue preferenze'}
      </Text>
      <Text style={styles.sub}>
        {isCartomante
          ? 'Queste informazioni saranno visibili agli utenti'
          : 'Aiutaci a trovare il cartomante giusto per te'}
      </Text>

      <Text style={styles.label}>Data di nascita</Text>
      <TextInput
        style={styles.input}
        placeholder="GG/MM/AAAA"
        placeholderTextColor="#7a6090"
        value={birthDate}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, '').slice(0, 8);
          let formatted = digits;
          if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
          else if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
          setBirthDate(formatted);
        }}
        keyboardType="numeric"
        maxLength={10}
      />

      {isCartomante && (
        <>
          <Text style={styles.label}>Bio (richiesta)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Descrivi la tua esperienza e il tuo approccio..."
            placeholderTextColor="#7a6090"
            value={bio}
            onChangeText={setBio}
            maxLength={200}
            multiline
            numberOfLines={4}
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </>
      )}

      <Text style={styles.label}>
        {isCartomante ? 'Specializzazioni' : 'Interesse specifico'}
      </Text>
      <Text style={styles.sublabel}>
        {isCartomante
          ? 'Seleziona le tue aree di competenza'
          : 'Seleziona il tema che ti interessa di più'}
      </Text>

      {isCartomante ? (
        <View style={styles.chips}>
          {SPECIALIZZAZIONI_PRESET.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, specializzazioni.includes(s) && styles.chipActive]}
              onPress={() => toggleSpec(s)}
            >
              <Text style={[styles.chipText, specializzazioni.includes(s) && styles.chipTextActive]}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.chips}>
          {SPECIALIZZAZIONI_PRESET.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, interesseSpecifico === s && styles.chipActive]}
              onPress={() => setInteresseSpecifico(interesseSpecifico === s ? '' : s)}
            >
              <Text style={[styles.chipText, interesseSpecifico === s && styles.chipTextActive]}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>Regione</Text>
      <TextInput
        style={styles.input}
        placeholder="es. Sicilia, Milano, Roma..."
        placeholderTextColor="#7a6090"
        value={regione}
        onChangeText={setRegione}
        maxLength={60}
      />

      {isCartomante && (
        <>
          <Text style={styles.label}>Social (opzionali)</Text>
          {[
            { key: 'whatsapp', placeholder: 'WhatsApp (numero o link)' },
            { key: 'instagram', placeholder: 'Instagram (@username)' },
            { key: 'telegram', placeholder: 'Telegram (@username o link)' },
            { key: 'tiktok', placeholder: 'TikTok (@username)' },
          ].map(({ key, placeholder }) => (
            <TextInput
              key={key}
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#7a6090"
              value={socialLinks[key as keyof typeof socialLinks]}
              onChangeText={(v) => setSocialLinks((prev) => ({ ...prev, [key]: v }))}
              autoCapitalize="none"
            />
          ))}
        </>
      )}

      <View style={styles.btnRow}>
        <Pressable style={styles.skipBtn} onPress={onNext}>
          <Text style={styles.skipText}>Salta</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleNext}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? 'Salvataggio...' : 'Continua'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingBottom: 8,
  },
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a890c8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sublabel: {
    fontSize: 12,
    color: '#7a6090',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(52,26,106,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#F0E6FF',
    marginBottom: 16,
  },
  textarea: {
    height: 96,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#7a6090',
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(52,26,106,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  chipActive: {
    backgroundColor: '#5a2d9a',
    borderColor: '#D4AF37',
  },
  chipText: {
    fontSize: 13,
    color: '#a890c8',
  },
  chipTextActive: {
    color: '#D4AF37',
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: '#a890c8',
  },
  btn: {
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    flex: 2,
  },
  btnFlex: {
    flex: 1,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#140d2e',
  },
});
