import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';

interface AvatarStepProps {
  onNext: () => void;
}

export function AvatarStep({ onNext }: AvatarStepProps) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso necessario', 'Consenti accesso alla galleria per caricare una foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleNext = async () => {
    if (!name.trim()) {
      Alert.alert('Nome richiesto', 'Inserisci il tuo nome per continuare.');
      return;
    }
    setUploading(true);
    try {
      let avatar_url = user?.avatar_url ?? null;

      if (avatarUri && avatarUri !== user?.avatar_url) {
        // Determina estensione: URI blob su web non ha estensione, usa jpg come fallback
        const uriParts = avatarUri.split('.');
        const lastPart = uriParts[uriParts.length - 1]?.toLowerCase() ?? '';
        const ext = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(lastPart) ? lastPart : 'jpg';
        const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        const path = `${user!.id}/avatar.${ext}`;

        const response = await fetch(avatarUri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { upsert: true, contentType: mimeType });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);
        avatar_url = publicUrl;
      }

      await updateUser({ name: name.trim(), avatar_url });
      onNext();
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Caricamento fallito');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Il tuo profilo</Text>
      <Text style={styles.sub}>Aggiungi una foto e il tuo nome</Text>

      <Pressable style={styles.avatarWrap} onPress={pickImage}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
        <View style={styles.editBadge}>
          <Text style={styles.editBadgeText}>✎</Text>
        </View>
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Il tuo nome"
        placeholderTextColor="#7a6090"
        value={name}
        onChangeText={setName}
        maxLength={50}
        returnKeyType="done"
      />

      <Pressable
        style={[styles.btn, (!name.trim() || uploading) && styles.btnDisabled]}
        onPress={handleNext}
        disabled={!name.trim() || uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#140d2e" />
        ) : (
          <Text style={styles.btnText}>Continua</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D4AF37',
    fontFamily: 'Georgia',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#a890c8',
    marginBottom: 36,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5a2d9a',
    borderWidth: 2,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F0E6FF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadgeText: {
    fontSize: 14,
    color: '#140d2e',
    fontWeight: '700',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(52,26,106,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F0E6FF',
    marginBottom: 28,
  },
  btn: {
    width: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
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
