import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows, CommonStyles } from '../theme';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UpgradeModal({ visible, onClose, onSuccess }: UpgradeModalProps) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  const loadOfferings = async () => {
    setLoading(true);
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        setPackages(offerings.current.availablePackages);
      } else {
        Alert.alert(
          'Notice', 
          'No active plans found. Please ensure Offerings are set to "Current" in the RevenueCat dashboard.'
        );
      }
    } catch (e: any) {
      console.error('Error fetching offerings', e);
      Alert.alert('Configuration Error', `Could not load subscription details: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['pro'] !== undefined) {
        Alert.alert('Success', 'Welcome to Pro! Your features are now unlocked.');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Failed', e.message || 'Something went wrong.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const FeatureItem = ({ text }: { text: string }) => (
    <View style={styles.featureItem}>
      <MaterialCommunityIcons name="check-circle" size={18} color={Colors.accent} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <MaterialCommunityIcons name="crown" size={48} color={Colors.accent} />
            <Text style={styles.title}>Upgrade to Pro</Text>
            <Text style={styles.subtitle}>Unlock the full power of IMS</Text>
          </View>

          <View style={styles.featuresList}>
            <FeatureItem text="Unlimited Clients (Remove 20-client limit)" />
            <FeatureItem text="Unlimited Plans per Client" />
            <FeatureItem text="Professional WhatsApp Receipts" />
            <FeatureItem text="Print Thermal Receipts (80mm)" />
            <FeatureItem text="Google Drive Cloud Backups" />
            <FeatureItem text="Ad-Free Experience" />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
          ) : (
            <ScrollView style={styles.packageList} showsVerticalScrollIndicator={false}>
              {packages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={styles.packageCard}
                  onPress={() => handlePurchase(pkg)}
                  disabled={purchasing}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packageName}>{pkg.packageType}</Text>
                    <Text style={styles.packageDesc}>Full access to all Pro features</Text>
                  </View>
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>{pkg.product.priceString}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {purchasing && (
            <View style={styles.purchasingOverlay}>
              <ActivityIndicator size="large" color={Colors.surface} />
              <Text style={styles.purchasingText}>Processing Purchase...</Text>
            </View>
          )}

          <Text style={styles.disclaimer}>
            Premium features are linked to your account and synced across devices.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    maxHeight: '85%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: Spacing.xs,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  featuresList: {
    backgroundColor: Colors.primary + '08',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textPrimary,
    marginLeft: 10,
  },
  packageList: {
    marginBottom: Spacing.md,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accent + '40',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  packageName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  packageDesc: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  priceBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  priceText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  purchasingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 42, 74, 0.9)',
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  purchasingText: {
    fontFamily: Fonts.bold,
    color: Colors.surface,
    marginTop: Spacing.md,
  },
  disclaimer: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
