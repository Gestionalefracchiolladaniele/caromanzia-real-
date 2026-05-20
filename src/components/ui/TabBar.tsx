import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useRole } from '@/features/role-provider/RoleProvider';

export type TabId = 'home' | 'reading' | 'history' | 'impostazioni' | 'analytics' | 'cards';

const ICON_PATHS: Record<string, string> = {
  home:        'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  reading:     'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  cards:       'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z',
  history:     'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  analytics:   'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm-4 3c.55 0 1 .45 1 1v5c0 .55-.45 1-1 1s-1-.45-1-1v-5c0-.55.45-1 1-1zm8 3c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1v-2c0-.55.45-1 1-1z',
  impostazioni: 'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z',
  profile:     'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z',
};

type TabDef = { id: TabId; label: string; icon: string };

const USER_TABS: TabDef[] = [
  { id: 'home',         label: 'HOME',     icon: 'home' },
  { id: 'reading',      label: 'LETTURE',  icon: 'reading' },
  { id: 'cards',        label: 'CARTE',    icon: 'cards' },
  { id: 'history',      label: 'STORIA',   icon: 'history' },
  { id: 'impostazioni', label: 'IMPOST.',  icon: 'impostazioni' },
];

const CARTOMANTE_TABS: TabDef[] = [
  { id: 'home',         label: 'HOME',      icon: 'home' },
  { id: 'analytics',    label: 'ANALYTICS', icon: 'analytics' },
  { id: 'cards',        label: 'CARTE',     icon: 'cards' },
  { id: 'impostazioni', label: 'IMPOST.',   icon: 'impostazioni' },
];

interface TabBarProps {
  active: TabId;
  onChange?: (id: TabId) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  const { isCartomante } = useRole();
  const tabs = isCartomante ? CARTOMANTE_TABS : USER_TABS;

  const handlePress = (tab: TabDef) => {
    if (onChange) {
      onChange(tab.id);
    } else {
      router.replace(`/(tabs)/${tab.id}` as any);
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab, i) => {
        const isActive = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => handlePress(tab)}
            style={[
              styles.tab,
              i < tabs.length - 1 && styles.tabBorder,
              isActive && styles.tabActive,
            ]}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill={isActive ? '#D4AF37' : '#5a4a30'}>
                <Path d={ICON_PATHS[tab.icon]} />
              </Svg>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 72,
    backgroundColor: '#1c1240',
    borderTopWidth: 3,
    borderTopColor: '#8B7020',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    marginTop: -3,
  },
  tabBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(139,112,32,0.3)',
  },
  tabActive: {
    borderTopColor: '#D4AF37',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#5a2d9a',
    shadowColor: '#8f5fd0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 7,
    elevation: 6,
  },
  label: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: '#5a4a30',
    fontFamily: 'Georgia',
  },
  labelActive: {
    color: '#D4AF37',
  },
});
