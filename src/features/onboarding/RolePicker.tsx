import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { UserRole } from '@/types';

interface RolePickerProps {
  visible: boolean;
  onSelect: (role: 'user' | 'cartomante') => void;
}

function UserIcon() {
  return (
    <Svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="16" r="10" stroke="#D4AF37" strokeWidth="2.5" />
      <Path d="M6 42c0-9.9 8.1-18 18-18s18 8.1 18 18" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function CartomanteIcon() {
  return (
    <Svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <Path d="M24 4 L28 18 L42 18 L31 27 L35 41 L24 32 L13 41 L17 27 L6 18 L20 18 Z" stroke="#D4AF37" strokeWidth="2.5" strokeLinejoin="round" />
    </Svg>
  );
}

const ROLES: Array<{
  id: 'user' | 'cartomante';
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'user',
    title: 'Utente',
    description: 'Ricevi letture di tarocchi, interpreta i tuoi sogni e connettiti con i cartomanti',
    icon: <UserIcon />,
  },
  {
    id: 'cartomante',
    title: 'Cartomante',
    description: 'Offri le tue letture, costruisci il tuo profilo e raggiungi nuovi clienti',
    icon: <CartomanteIcon />,
  },
];

export function RolePicker({ visible, onSelect }: RolePickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Scegli il tuo ruolo</Text>
          <Text style={styles.subtitle}>La scelta è definitiva e legata al tuo abbonamento</Text>

          <View style={styles.cards}>
            {ROLES.map((role) => (
              <Pressable
                key={role.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => onSelect(role.id)}
              >
                <View style={styles.iconWrap}>{role.icon}</View>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDesc}>{role.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,6,25,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(36,21,80,0.98)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    padding: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#D4AF37',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Georgia',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#a890c8',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  cards: {
    flexDirection: 'row',
    gap: 14,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(52,26,106,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    padding: 18,
    alignItems: 'center',
    gap: 12,
  },
  cardPressed: {
    backgroundColor: 'rgba(90,45,154,0.9)',
    borderColor: '#D4AF37',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(20,13,46,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F0E6FF',
    textAlign: 'center',
  },
  roleDesc: {
    fontSize: 12,
    color: '#a890c8',
    textAlign: 'center',
    lineHeight: 17,
  },
});
