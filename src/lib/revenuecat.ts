import type { SubscriptionStatus } from '@/types';

// RevenueCat SDK stub — install with: npx expo install react-native-purchases
// Import will be: import Purchases from 'react-native-purchases';

export const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
export const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export interface RCOffering {
  identifier: string;
  title: string;
  description: string;
  priceString: string;
  tier: SubscriptionStatus;
}

export const STATIC_OFFERINGS: RCOffering[] = [
  {
    identifier: 'free',
    title: 'Free',
    description: '1 lettura veloce/sett · 1 Daily/giorno · max 10 letture',
    priceString: '€0',
    tier: 'free',
  },
  {
    identifier: 'premium_monthly',
    title: 'Premium',
    description: 'Letture illimitate · Cronologia · Condivisione',
    priceString: '€4,99/mese',
    tier: 'premium',
  },
  {
    identifier: 'pro_monthly',
    title: 'Pro',
    description: '+ Celtic Cross 20x/mese · Insights avanzati',
    priceString: '€9,99/mese',
    tier: 'pro',
  },
  {
    identifier: 'vip_monthly',
    title: 'VIP',
    description: 'Tutto illimitato · AI prioritaria',
    priceString: '€19,99/mese',
    tier: 'vip',
  },
];

export async function initRevenueCat(userId: string): Promise<void> {
  // TODO: Uncomment when react-native-purchases is installed
  // const { Platform } = require('react-native');
  // const Purchases = require('react-native-purchases').default;
  // const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  // await Purchases.configure({ apiKey, appUserID: userId });
}

export async function getOfferings(): Promise<RCOffering[]> {
  // TODO: fetch real offerings from RevenueCat
  // const Purchases = require('react-native-purchases').default;
  // const offerings = await Purchases.getOfferings();
  // map offerings.current.availablePackages → RCOffering[]
  return STATIC_OFFERINGS;
}

export async function purchasePackage(identifier: string): Promise<boolean> {
  // TODO: implement with react-native-purchases
  // const Purchases = require('react-native-purchases').default;
  // const offerings = await Purchases.getOfferings();
  // const pkg = offerings.current?.availablePackages.find(p => p.identifier === identifier);
  // if (!pkg) return false;
  // const { customerInfo } = await Purchases.purchasePackage(pkg);
  // return !!customerInfo.activeSubscriptions.length;
  console.warn('RevenueCat not configured — using free tier');
  return false;
}

export async function restorePurchases(): Promise<SubscriptionStatus> {
  // TODO: implement with react-native-purchases
  return 'free';
}
