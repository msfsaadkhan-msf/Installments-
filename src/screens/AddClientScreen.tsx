import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Radius, Shadows } from '../theme';
import Header from '../components/Header';
import { addClient, updateClient } from '../services/storage';
import { Client } from '../types';
import { generateId, todayISO } from '../utils/date';
import { pickOrCaptureImage, saveOrganizedImage } from '../services/mediaService';
import CustomCamera from '../components/CustomCamera';
import ContactPicker from '../components/ContactPicker';
import UpgradeModal from '../components/UpgradeModal';

export default function AddClientScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clientToEdit: Client | undefined = route.params?.client;

  const [name, setName] = useState(clientToEdit?.name || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [cnic, setCnic] = useState(clientToEdit?.cnic || '');
  const [address, setAddress] = useState(clientToEdit?.address || '');
  const [city, setCity] = useState(clientToEdit?.city || '');
  const [fatherName, setFatherName] = useState(clientToEdit?.fatherName || '');
  const [permanentAddress, setPermanentAddress] = useState(clientToEdit?.permanentAddress || '');
  const [loading, setLoading] = useState(false);
  
  const [profileImage, setProfileImage] = useState<string | null>(clientToEdit?.profileImage || null);
  const [cnicFront, setCnicFront] = useState<string | null>(clientToEdit?.cnicFront || null);
  const [cnicBack, setCnicBack] = useState<string | null>(clientToEdit?.cnicBack || null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraOverlay, setCameraOverlay] = useState<'cnic' | 'avatar'>('cnic');
  const [activePhotoType, setActivePhotoType] = useState<'profile' | 'front' | 'back' | null>(null);

  const pickImage = async (type: 'profile' | 'front' | 'back') => {
    Alert.alert(
      'Select Image',
      'Choose an option to add image',
      [
        {
          text: 'Camera (with Guide)',
          onPress: () => {
            setCameraOverlay(type === 'profile' ? 'avatar' : 'cnic');
            setActivePhotoType(type);
            setCameraVisible(true);
          }
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const uri = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            });
            if (!uri.canceled) {
              const selectedUri = uri.assets[0].uri;
              if (type === 'profile') setProfileImage(selectedUri);
              else if (type === 'front') setCnicFront(selectedUri);
              else if (type === 'back') setCnicBack(selectedUri);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleCameraCapture = (uri: string) => {
    if (activePhotoType === 'profile') setProfileImage(uri);
    else if (activePhotoType === 'front') setCnicFront(uri);
    else if (activePhotoType === 'back') setCnicBack(uri);
    setCameraVisible(false);
  };

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleSave = async () => {
    if (!name || !phone || !cnic || !address) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      if (!clientToEdit) {
        const { getSubscriptionStatus, checkClientLimit } = require('../services/subscriptionService');
        const { getClientCount } = require('../services/storage');
        const status = await getSubscriptionStatus();
        const currentCount = await getClientCount();
        
        if (!checkClientLimit(currentCount, status)) {
          setLoading(false);
          setShowUpgradeModal(true);
          return;
        }
      }

      let finalProfile = profileImage;
      let finalFront = cnicFront;
      let finalBack = cnicBack;

      // Save images to organized folders
      if (profileImage && !profileImage.includes('IMS by MSF')) {
        finalProfile = await saveOrganizedImage(profileImage, name, 'Client', 'profile');
      }
      if (cnicFront && !cnicFront.includes('IMS by MSF')) {
        finalFront = await saveOrganizedImage(cnicFront, name, 'Client', 'cnic_front');
      }
      if (cnicBack && !cnicBack.includes('IMS by MSF')) {
        finalBack = await saveOrganizedImage(cnicBack, name, 'Client', 'cnic_back');
      }

      if (clientToEdit) {
        const updatedClient: Client = {
          ...clientToEdit,
          name,
          phone,
          cnic,
          address,
          city: city || 'Unknown',
          fatherName,
          permanentAddress,
          profileImage: finalProfile || undefined,
          cnicFront: finalFront || undefined,
          cnicBack: finalBack || undefined,
        };
        await updateClient(updatedClient);
      } else {
        const newClient: Client = {
          id: generateId(),
          name,
          phone,
          cnic,
          address,
          city: city || 'Unknown',
          fatherName,
          permanentAddress,
          createdAt: todayISO(),
          profileImage: finalProfile || undefined,
          cnicFront: finalFront || undefined,
          cnicBack: finalBack || undefined,
        };
        await addClient(newClient);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save client. Please try again.');
      setLoading(false);
    }
  };

  return (
    <View style={CommonStyles.screen}>
      <Header title={clientToEdit ? "Edit Client" : "Add New Client"} showBack={true} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Image Picker */}
        <View style={styles.profilePickerContainer}>
          <TouchableOpacity 
            style={styles.profileImageWrapper} 
            onPress={() => pickImage('profile')}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <MaterialCommunityIcons name="camera-plus" size={40} color={Colors.textMuted} />
                <Text style={styles.profilePlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Full Name *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="e.g. Ahmed Khan"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Father's Name</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="Father's Name"
                placeholderTextColor={Colors.textMuted}
                value={fatherName}
                onChangeText={setFatherName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Phone Number *</Text>
            <View style={[CommonStyles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
              <TextInput
                style={[CommonStyles.inputText, { flex: 1 }]}
                placeholder="0300-1234567"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
              <ContactPicker 
                onSelect={(contactName, contactPhone) => {
                  setPhone(contactPhone);
                  if (!name) setName(contactName);
                }} 
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>CNIC Number *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="35201-1234567-1"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                value={cnic}
                onChangeText={setCnic}
              />
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Address Information</Text>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Street Address *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="House 45, Street 12, G-11"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>City</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="Islamabad"
                placeholderTextColor={Colors.textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Permanent Address</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="Permanent Address as per CNIC"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
                value={permanentAddress}
                onChangeText={setPermanentAddress}
              />
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>CNIC Documents</Text>
          <View style={CommonStyles.rowBetween}>
            <TouchableOpacity 
              style={[styles.documentPicker, { marginRight: Spacing.sm }]} 
              onPress={() => pickImage('front')}
            >
              {cnicFront ? (
                <Image source={{ uri: cnicFront }} style={styles.documentImage} />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={30} color={Colors.textMuted} />
                  <Text style={styles.documentPlaceholderText}>CNIC Front</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.documentPicker, { marginLeft: Spacing.sm }]} 
              onPress={() => pickImage('back')}
            >
              {cnicBack ? (
                <Image source={{ uri: cnicBack }} style={styles.documentImage} />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={30} color={Colors.textMuted} />
                  <Text style={styles.documentPlaceholderText}>CNIC Back</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={CommonStyles.buttonPrimary} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={CommonStyles.buttonPrimaryText}>{clientToEdit ? 'Update Client' : 'Save Client'}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={showUpgradeModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.upgradeCard}>
            <MaterialCommunityIcons name="crown" size={60} color={Colors.accent} />
            <Text style={styles.upgradeTitle}>Client Limit Reached</Text>
            <Text style={styles.upgradeDesc}>
              The free version is limited to 20 clients. Upgrade to Pro for unlimited clients, cloud sync, and an ad-free experience.
            </Text>
            
            <TouchableOpacity 
              style={styles.upgradeBtn}
              onPress={() => {
                setShowUpgradeModal(false);
                setShowUpgradeModal(true); // Re-triggering for UX clarity or just open it
              }}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.maybeLaterBtn}
              onPress={() => setShowUpgradeModal(false)}
            >
              <Text style={styles.maybeLaterText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <UpgradeModal 
        visible={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
      />

      <Modal visible={cameraVisible} animationType="slide">
        <CustomCamera 
          overlayType={cameraOverlay}
          onCapture={handleCameraCapture}
          onClose={() => setCameraVisible(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  formCard: {
    ...CommonStyles.card,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  profilePickerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.sm,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    alignItems: 'center',
  },
  profilePlaceholderText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  documentPicker: {
    flex: 1,
    height: 120,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  documentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  documentPlaceholder: {
    alignItems: 'center',
  },
  documentPlaceholderText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  upgradeCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    width: '100%',
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  upgradeTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.accent,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  upgradeDesc: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.surface,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
    opacity: 0.9,
  },
  upgradeBtn: {
    backgroundColor: Colors.accent,
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  upgradeBtnText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  maybeLaterBtn: {
    paddingVertical: Spacing.sm,
  },
  maybeLaterText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
  },
});
