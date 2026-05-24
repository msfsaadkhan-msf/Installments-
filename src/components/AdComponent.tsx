import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { Colors, Fonts, FontSizes, Spacing } from '../theme';
import { getSubscriptionStatus } from '../services/subscriptionService';
import { BANNER_ID } from '../services/adService';

export default function AdComponent() {
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    checkAds();
  }, []);

  const checkAds = async () => {
    const status = await getSubscriptionStatus();
    setShowAd(status.hasAds);
  };

  if (!showAd) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.adLabel}>SPONSORED</Text>
      <View style={styles.adWrapper}>
        <BannerAd
          unitId={BANNER_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdFailedToLoad={(error) => console.error('Ad failed to load: ', error)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  adLabel: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginLeft: Spacing.sm,
  },
  adWrapper: {
    minHeight: 50,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
