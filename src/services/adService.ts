import { InterstitialAd, AdEventType, TestIds, BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getSubscriptionStatus } from './subscriptionService';

const INTERSTITIAL_ID = 'ca-app-pub-9748419253991375/1212162433';
export const BANNER_ID = 'ca-app-pub-9748419253991375/5360810917';

let interstitial: InterstitialAd | null = null;

export function initInterstitial() {
  
  interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  
  interstitial.load();
}

export async function showInterstitial() {
  
  const status = await getSubscriptionStatus();
  if (!status.hasAds) return;

  if (interstitial && interstitial.loaded) {
    interstitial.show();
    // Reload for next time
    initInterstitial();
  } else {
    console.log('Interstitial not loaded yet');
    initInterstitial();
  }
}

// Preload on start
initInterstitial();
