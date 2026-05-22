import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, Modal, Image, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Shadows, Radius } from '../theme';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import PaymentItem from '../components/PaymentItem';
import { getPayments, deletePayment, updateInstallment, isBiometricEnabled, getInstallments } from '../services/storage';
import { pickOrCaptureImage, saveOrganizedImage } from '../services/mediaService';
import { useAuth } from '../context/AuthContext';
import { Installment, Payment, InstallmentStatus } from '../types';
import { formatPKR, calcProgress } from '../utils/currency';
import { formatDateSlash } from '../utils/date';
import { generateAgreementPDF } from '../services/pdfService';

export default function InstallmentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const installment: Installment | undefined = route.params?.installment;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [otherDetailsModalVisible, setOtherDetailsModalVisible] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Other details states for editing
  const [buyPrice, setBuyPrice] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [privatePhotos, setPrivatePhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [showSecurePassword, setShowSecurePassword] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentInst, setCurrentInst] = useState<Installment | null>(installment || null);

  const loadPayments = async () => {
    if (!currentInst) return;
    try {
      // Refresh installment data as well
      const allInsts = await getInstallments();
      const updatedInst = allInsts.find(i => i.id === currentInst.id);
      if (updatedInst) setCurrentInst(updatedInst);

      const all = await getPayments();
      // Filter payments for this specific installment, newest first
      const filtered = all
        .filter(p => p.installmentId === currentInst.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(filtered);
    } catch (e) {
      console.error('Failed to load installment payments', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPayments();
      if (installment) {
        setBuyPrice(installment.buyPrice?.toString() || '');
        setPrivateNotes(installment.privateNotes || '');
        setPrivatePhotos(installment.privatePhotos || []);
      }
    }, [installment])
  );

  const { user } = useAuth();

  const handleOpenOtherDetails = async () => {
    setIsAuthenticating(true);
    setAuthError('');
    
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const bioEnabled = await isBiometricEnabled();

      if (hasHardware && isEnrolled && bioEnabled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to view secure details',
          fallbackLabel: 'Use Password',
        });

        if (result.success) {
          setOtherDetailsModalVisible(true);
          setIsAuthenticating(false);
          return;
        }
      }
      
      // Fallback to password
      setShowPasswordAuth(true);
    } catch (e) {
      setShowPasswordAuth(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePasswordAuth = async () => {
    if (!user) return;
    setAuthError('');
    try {
      const passwordsRaw = await AsyncStorage.getItem('@ims_passwords');
      const passwords = JSON.parse(passwordsRaw || '{}');
      if (passwords[user.id] === authPassword) {
        setShowPasswordAuth(false);
        setAuthPassword('');
        setShowSecurePassword(false);
        setOtherDetailsModalVisible(true);
      } else {
        setAuthError('Incorrect password');
      }
    } catch (e) {
      setAuthError('Authentication failed');
    }
  };

  const handleSaveOtherDetails = async () => {
    if (!installment) return;
    setIsSaving(true);
    try {
      const updated: Installment = {
        ...installment,
        buyPrice: parseFloat(buyPrice) || 0,
        privateNotes,
        privatePhotos,
      };
      await updateInstallment(updated);
      setOtherDetailsModalVisible(false);
      Alert.alert('Success', 'Private details updated successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save private details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPrivatePhoto = async () => {
    const uri = await pickOrCaptureImage('document');
    if (uri) {
      try {
        const finalUri = await saveOrganizedImage(
          uri,
          currentInst?.clientName || 'General',
          'Client',
          'private'
        );
        setPrivatePhotos([...privatePhotos, finalUri]);
      } catch (e) {
        Alert.alert('Error', 'Failed to save private photo');
      }
    }
  };

  const removePrivatePhoto = (idx: number) => {
    setPrivatePhotos(privatePhotos.filter((_, i) => i !== idx));
  };

  const handleLongPressPayment = (payment: Payment) => {
    Alert.alert(
      'Payment Action',
      `Choose an action for payment of ${formatPKR(payment.amount)}`,
      [
        {
          text: 'Edit Payment',
          onPress: () => navigation.navigate('RecordPaymentScreen', { 
            installment: currentInst, 
            payment 
          })
        },
        {
          text: 'Delete Payment',
          style: 'destructive',
          onPress: () => confirmDeletePayment(payment)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const confirmDeletePayment = (payment: Payment) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this payment record? This will revert the installment balance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayment(payment.id);
              await loadPayments();
              Alert.alert('Success', 'Payment deleted and balance updated.');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete payment');
            }
          }
        }
      ]
    );
  };

  if (!currentInst) {
    return (
      <View style={CommonStyles.screen}>
        <Header title="Error" showBack />
        <View style={CommonStyles.center}>
          <Text>Installment data missing.</Text>
        </View>
      </View>
    );
  }

  const progress = calcProgress(currentInst.paidAmount + currentInst.downPayment, currentInst.totalAmount);

  return (
    <View style={CommonStyles.screen}>
      <Header title="Plan Details" showBack />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Main Status Card */}
        <View style={styles.statusCard}>
          <View style={[CommonStyles.rowBetween, { marginBottom: Spacing.sm }]}>
            <Text style={styles.productName}>{currentInst.productName}</Text>
            <StatusBadge status={currentInst.status} />
          </View>
          
          <Text style={styles.clientName}>Client: {currentInst.clientName}</Text>

          <View style={styles.progressContainer}>
            <View style={CommonStyles.rowBetween}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Price</Text>
              <Text style={styles.statValue}>{currentInst.productPrice ? formatPKR(currentInst.productPrice) : '-'}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Markup</Text>
              <Text style={[styles.statValue, { color: Colors.primary }]}>{currentInst.productPercentage ? currentInst.productPercentage + '%' : '-'}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{formatPKR(currentInst.totalAmount)}</Text>
            </View>
          </View>

          <View style={[styles.statsGrid, { marginTop: Spacing.sm }]}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Paid</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>{formatPKR(currentInst.paidAmount)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={[styles.statValue, { color: Colors.danger }]}>{formatPKR(currentInst.remainingAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionRow}>
          {currentInst.status !== InstallmentStatus.COMPLETED && (
            <TouchableOpacity 
              style={[CommonStyles.buttonPrimary, { flex: 1.5, marginRight: Spacing.sm, height: 48 }]} 
              onPress={() => navigation.navigate('RecordPaymentScreen', { installment: currentInst })}
            >
              <MaterialCommunityIcons name="cash-register" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={CommonStyles.buttonPrimaryText}>Record Payment</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.detailsButton, { flex: 1, marginRight: Spacing.sm }]} 
            onPress={() => setDetailsModalVisible(true)}
          >
            <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionRow, { marginTop: -Spacing.md }]}>
          <TouchableOpacity 
            style={[styles.detailsButton, { flex: 1, marginRight: Spacing.sm, backgroundColor: Colors.primaryLight }]} 
            onPress={() => generateAgreementPDF(currentInst)}
          >
            <MaterialCommunityIcons name="file-pdf-box" size={20} color={Colors.surface} />
            <Text style={[styles.detailsButtonText, { color: Colors.surface, marginLeft: 4 }]}>Agreement</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.detailsButton, { flex: 1, borderColor: Colors.accent, backgroundColor: Colors.surface }]} 
            onPress={handleOpenOtherDetails}
          >
            {isAuthenticating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <MaterialCommunityIcons name="shield-lock" size={20} color={Colors.primary} />
                <Text style={styles.detailsButtonText}>Other Details</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Detailed Info */}
        <Text style={CommonStyles.sectionTitle}>Plan Information</Text>
        <View style={styles.infoCard}>
          <Text style={styles.modalSectionTitle}>Financials</Text>
          <InfoRow label="Product Price" value={currentInst.productPrice ? formatPKR(currentInst.productPrice) : '-'} />
          <InfoRow label="Markup Percentage" value={currentInst.productPercentage ? currentInst.productPercentage + '%' : '-'} />
          <InfoRow label="Total Product Value" value={formatPKR(currentInst.totalAmount)} />
          <InfoRow label="Down Payment" value={formatPKR(currentInst.downPayment)} />
          <InfoRow label="Financed Amount" value={formatPKR(currentInst.financedAmount)} />
          <InfoRow label="Monthly Installment" value={formatPKR(currentInst.monthlyAmount)} />
          <InfoRow label="Tenure" value={currentInst.tenure + ' Months'} />
          <InfoRow label="Remaining Amount" value={formatPKR(currentInst.remainingAmount)} noBorder />
        </View>

        {/* Payment History */}
        <Text style={[CommonStyles.sectionTitle, { marginTop: Spacing.lg }]}>Payment History</Text>
        {payments.length > 0 ? (
          payments.map(payment => (
            <PaymentItem 
              key={payment.id} 
              payment={payment} 
              onLongPress={handleLongPressPayment}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No payments have been recorded yet.</Text>
          </View>
        )}

      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[CommonStyles.rowBetween, { marginBottom: Spacing.md }]}>
              <Text style={{ fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.primary }}>Agreement Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionTitle}>Guarantor 1</Text>
              <InfoRow label="Name" value={currentInst.guarantor1Name || 'N/A'} />
              <InfoRow label="CNIC" value={currentInst.guarantor1Cnic || 'N/A'} />
              <InfoRow label="Phone" value={currentInst.guarantor1Phone || 'N/A'} />
              <InfoRow label="Address" value={currentInst.guarantor1Address || 'N/A'} />
              
              <View style={styles.modalDocRow}>
                {currentInst.guarantor1CnicFront && (
                  <TouchableOpacity style={styles.modalDocBtn} onPress={() => setViewingImage(currentInst.guarantor1CnicFront!)}>
                    <MaterialCommunityIcons name="file-image-outline" size={14} color={Colors.accent} />
                    <Text style={styles.modalDocBtnText}>CNIC Front</Text>
                  </TouchableOpacity>
                )}
                {currentInst.guarantor1CnicBack && (
                  <TouchableOpacity style={styles.modalDocBtn} onPress={() => setViewingImage(currentInst.guarantor1CnicBack!)}>
                    <MaterialCommunityIcons name="file-image-outline" size={14} color={Colors.accent} />
                    <Text style={styles.modalDocBtnText}>CNIC Back</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.modalSectionTitle, { marginTop: Spacing.md }]}>Guarantor 2</Text>
              <InfoRow label="Name" value={currentInst.guarantor2Name || 'N/A'} />
              <InfoRow label="CNIC" value={currentInst.guarantor2Cnic || 'N/A'} />
              <InfoRow label="Phone" value={currentInst.guarantor2Phone || 'N/A'} />
              <InfoRow label="Address" value={currentInst.guarantor2Address || 'N/A'} />

              <View style={styles.modalDocRow}>
                {currentInst.guarantor2CnicFront && (
                  <TouchableOpacity style={styles.modalDocBtn} onPress={() => setViewingImage(currentInst.guarantor2CnicFront!)}>
                    <MaterialCommunityIcons name="file-image-outline" size={14} color={Colors.accent} />
                    <Text style={styles.modalDocBtnText}>CNIC Front</Text>
                  </TouchableOpacity>
                )}
                {currentInst.guarantor2CnicBack && (
                  <TouchableOpacity style={styles.modalDocBtn} onPress={() => setViewingImage(currentInst.guarantor2CnicBack!)}>
                    <MaterialCommunityIcons name="file-image-outline" size={14} color={Colors.accent} />
                    <Text style={styles.modalDocBtnText}>CNIC Back</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.modalSectionTitle, { marginTop: Spacing.md }]}>Product Details</Text>
              <InfoRow label="Name" value={currentInst.productName || 'N/A'} />
              <InfoRow label="Model" value={currentInst.productModel || 'N/A'} />
              <InfoRow label="Serial" value={currentInst.productSerial || 'N/A'} />
              
              {currentInst.variants?.map((v: any, idx: number) => (
                <InfoRow key={idx} label={v.label} value={v.value} />
              ))}

              <Text style={[styles.modalSectionTitle, { marginTop: Spacing.md }]}>Documents & Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalGallery}>
                {currentInst.productPhotos?.map((uri, idx) => (
                  <TouchableOpacity key={idx} onPress={() => setViewingImage(uri)}>
                    <Image source={{ uri }} style={styles.galleryThumb} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!viewingImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity 
            style={styles.imageViewerClose} 
            onPress={() => setViewingImage(null)}
          >
            <MaterialCommunityIcons name="close" size={30} color={Colors.surface} />
          </TouchableOpacity>
          {viewingImage && (
            <Image 
              source={{ uri: viewingImage }} 
              style={styles.fullImage} 
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Other Details Secure Modal */}
      <Modal
        visible={otherDetailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOtherDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={[CommonStyles.rowBetween, { marginBottom: Spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="shield-lock" size={24} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.primary }}>Other Private Details</Text>
              </View>
              <TouchableOpacity onPress={() => setOtherDetailsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={CommonStyles.inputLabel}>Buying Price (Rs)</Text>
                <View style={CommonStyles.inputContainer}>
                  <TextInput 
                    style={CommonStyles.inputText} 
                    placeholder="e.g. 15000" 
                    keyboardType="numeric" 
                    value={buyPrice} 
                    onChangeText={setBuyPrice} 
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={CommonStyles.inputLabel}>Private Business Notes</Text>
                <View style={[CommonStyles.inputContainer, { height: 100, alignItems: 'flex-start', paddingVertical: Spacing.xs }]}>
                  <TextInput 
                    style={[CommonStyles.inputText, { height: '100%', textAlignVertical: 'top' }]} 
                    placeholder="Personal notes related to this product or client..." 
                    multiline 
                    value={privateNotes} 
                    onChangeText={setPrivateNotes} 
                  />
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>Private Documents & Photos</Text>
              <View style={styles.modalGallery}>
                <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPrivatePhoto}>
                  <MaterialCommunityIcons name="camera-plus" size={30} color={Colors.primary} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {privatePhotos.map((uri, idx) => (
                    <View key={idx} style={styles.photoThumbContainer}>
                      <TouchableOpacity onPress={() => setViewingImage(uri)}>
                        <Image source={{ uri }} style={styles.galleryThumb} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removePhotoBadge} 
                        onPress={() => removePrivatePhoto(idx)}
                      >
                        <MaterialCommunityIcons name="close-circle" size={20} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity 
                style={[CommonStyles.buttonPrimary, { marginTop: Spacing.xl, height: 50 }]} 
                onPress={handleSaveOtherDetails}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                    <Text style={CommonStyles.buttonPrimaryText}>Save Private Details</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Password Authentication Modal */}
      <Modal
        visible={showPasswordAuth}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordAuth(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: Spacing.xl }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalContent, { borderRadius: Radius.xl, padding: Spacing.xl, maxHeight: undefined }]}
          >
            <View style={[CommonStyles.rowBetween, { marginBottom: Spacing.lg }]}>
              <Text style={{ fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.primary }}>Confirm Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordAuth(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm }}>
              Please enter your login password to access secure details.
            </Text>

            {authError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.danger + '10', padding: 10, borderRadius: Radius.sm, marginBottom: Spacing.sm }}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={{ color: Colors.danger, fontFamily: Fonts.medium, fontSize: 12, marginLeft: 8 }}>{authError}</Text>
              </View>
            ) : null}

            <View style={[CommonStyles.inputContainer, { backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center' }]}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
              <TextInput
                style={[CommonStyles.inputText, { flex: 1, backgroundColor: Colors.surface, color: Colors.textPrimary }]}
                placeholder="Password"
                secureTextEntry={!showSecurePassword}
                value={authPassword}
                onChangeText={setAuthPassword}
                autoFocus
                autoComplete="off"
                importantForAutofill="no"
                textContentType="none"
              />
              <TouchableOpacity onPress={() => setShowSecurePassword(!showSecurePassword)}>
                <MaterialCommunityIcons
                  name={showSecurePassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[CommonStyles.buttonPrimary, { marginTop: Spacing.md, height: 48 }]} 
              onPress={handlePasswordAuth}
            >
              <Text style={CommonStyles.buttonPrimaryText}>Authenticate</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// Helper component
const InfoRow = ({ label, value, noBorder = false }: { label: string, value: string, noBorder?: boolean }) => (
  <View style={[styles.infoRow, noBorder ? { borderBottomWidth: 0 } : null]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  productName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  clientName: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    marginBottom: Spacing.lg,
  },
  progressLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  progressValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  progressBg: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    ...Shadows.sm,
  },
  detailsButtonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    ...Shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  emptyContainer: {
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalSectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.accent,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 4,
  },
  modalDocRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  modalDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalDocBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.primary,
    marginLeft: 6,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullImage: {
    width: '95%',
    height: '80%',
  },
  modalGallery: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  galleryThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoThumbContainer: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -5,
    right: 5,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  addPhotoBtn: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  addPhotoText: {
    fontFamily: Fonts.medium,
    fontSize: 8,
    color: Colors.primary,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
});
