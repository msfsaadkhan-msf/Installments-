import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Radius } from '../theme';
import Header from '../components/Header';
import { getBusinessProfile, saveBusinessProfile, getInvoiceConfig, saveInvoiceConfig, InvoiceConfig } from '../services/storage';
import { BusinessProfile } from '../types';
import ContactPicker from '../components/ContactPicker';

export default function BusinessProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: undefined,
  });
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>({
    prefix: 'INV-',
    nextNumber: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [data, invConfig] = await Promise.all([
        getBusinessProfile(),
        getInvoiceConfig(),
      ]);
      if (data) setProfile(data);
      if (invConfig) setInvoiceConfig(invConfig);
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfile(prev => ({ ...prev, logo: result.assets[0].uri }));
    }
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      Alert.alert('Error', 'Business Name is required');
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        saveBusinessProfile(profile),
        saveInvoiceConfig(invoiceConfig),
      ]);
      Alert.alert('Success', 'Settings updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={CommonStyles.screen}>
      <Header title="Business Profile" showBack />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <TouchableOpacity onPress={pickImage} style={styles.logoContainer}>
            {profile.logo ? (
              <Image source={{ uri: profile.logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <MaterialCommunityIcons name="camera-plus" size={32} color={Colors.textMuted} />
              </View>
            )}
            <View style={styles.editBadge}>
              <MaterialCommunityIcons name="pencil" size={14} color={Colors.primary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.logoLabel}>Business Logo</Text>
          <Text style={styles.logoSubLabel}>This logo will appear on all agreement PDFs</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Business Name *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="e.g. Filzacare Installment Services"
                placeholderTextColor={Colors.textMuted}
                value={profile.name}
                onChangeText={(val) => setProfile(prev => ({ ...prev, name: val }))}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Phone Numbers</Text>
            <View style={[CommonStyles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
              <TextInput
                style={[CommonStyles.inputText, { flex: 1 }]}
                placeholder="e.g. 0300-1234567, 0321-7654321"
                placeholderTextColor={Colors.textMuted}
                value={profile.phone}
                onChangeText={(val) => setProfile(prev => ({ ...prev, phone: val }))}
                keyboardType="phone-pad"
              />
              <ContactPicker 
                onSelect={(contactName, contactPhone) => {
                  setProfile(prev => {
                    const newPhone = prev.phone ? `${prev.phone}, ${contactPhone}` : contactPhone;
                    return { ...prev, phone: newPhone };
                  });
                }} 
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Email Address</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="e.g. info@filzacare.pk"
                placeholderTextColor={Colors.textMuted}
                value={profile.email}
                onChangeText={(val) => setProfile(prev => ({ ...prev, email: val }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Business Address</Text>
            <View style={[CommonStyles.inputContainer, { minHeight: 80 }]}>
              <TextInput
                style={[CommonStyles.inputText, { textAlignVertical: 'top' }]}
                placeholder="Shop address, city, etc."
                placeholderTextColor={Colors.textMuted}
                value={profile.address}
                onChangeText={(val) => setProfile(prev => ({ ...prev, address: val }))}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Invoice Configuration</Text>
          <View style={{ flexDirection: 'row' }}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
              <Text style={CommonStyles.inputLabel}>Prefix</Text>
              <View style={CommonStyles.inputContainer}>
                <TextInput
                  style={CommonStyles.inputText}
                  placeholder="e.g. INV-"
                  placeholderTextColor={Colors.textMuted}
                  value={invoiceConfig.prefix}
                  onChangeText={(val) => setInvoiceConfig(prev => ({ ...prev, prefix: val }))}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={CommonStyles.inputLabel}>Starting Number</Text>
              <View style={CommonStyles.inputContainer}>
                <TextInput
                  style={CommonStyles.inputText}
                  placeholder="e.g. 1"
                  placeholderTextColor={Colors.textMuted}
                  value={invoiceConfig.nextNumber.toString()}
                  onChangeText={(val) => setInvoiceConfig(prev => ({ ...prev, nextNumber: parseInt(val) || 1 }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
          <Text style={styles.logoSubLabel}>
            Preview: {invoiceConfig.prefix}{invoiceConfig.nextNumber.toString().padStart(3, '0')}
          </Text>
        </View>

        <TouchableOpacity 
          style={CommonStyles.buttonPrimary} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={CommonStyles.buttonPrimaryText}>Save Business Profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  logoPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  logoLabel: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  logoSubLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  formCard: {
    ...CommonStyles.card,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
});
