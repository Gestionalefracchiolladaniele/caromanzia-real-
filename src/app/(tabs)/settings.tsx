import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ElaborateFrame } from '@/components/ui/ElaborateFrame';
import { TabBar, type TabId } from '@/components/ui/TabBar';
import { TitleBox } from '@/components/ui/TitleBox';
import { useAuthStore } from '@/lib/auth-store';

interface SettingItem {
  icon: string;
  title: string;
  desc: string;
  type: 'arrow' | 'toggle';
  key?: string;
}

const SETTINGS_ITEMS: SettingItem[] = [
  { icon: '👤', title: 'Profilo Account', desc: 'Visualizza e modifica i tuoi dati personali.', type: 'arrow' },
  { icon: '🔔', title: 'Notifiche', desc: 'Configura avvisi per letture e Daily Ritual.', type: 'arrow' },
  { icon: '📳', title: 'Feedback Aptico', desc: 'Risposta tattile sulle azioni chiave.', type: 'toggle', key: 'haptic' },
  { icon: '🌍', title: 'Lingua', desc: 'Lingua attuale: Italiano.', type: 'arrow' },
  { icon: '⭐', title: 'Abbonamento', desc: 'Piano attuale: Gratuito. Aggiorna a Premium.', type: 'arrow' },
  { icon: '❓', title: 'FAQ e Supporto', desc: 'Domande frequenti e contatto.', type: 'arrow' },
  { icon: '📄', title: 'Privacy e ToS', desc: 'Informativa sulla privacy e termini di servizio.', type: 'arrow' },
];

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={[styles.toggle, value && styles.toggleOn]}>
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]}>
        {value && <Text style={styles.toggleLabel}>On</Text>}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({ haptic: true });
  const signOut = useAuthStore((s) => s.signOut);

  const handleNav = (id: TabId) => {
    router.push(`/(tabs)/${id}` as any);
  };

  const flipToggle = (key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.screen}>
      <ElaborateFrame />

      <View style={styles.inner}>
        <View style={styles.titleArea}>
          <TitleBox>IMPOSTAZIONI APP</TitleBox>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {SETTINGS_ITEMS.map((item, i) => (
            <Pressable key={i} style={styles.item}>
              <View style={styles.itemIcon}>
                <Text style={styles.itemIconText}>{item.icon}</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
              {item.type === 'arrow' ? (
                <Svg width="16" height="16" fill="none" stroke="#D4AF37" strokeWidth="2.5" viewBox="0 0 24 24">
                  <Path d="M9 18l6-6-6-6" />
                </Svg>
              ) : (
                <Toggle
                  value={toggles[item.key ?? ''] ?? false}
                  onToggle={() => flipToggle(item.key ?? '')}
                />
              )}
            </Pressable>
          ))}

          {/* Logout */}
          <Pressable onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>DISCONNETTI</Text>
          </Pressable>
        </ScrollView>

        <TabBar active="settings" onChange={handleNav} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#140d2e',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    zIndex: 5,
  },
  titleArea: {
    paddingTop: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 16,
  },
  item: {
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1.5,
    borderColor: '#8B7020',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5a2d9a',
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemIconText: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: '#F0D060',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Georgia',
    marginBottom: 4,
  },
  itemDesc: {
    color: '#a890c8',
    fontSize: 12,
    fontFamily: 'Georgia',
    lineHeight: 18,
  },
  toggle: {
    width: 54,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(36,21,80,0.9)',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    position: 'relative',
    flexShrink: 0,
  },
  toggleOn: {
    backgroundColor: '#5a2d9a',
  },
  toggleThumb: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleThumbOn: {
    left: 28,
  },
  toggleLabel: {
    fontSize: 8,
    color: '#0d0918',
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
