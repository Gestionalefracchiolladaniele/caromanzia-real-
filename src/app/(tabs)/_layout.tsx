import { Tabs } from 'expo-router';
import React from 'react';

import { RoleProvider } from '@/features/role-provider/RoleProvider';

export default function TabsLayout() {
  return (
    <RoleProvider>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }} />
    </RoleProvider>
  );
}
