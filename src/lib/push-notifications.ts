import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('users')
    .update({ push_token: token } as any)
    .eq('id', userId);
}

export async function scheduleDailyCardNotification(): Promise<void> {
  // Cancella eventuali schedulazioni precedenti per daily_card
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.content.data as any)?.type === 'daily_card') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  // Schedula notifica locale ogni giorno alle 8:00
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔮 La tua carta del giorno',
      body: 'Apri l\'app per scoprire il messaggio delle carte.',
      data: { type: 'daily_card' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}

export async function cancelDailyCardNotification(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.content.data as any)?.type === 'daily_card') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function hasDailyCardScheduled(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => (n.content.data as any)?.type === 'daily_card');
}
