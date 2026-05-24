import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Switch, TextInput, ActivityIndicator, Image, SafeAreaView, KeyboardAvoidingView, Platform, I18nManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Radius, Shadows } from '../theme';
import Header from '../components/Header';
import CustomCamera from '../components/CustomCamera';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuth, getStoredGoogleUser, signOutGoogle, backupToGoogleDrive, getLatestBackupFromDrive } from '../services/googleDriveService';
import { 
  getCurrencySetting, 
  saveCurrencySetting, 
  getNotificationSettings, 
  saveNotificationSettings, 
  NotificationSettings, 
  getAgreementTerms,
  saveAgreementTerms,
  getBusinessProfile,
  saveBusinessProfile,
  exportBackup,
  importBackup,
  isBiometricEnabled,
  saveBiometricSetting,
} from '../services/storage';
import { BusinessProfile } from '../types';
import AdComponent from '../components/AdComponent';
import UpgradeModal from '../components/UpgradeModal';
import SuggestionModal from '../components/SuggestionModal';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_KEY, setLanguage } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Note: expo-updates not installed; restart prompt handled via manual Alert

const CURRENCIES = [
  'PKR (₨)', 'USD ($)', 'EUR (€)', 'GBP (£)', 'SAR (﷼)', 'AED (د.إ)', 'INR (₹)', 'BDT (৳)', 'TRY (₺)', 'CAD ($)', 'AUD ($)'
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const [currency, setCurrency] = useState('PKR (₨)');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [language, setLanguageState] = useState('en');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [notifs, setNotifs] = useState<NotificationSettings>({ realTime: true, dailyOverdue: true });
  const [showTerms, setShowTerms] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [tempTerms, setTempTerms] = useState('');
  
  // Profile Edit State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Business Edit State
  const [bizName, setBizName] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizLogo, setBizLogo] = useState<string | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);

  // Google Drive State
  const [gDriveUser, setGDriveUser] = useState<{ name: string; email: string } | null>(null);
  const [backupProgress, setBackupProgress] = useState<string | null>(null);
  const { signIn: googleSignIn } = useGoogleAuth();

  // Subscription State
  const [subStatus, setSubStatus] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    const { getSubscriptionStatus } = require('../services/subscriptionService');
    const status = await getSubscriptionStatus();
    setSubStatus(status);
  };

  const loadSettings = async () => {
    const isBioHardware = await LocalAuthentication.hasHardwareAsync();
    const isBioEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    const [c, n, t, b, bEnabled] = await Promise.all([
      getCurrencySetting(),
      getNotificationSettings(),
      getAgreementTerms(),
      getBusinessProfile(),
      isBiometricEnabled(),
    ]);

    setCurrency(c);
    setNotifs(n);
    setTermsContent(t);
    setBiometricEnabled(bEnabled);
    setIsBiometricSupported(isBioHardware && isBioEnrolled);

    if (b) {
      setBizName(b.name);
      setBizEmail(b.email || '');
      setBizPhone(b.phone || '');
      setBizAddress(b.address || '');
      setBizLogo(b.logo || null);
    }

    // Load Google Drive connection status
    const gUser = await getStoredGoogleUser();
    setGDriveUser(gUser);

    // Load Language
    const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
    setLanguageState(lang || 'en');
  };

  const handleCurrencySelect = async (val: string) => {
    setCurrency(val);
    await saveCurrencySetting(val);
    setShowCurrencyModal(false);
  };

  const handleLanguageSelect = async (langCode: string) => {
    setLanguageState(langCode);
    await setLanguage(langCode);
    setShowLanguageModal(false);
    
    // Alert user about RTL shift requiring app restart
    const isRTL = langCode === 'ar' || langCode === 'ur';
    if (I18nManager.isRTL !== isRTL) {
      Alert.alert(
        'Restart Required',
        'Applying language changes and layout direction requires an app restart.',
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'OK', 
            onPress: () => {
              Alert.alert('Manual Restart', 'Please close and reopen the app to apply layout changes.');
            } 
          }
        ]
      );
    }
  };

  const toggleNotif = async (key: keyof NotificationSettings) => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    await saveNotificationSettings(updated);
  };

  const toggleBiometric = async () => {
    if (!isBiometricSupported) {
      Alert.alert('Not Supported', 'Biometric authentication is not available or not set up on this device.');
      return;
    }
    const newValue = !biometricEnabled;
    setBiometricEnabled(newValue);
    await saveBiometricSetting(newValue);
  };

  const startEditing = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditPhone(user?.phone || '');
    setShowEditProfile(true);
  };

  const pickLogo = async () => {
    Alert.alert(
      'Select Logo',
      'Choose an option to add logo',
      [
        {
          text: 'Camera (with Guide)',
          onPress: () => setCameraVisible(true)
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Need permission to select a logo');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              allowsEditing: true,
            });
            if (!result.canceled) {
              setBizLogo(result.assets[0].uri);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleCameraCapture = (uri: string) => {
    setBizLogo(uri);
    setCameraVisible(false);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim() || !bizName.trim()) {
      Alert.alert('Error', 'Full Name, Email, and Business Name are required.');
      return;
    }

    setIsUpdating(true);
    try {
      const personalResult = await updateProfile({
        name: editName,
        email: editEmail,
        phone: editPhone,
      });

      await saveBusinessProfile({
        name: bizName,
        email: bizEmail,
        phone: bizPhone,
        address: bizAddress,
        logo: bizLogo || undefined,
      });

      setIsUpdating(false);
      if (personalResult.success) {
        Alert.alert('Success', 'Profile and Business details updated.');
        setShowEditProfile(false);
      } else {
        Alert.alert('Error', personalResult.error || 'Failed to update personal profile.');
      }
    } catch (err: any) {
      setIsUpdating(false);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleExport = async () => {
    try {
      const backupString = await exportBackup();
      const filename = `IMS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, backupString, { encoding: 'utf8' });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Database Backup',
          UTI: 'public.json'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export database.');
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Database Import',
      'WARNING: Importing a database will overwrite all your current client, installment, and payment data. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Select File', 
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });

              if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
              }

              const pickedFile = result.assets[0];
              const fileContent = await FileSystem.readAsStringAsync(pickedFile.uri, { encoding: 'utf8' });
              
              setIsUpdating(true);
              const importResult = await importBackup(fileContent);
              setIsUpdating(false);
              
              if (importResult.success) {
                Alert.alert('Success', 'Database imported successfully. The app will reload settings.', [
                  { text: 'OK', onPress: () => loadSettings() }
                ]);
              } else {
                Alert.alert('Import Failed', importResult.error || 'Invalid backup file.');
              }
            } catch (err: any) {
              setIsUpdating(false);
              Alert.alert('Error', err.message || 'Failed to import backup.');
            }
          } 
        }
      ]
    );
  };
  
  const handleSaveTerms = async () => {
    setIsUpdating(true);
    try {
      await saveAgreementTerms(tempTerms);
      setTermsContent(tempTerms);
      setIsEditingTerms(false);
      Alert.alert('Success', 'Agreement terms updated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save terms.');
    } finally {
      setIsUpdating(false);
    }
  };

  const applyFormat = (tag: string) => {
    // Simple tag insertion (appends to end for simplicity in mobile, 
    // or wraps if we had selection range - but selection range is tricky in RN)
    // We'll just provide help text or wrap the whole content if selected
    setTempTerms(` <${tag}>${tempTerms}</${tag}> `);
  };

  const OptionRow = ({ icon, label, rightText, onPress, showChevron = true }: { icon: any, label: string, rightText?: string, onPress?: () => void, showChevron?: boolean }) => (
    <TouchableOpacity style={styles.optionRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.optionIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
      {rightText && (
        <Text style={styles.optionRightText}>{rightText}</Text>
      )}
      {showChevron && !rightText && (
        <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );

  const ToggleRow = ({ icon, label, value, onToggle }: { icon: any, label: string, value: boolean, onToggle: () => void }) => (
    <View style={styles.optionRow}>
      <View style={styles.optionIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
      <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.success }}
        thumbColor={Colors.surface}
      />
    </View>
  );

  return (
    <View style={CommonStyles.screen}>
      <Header title="Settings" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {subStatus && !subStatus.isPro && (
          <TouchableOpacity 
            style={styles.upgradeHeaderCard} 
            onPress={() => setShowUpgradeModal(true)}
          >
            <View style={styles.upgradeHeaderInfo}>
              <MaterialCommunityIcons name="crown" size={24} color={Colors.accent} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.upgradeHeaderText}>Upgrade to Pro</Text>
                <Text style={styles.upgradeHeaderSub}>Unlock unlimited clients & plans</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.accent} />
          </TouchableOpacity>
        )}

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={styles.editIconBadge} onPress={startEditing}>
              <MaterialCommunityIcons name="pencil" size={16} color={Colors.surface} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>{t('settings.preferences')}</Text>
        <View style={styles.optionsBlock}>
          <ToggleRow icon="bell-ring-outline" label={t('settings.real_time_alerts')} value={notifs.realTime} onToggle={() => toggleNotif('realTime')} />
          <ToggleRow icon="calendar-clock-outline" label={t('settings.daily_overdue')} value={notifs.dailyOverdue} onToggle={() => toggleNotif('dailyOverdue')} />
          {isBiometricSupported && (
            <ToggleRow icon="fingerprint" label={t('settings.biometric')} value={biometricEnabled} onToggle={toggleBiometric} />
          )}
          <OptionRow icon="translate" label={t('settings.language')} rightText={language === 'en' ? 'English' : language === 'ur' ? 'اردو' : 'العربية'} onPress={() => setShowLanguageModal(true)} />
          <OptionRow icon="currency-usd" label={t('settings.currency')} rightText={currency} onPress={() => setShowCurrencyModal(true)} />
        </View>

        <Text style={styles.sectionHeader}>{t('settings.data_management')}</Text>
        <View style={styles.optionsBlock}>
          <OptionRow icon="database-import" label={t('settings.import_db')} onPress={handleImport} />
          <OptionRow icon="database-export" label={t('settings.export_db')} onPress={handleExport} />
        </View>

        <Text style={styles.sectionHeader}>{t('settings.google_drive')}</Text>
        <View style={styles.optionsBlock}>
          {gDriveUser ? (
            <>
              <View style={styles.optionRow}>
                <View style={styles.optionIcon}>
                  <MaterialCommunityIcons name="google" size={22} color="#4285F4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { marginBottom: 2 }]}>{gDriveUser.name}</Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted }}>{gDriveUser.email}</Text>
                </View>
                <View style={{ backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                  <Text style={{ fontFamily: Fonts.semiBold, fontSize: 10, color: Colors.success }}>CONNECTED</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: Colors.borderLight }]}
                onPress={async () => {
                  if (!subStatus?.isPro) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  setBackupProgress('Starting backup...');
                  const result = await backupToGoogleDrive((status) => setBackupProgress(status));
                  setBackupProgress(null);
                  if (result.success) {
                    Alert.alert('\u2705 Backup Complete', 'Your entire database has been safely uploaded to your Google Drive in the "IMS Backup" folder.');
                  } else {
                    Alert.alert('Backup Failed', result.error || 'Unknown error.');
                  }
                }}
                disabled={!!backupProgress}
              >
                <View style={styles.optionIcon}>
                  <MaterialCommunityIcons name="cloud-upload" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.optionLabel}>Upload Backup to Drive</Text>
                {!subStatus?.isPro && <MaterialCommunityIcons name="crown" size={20} color={Colors.accent} style={{ marginRight: 8 }} />}
                {backupProgress ? <ActivityIndicator size="small" color={Colors.accent} /> : <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textMuted} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: Colors.borderLight }]}
                onPress={async () => {
                  if (!subStatus?.isPro) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  Alert.alert('Restore from Drive', 'This will overwrite ALL current local data with the latest backup from your Google Drive. Continue?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Restore', style: 'destructive', onPress: async () => {
                      setBackupProgress('Downloading backup...');
                      const result = await getLatestBackupFromDrive();
                      if (result.success && result.data) {
                        const importResult = await importBackup(result.data);
                        setBackupProgress(null);
                        if (importResult.success) {
                          Alert.alert('\u2705 Restored', 'Data restored from Google Drive successfully.', [
                            { text: 'OK', onPress: () => loadSettings() }
                          ]);
                        } else {
                          Alert.alert('Restore Failed', importResult.error || 'Invalid backup data.');
                        }
                      } else {
                        setBackupProgress(null);
                        Alert.alert('Error', result.error || 'Failed to download backup.');
                      }
                    }}
                  ]);
                }}
              >
                <View style={styles.optionIcon}>
                  <MaterialCommunityIcons name="cloud-download" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.optionLabel}>Restore from Drive</Text>
                {!subStatus?.isPro && <MaterialCommunityIcons name="crown" size={20} color={Colors.accent} style={{ marginRight: 8 }} />}
                <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: Colors.borderLight }]}
                onPress={() => {
                  Alert.alert('Disconnect Google', 'This will only remove the connection from this app. Your backups on Google Drive will remain safe.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Disconnect', style: 'destructive', onPress: async () => {
                      await signOutGoogle();
                      setGDriveUser(null);
                    }}
                  ]);
                }}
              >
                <View style={styles.optionIcon}>
                  <MaterialCommunityIcons name="link-off" size={22} color={Colors.danger} />
                </View>
                <Text style={[styles.optionLabel, { color: Colors.danger }]}>Disconnect Google Account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.optionRow}
              onPress={async () => {
                if (!subStatus?.isPro) {
                  setShowUpgradeModal(true);
                  return;
                }
                const result = await googleSignIn();
                if (result.success) {
                  const gUser = await getStoredGoogleUser();
                  setGDriveUser(gUser);
                  Alert.alert('\u2705 Connected!', 'Your Google account is now linked. You can now upload your database backups to Google Drive.');
                } else {
                  Alert.alert('Connection Failed', result.error || 'Could not connect to Google.');
                }
              }}
            >
              <View style={styles.optionIcon}>
                <MaterialCommunityIcons name="google-drive" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.optionLabel}>Connect Google Drive</Text>
              {!subStatus?.isPro && <MaterialCommunityIcons name="crown" size={20} color={Colors.accent} style={{ marginRight: 8 }} />}
              <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionHeader}>{t('settings.about')}</Text>
        <View style={styles.optionsBlock}>
          <OptionRow icon="information-outline" label={t('settings.app_version')} rightText="1.1.0" showChevron={false} />
          <OptionRow icon="lightbulb-outline" label={t('settings.suggest_update')} onPress={() => setShowSuggestionModal(true)} />
          <OptionRow icon="file-document-outline" label={t('settings.tos')} onPress={() => setShowTerms(true)} />
          <OptionRow icon="shield-check-outline" label={t('settings.developed_by')} showChevron={false} />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <AdComponent />

        {/* Currency Modal */}
        <Modal visible={showCurrencyModal} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Currency</Text>
                <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity 
                    key={c} 
                    style={[styles.currencyItem, currency === c && styles.currencyItemActive]}
                    onPress={() => handleCurrencySelect(c)}
                  >
                    <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
                    {currency === c && <MaterialCommunityIcons name="check" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Profile Edit Modal */}
        <Modal visible={showEditProfile} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile & Branding</Text>
                <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
                <Text style={styles.editSectionTitle}>PERSONAL DETAILS</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter your name"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="Enter email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Enter phone"
                    keyboardType="phone-pad"
                  />
                </View>

                <Text style={[styles.editSectionTitle, { marginTop: Spacing.lg }]}>BUSINESS DETAILS</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={bizName}
                    onChangeText={setBizName}
                    placeholder="e.g. My Installment Co."
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={bizAddress}
                    onChangeText={setBizAddress}
                    placeholder="Shop address, city, etc."
                    multiline
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={bizEmail}
                    onChangeText={setBizEmail}
                    placeholder="business@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={bizPhone}
                    onChangeText={setBizPhone}
                    placeholder="03xx-xxxxxxx"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Logo</Text>
                  <TouchableOpacity style={styles.logoPicker} onPress={pickLogo}>
                    {bizLogo ? (
                      <Image source={{ uri: bizLogo }} style={styles.pickedLogo} />
                    ) : (
                      <View style={styles.logoPlaceholder}>
                        <MaterialCommunityIcons name="image-plus" size={32} color={Colors.textMuted} />
                        <Text style={styles.logoPlaceholderText}>Upload Logo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.saveButton, isUpdating && { opacity: 0.7 }]} 
                  onPress={handleSaveProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Terms Modal */}
        <Modal visible={showTerms} transparent={false} animationType="slide">
          <SafeAreaView style={[CommonStyles.screen, { backgroundColor: Colors.surface }]}>
            <View style={styles.modalHeaderExtended}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{isEditingTerms ? 'Edit Agreement Details' : 'Terms of Service'}</Text>
                <TouchableOpacity onPress={() => { setShowTerms(false); setIsEditingTerms(false); }}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              {!isEditingTerms && (
                <TouchableOpacity style={styles.editTermsBtn} onPress={() => { setTempTerms(termsContent); setIsEditingTerms(true); }}>
                  <MaterialCommunityIcons name="pencil" size={16} color={Colors.primary} />
                  <Text style={styles.editTermsBtnText}>Edit Terms</Text>
                </TouchableOpacity>
              )}
            </View>

            {isEditingTerms ? (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.editorToolbar}>
                  <TouchableOpacity style={styles.toolBtn} onPress={() => setTempTerms(tempTerms + '<b></b>')}>
                    <MaterialCommunityIcons name="format-bold" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={() => setTempTerms(tempTerms + '<u></u>')}>
                    <MaterialCommunityIcons name="format-underline" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={() => {
                    // Auto-detect next heading number from patterns like "1.", "2.", "3." etc. everywhere
                    const matches = tempTerms.match(/\d+\./g) || [];
                    const nextNum = matches.length > 0 
                      ? Math.max(...matches.map(m => parseInt(m))) + 1 
                      : 1;
                    const sp = tempTerms.endsWith('\n') ? '\n' : '\n\n';
                    setTempTerms(tempTerms.trimEnd() + `${sp}${nextNum}. `);
                  }}>
                    <MaterialCommunityIcons name="format-header-pound" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.toolHint}>Tip: Put text between tags like &lt;b&gt;Important&lt;/b&gt;</Text>
                </View>
                <TextInput
                  style={styles.termsEditor}
                  multiline
                  value={tempTerms}
                  onChangeText={setTempTerms}
                  placeholder="Enter dynamic agreement terms here..."
                  autoFocus
                />
                <TouchableOpacity style={styles.saveTermsButton} onPress={handleSaveTerms}>
                  {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTermsButtonText}>Save & Apply to PDF</Text>}
                </TouchableOpacity>
              </KeyboardAvoidingView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ padding: Spacing.lg }}>
                <Text style={styles.termsContentText}>{termsContent}</Text>
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

      </ScrollView>

      <UpgradeModal 
        visible={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={loadSubscription}
      />

      <SuggestionModal 
        visible={showSuggestionModal}
        onClose={() => setShowSuggestionModal(false)}
        userName={user?.name || ''}
        userPhone={user?.phone || ''}
      />

      {/* Language Modal */}
      <Modal visible={showLanguageModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.language')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.currencyItem} onPress={() => handleLanguageSelect('en')}>
              <Text style={styles.currencyText}>English</Text>
              {language === 'en' && <MaterialCommunityIcons name="check" size={20} color={Colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.currencyItem} onPress={() => handleLanguageSelect('ur')}>
              <Text style={styles.currencyText}>اردو (Urdu)</Text>
              {language === 'ur' && <MaterialCommunityIcons name="check" size={20} color={Colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.currencyItem} onPress={() => handleLanguageSelect('ar')}>
              <Text style={styles.currencyText}>العربية (Arabic)</Text>
              {language === 'ar' && <MaterialCommunityIcons name="check" size={20} color={Colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={cameraVisible} animationType="slide">
        <CustomCamera 
          overlayType="avatar"
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
  profileSection: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    color: Colors.primary,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },
  email: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  roleText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.surface,
  },
  sectionHeader: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    marginTop: Spacing.lg,
  },
  optionsBlock: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  optionLabel: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  optionRightText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  logoutButton: {
    marginTop: Spacing.xxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight + '50',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutButtonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 0,
    width: '100%',
    maxHeight: '90%',
    ...Shadows.lg,
    overflow: 'hidden',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  modalHeaderExtended: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editTermsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent + '33',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  editTermsBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 6,
  },
  editorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  toolBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  toolHint: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textMuted,
    flex: 1,
  },
  termsEditor: {
    flex: 1,
    padding: Spacing.lg,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  saveTermsButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    alignItems: 'center',
    margin: Spacing.lg,
    borderRadius: Radius.md,
    ...Shadows.md,
  },
  saveTermsButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.surface,
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  currencyItemActive: {
    backgroundColor: Colors.primary + '05',
  },
  currencyText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  currencyTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.bold,
  },
  termsContentText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    lineHeight: 24,
    paddingBottom: 50,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.base,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.surface,
  },
  editSectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  logoPicker: {
    height: 120,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pickedLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 8,
  },
  upgradeHeaderCard: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '60',
    ...Shadows.md,
  },
  upgradeHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeHeaderText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.accent,
  },
  upgradeHeaderSub: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.accentLight,
    opacity: 0.8,
  },
});
