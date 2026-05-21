import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, Modal, Image } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Shadows, Radius } from '../theme';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import PaymentItem from '../components/PaymentItem';
import { getPayments } from '../services/storage';
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
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const loadPayments = async () => {
    if (!installment) return;
    try {
      const all = await getPayments();
      // Filter payments for this specific installment, newest first
      const filtered = all
        .filter(p => p.installmentId === installment.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(filtered);
    } catch (e) {
      console.error('Failed to load installment payments', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [installment])
  );

  if (!installment) {
    return (
      <View style={CommonStyles.screen}>
        <Header title="Error" showBack />
        <View style={CommonStyles.center}>
          <Text>Installment data missing.</Text>
        </View>
      </View>
    );
  }

  const progress = calcProgress(installment.paidAmount + installment.downPayment, installment.totalAmount);

  return (
    <View style={CommonStyles.screen}>
      <Header title="Plan Details" showBack />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Main Status Card */}
        <View style={styles.statusCard}>
          <View style={[CommonStyles.rowBetween, { marginBottom: Spacing.sm }]}>
            <Text style={styles.productName}>{installment.productName}</Text>
            <StatusBadge status={installment.status} />
          </View>
          
          <Text style={styles.clientName}>Client: {installment.clientName}</Text>

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
              <Text style={styles.statLabel}>Total Value</Text>
              <Text style={styles.statValue}>{formatPKR(installment.totalAmount)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Paid</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>{formatPKR(installment.paidAmount)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={[styles.statValue, { color: Colors.danger }]}>{formatPKR(installment.remainingAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionRow}>
          {installment.status !== InstallmentStatus.COMPLETED && (
            <TouchableOpacity 
              style={[CommonStyles.buttonPrimary, { flex: 1.5, marginRight: Spacing.sm, height: 48 }]} 
              onPress={() => navigation.navigate('RecordPaymentScreen', { installment })}
            >
              <MaterialCommunityIcons name="cash-register" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={CommonStyles.buttonPrimaryText}>Record Payment</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.detailsButton, { flex: installment.status !== InstallmentStatus.COMPLETED ? 1 : 1, marginRight: Spacing.sm }]} 
            onPress={() => setDetailsModalVisible(true)}
          >
            <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.detailsButton, { flex: 1, backgroundColor: Colors.primaryLight }]} 
            onPress={() => generateAgreementPDF(installment)}
          >
            <MaterialCommunityIcons name="file-pdf-box" size={20} color={Colors.surface} />
            <Text style={[styles.detailsButtonText, { color: Colors.surface, marginLeft: 4 }]}>Agreement</Text>
          </TouchableOpacity>
        </View>

        {/* Detailed Info */}
        <Text style={CommonStyles.sectionTitle}>Plan Information</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Down Payment" value={formatPKR(installment.downPayment)} />
          <InfoRow label="Monthly Installment" value={formatPKR(installment.monthlyAmount)} />
          <InfoRow label="Tenure" value={`${installment.tenure} Months`} />
          <InfoRow label="Start Date" value={formatDateSlash(installment.startDate)} />
          <InfoRow label="Next Due Date" value={formatDateSlash(installment.nextDueDate)} noBorder />
        </View>

        {/* Payment History */}
        <Text style={[CommonStyles.sectionTitle, { marginTop: Spacing.lg }]}>Payment History</Text>
        {payments.length > 0 ? (
          payments.map(payment => (
            <PaymentItem key={payment.id} payment={payment} />
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
              <InfoRow label="Name" value={installment.guarantor1Name || 'N/A'} />
              <InfoRow label="CNIC" value={installment.guarantor1Cnic || 'N/A'} />
              <InfoRow label="Phone" value={installment.guarantor1Phone || 'N/A'} />
              <InfoRow label="Address" value={installment.guarantor1Address || 'N/A'} />
              
              <View style={styles.modalDocRow}>
                {installment.guarantor1CnicFront && (
                  <TouchableOpacity style={styles.modalDocBtn} onPress={() => setViewingImage(installment.guarantor1CnicFront!)}>
                    <MaterialCommunityIcons name="file-image-outline" size={14} color={Colors.accent} />
                    <Text style={styles.modalDocBtnText}>CNIC Front</Text>
                  </TouchableOpacity>
                )}
                {installment.guarantor1CnicBack && (
                  <TouchableOpacity style={styles.modalDocBtn} onPress={() => setViewingImage(installment.guarantor1CnicBack!)}>
                    <MaterialCommunityIcons name="file-image-outline" size={14} color={Colors.accent} />
                    <Text style={styles.modalDocBtnText}>CNIC Back</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.modalSectionTitle, { marginTop: Spacing.md }]}>Guarantor 2</Text>
              <InfoRow label="Name" value={installment.guarantor2Name || 'N/A'} />
              <InfoRow label="CNIC" value={installment.guarantor2Cnic || 'N/A'} />
              <InfoRow label="Phone" value={installment.guarantor2Phone || 'N/A'} />
              <InfoRow label="Address" value={installment.guarantor2Address || 'N/A'} />

              <View style={styles.modalDocRow}>
                {installment.guarantor2CnicFront && (
                  <TouchableOpacity style={styles.modalDocBtn} onPress={() => setViewingImage(installment.guarantor2CnicFront!)}>
                    <MaterialCommunityIcons name="file-image-outline" size={14} color={Colors.accent} />
                    <Text style={styles.modalDocBtnText}>CNIC Front</Text>
                  </TouchableOpacity>
                )}
                {installment.guarantor2CnicBack && (
                  <TouchableOpacity style={styles.modalDocBtn} onPress={() => setViewingImage(installment.guarantor2CnicBack!)}>
                    <MaterialCommunityIcons name="file-image-outline" size={14} color={Colors.accent} />
                    <Text style={styles.modalDocBtnText}>CNIC Back</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.modalSectionTitle, { marginTop: Spacing.md }]}>Product Details</Text>
              <InfoRow label="Name" value={installment.productName || 'N/A'} />
              <InfoRow label="Model" value={installment.productModel || 'N/A'} />
              <InfoRow label="Serial" value={installment.productSerial || 'N/A'} />
              
              {installment.variants?.map((v, idx) => (
                <InfoRow key={idx} label={v.label} value={v.value} />
              ))}

              <Text style={[styles.modalSectionTitle, { marginTop: Spacing.md }]}>Documents & Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalGallery}>
                {installment.productPhotos?.map((uri, idx) => (
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
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
