import Purchases from 'react-native-purchases';
import { Installment } from '../types';
import { getCurrentUser } from './storage';

export enum UserTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ELITE = 'ELITE'
}

export interface SubscriptionStatus {
  tier: UserTier;
  isPro: boolean;
  canBackup: boolean;
  canAddUnlimitedClients: boolean;
  canAccessReceipts: boolean;
  maxPlansPerClient: number;
  hasAds: boolean;
}

const FREE_CLIENT_LIMIT = 20;
const FREE_PLAN_PER_CLIENT_LIMIT = 5;

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    // 1. Check for manual Firestore override (Lifetime Pro)
    const currentUser = await getCurrentUser();
    if (currentUser?.isLifetimePro) {
      return {
        tier: UserTier.ELITE, // Manual/Lifetime tier
        isPro: true,
        canBackup: true,
        canAddUnlimitedClients: true,
        canAccessReceipts: true,
        maxPlansPerClient: 999999,
        hasAds: false,
      };
    }


    // 3. Check for Store subscription via RevenueCat
    const customerInfo = await Purchases.getCustomerInfo();
    const isPro = customerInfo.entitlements.active['pro'] !== undefined;
    
    if (isPro) {
      return {
        tier: UserTier.PRO,
        isPro: true,
        canBackup: true,
        canAddUnlimitedClients: true,
        canAccessReceipts: true,
        maxPlansPerClient: 999999,
        hasAds: false,
      };
    }
  } catch (e) {
    console.error('Error fetching subscription status', e);
  }

  // Default to Free
  return {
    tier: UserTier.FREE,
    isPro: false,
    canBackup: false,
    canAddUnlimitedClients: false,
    canAccessReceipts: false,
    maxPlansPerClient: FREE_PLAN_PER_CLIENT_LIMIT,
    hasAds: true,
  };
}

export function checkClientLimit(currentCount: number, status: SubscriptionStatus): boolean {
  if (status.isPro) return true;
  return currentCount < FREE_CLIENT_LIMIT;
}

export const SUBSCRIPTION_PRODUCTS = {
  MONTHLY: 'ims_pro_monthly',
  YEARLY: 'ims_elite_yearly'
};
