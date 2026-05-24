import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addPayment, updatePayment, updateInstallment, getPayments, getClients, getCurrencySetting, getInstallments } from '../services/storage';
import { generateWhatsAppReceipt } from '../utils/whatsappGenerator';
import { generateAndPrintReceipt } from '../utils/receiptGenerator';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Radius, formatCurrency } from '../theme';
import Header from '../components/Header';
import { Installment, Payment, PaymentMethod, InstallmentStatus } from '../types';
import { generateId, todayISO } from '../utils/date';
import { Picker } from '@react-native-picker/picker';
import { sendImmediatePaymentNotification } from '../services/notificationService';

export default function RecordPaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const installment: Installment | undefined = route.params?.installment;
  const paymentToEdit: Payment | undefined = route.params?.payment;

  const [amount, setAmount] = useState(paymentToEdit?.amount.toString() || installment?.monthlyAmount.toString() || '');
  const [method, setMethod] = useState<PaymentMethod>(paymentToEdit?.method || PaymentMethod.CASH);
  const [receiptNo, setReceiptNo] = useState(paymentToEdit?.receiptNo || '');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [currency, setCurrency] = useState('PKR (₨)');
  const [paymentDate, setPaymentDate] = useState(paymentToEdit?.date || todayISO());
  const [notes, setNotes] = useState(paymentToEdit?.notes || '');

  const [subStatus, setSubStatus] = useState<any>(null);

  React.useEffect(() => {
    (async () => {
      const { getSubscriptionStatus } = require('../services/subscriptionService');
      const [c, s] = await Promise.all([
        getCurrencySetting(),
        getSubscriptionStatus()
      ]);
      setCurrency(c);
      setSubStatus(s);
    })();
  }, []);

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

  const handleSave = async () => {
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (payAmount > installment.remainingAmount) {
      Alert.alert('Warning', 'Payment amount is greater than remaining balance.');
      return;
    }

    setLoading(true);

    try {
      if (paymentToEdit) {
        const updatedPayment: Payment = {
          ...paymentToEdit,
          amount: payAmount,
          date: paymentDate,
          receiptNo,
          method,
          notes,
        };
        await updatePayment(updatedPayment);
      } else {
        const newPayment: Payment = {
          id: generateId(),
          installmentId: installment.id,
          clientName: installment.clientName,
          productName: installment.productName,
          amount: payAmount,
          date: paymentDate,
          receiptNo: receiptNo,
          method,
          notes,
        };
        await addPayment(newPayment);
      }

      // Re-fetch installment to get synced values
      const installments = await getInstallments();
      const refreshedInstallment = installments.find((i: any) => i.id === installment.id);

      setSuccessData({
        paidAmount: payAmount,
        remainingAmount: refreshedInstallment?.remainingAmount || 0,
        nextDueDate: refreshedInstallment?.nextDueDate || installment.nextDueDate,
        monthlyAmount: refreshedInstallment?.monthlyAmount || installment.monthlyAmount,
        updatedInstallment: refreshedInstallment || installment
      });
      setLoading(false);
      setShowSuccess(true);
      
      // Trigger Interstitial Ad for Free users
      const { showInterstitial } = require('../services/adService');
      showInterstitial();
    } catch (error) {
      Alert.alert('Error', 'Failed to save payment.');
      setLoading(false);
    }
  };

  const handleReceiptAction = async (action: 'whatsapp' | 'print') => {
    if (!subStatus?.canAccessReceipts) {
      Alert.alert(
        'Pro Feature',
        'Sharing and printing receipts is a Pro feature. Upgrade to enable professional receipt management.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => Alert.alert('Upgrade', 'Payment integration coming soon.') }
        ]
      );
      return;
    }

    if (action === 'whatsapp') {
      const allPayments = await getPayments();
      let clientPhone = '';
      const clients = await getClients();
      const c = clients.find(c => c.id === installment?.clientId);
      if (c) clientPhone = c.phone;
      await generateWhatsAppReceipt([successData.updatedInstallment], allPayments, clientPhone);
    } else {
      const currentPayment: Payment = {
        id: generateId(),
        installmentId: installment.id,
        clientName: installment.clientName,
        productName: installment.productName,
        amount: parseFloat(amount),
        date: paymentDate,
        receiptNo: receiptNo,
        method,
      };
      await generateAndPrintReceipt(installment.clientName, [currentPayment], [successData.updatedInstallment]);
    }
  };

  return (
    <View style={CommonStyles.screen}>
      <Header title={paymentToEdit ? "Edit Payment" : "Record Payment"} showBack />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerProduct}>{installment.productName}</Text>
          <Text style={styles.bannerClient}>To: {installment.clientName}</Text>
          <View style={[CommonStyles.rowBetween, { marginTop: Spacing.md }]}>
            <Text style={styles.bannerClient}>Remaining:</Text>
            <Text style={styles.bannerAmount}>{formatCurrency(installment.remainingAmount, currency)}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={CommonStyles.sectionTitle}>Payment Details</Text>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Amount ({formatCurrency(0, currency).split(' ')[0]}) *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={[CommonStyles.inputText, { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: Colors.primary }]}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Payment Method *</Text>
            <View style={[CommonStyles.inputContainer, { paddingVertical: 0 }]}>
              <Picker
                selectedValue={method}
                onValueChange={(itemValue) => setMethod(itemValue)}
                style={{ color: Colors.textPrimary }}
              >
                <Picker.Item label="Cash" value={PaymentMethod.CASH} />
                <Picker.Item label="Bank Transfer" value={PaymentMethod.BANK_TRANSFER} />
                <Picker.Item label="JazzCash" value={PaymentMethod.JAZZCASH} />
                <Picker.Item label="Easypaisa" value={PaymentMethod.EASYPAISA} />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Payment Date (YYYY-MM-DD)</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                value={paymentDate}
                onChangeText={setPaymentDate}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Receipt / Trx ID (Optional)</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput
                style={CommonStyles.inputText}
                placeholder="e.g. REC-1234 or TID..."
                placeholderTextColor={Colors.textMuted}
                value={receiptNo}
                onChangeText={setReceiptNo}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Payment Notes (Optional)</Text>
            <View style={[CommonStyles.inputContainer, { minHeight: 80 }]}>
              <TextInput
                style={[CommonStyles.inputText, { textAlignVertical: 'top' }]}
                placeholder="Add any extra details here..."
                placeholderTextColor={Colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
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
            <Text style={CommonStyles.buttonPrimaryText}>Confirm Payment</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={showSuccess} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="check-circle" size={60} color={Colors.success} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.modalTitle}>Payment Recorded!</Text>
            
            {successData && (
              <View style={styles.modalDataBox}>
                <Text style={styles.modalDataText}>Paid: <Text style={{ fontFamily: Fonts.bold }}>{formatCurrency(successData.paidAmount, currency)}</Text></Text>
                <Text style={styles.modalDataText}>Remaining: {formatCurrency(successData.remainingAmount, currency)}</Text>
                {successData.remainingAmount > 0 && (
                  <>
                    <Text style={[styles.modalDataText, { marginTop: Spacing.sm }]}>Next Due: {successData.nextDueDate}</Text>
                    <Text style={styles.modalDataText}>Next Inst: {formatCurrency(successData.monthlyAmount, currency)}</Text>
                  </>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={[CommonStyles.buttonPrimary, { backgroundColor: '#25D366', marginBottom: Spacing.sm, width: '100%', flexDirection: 'row', justifyContent: 'center' }]}
              onPress={() => handleReceiptAction('whatsapp')}
            >
              <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={CommonStyles.buttonPrimaryText}>Send WhatsApp Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[CommonStyles.buttonOutline, { marginBottom: Spacing.lg, width: '100%', flexDirection: 'row', justifyContent: 'center' }]}
              onPress={() => handleReceiptAction('print')}
            >
              <MaterialCommunityIcons name="printer" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={CommonStyles.buttonOutlineText}>Print Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ padding: Spacing.sm }}
              onPress={() => {
                setShowSuccess(false);
                navigation.goBack();
              }}
            >
              <Text style={{ fontFamily: Fonts.semiBold, color: Colors.textSecondary }}>Close & Return</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  bannerContainer: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  bannerProduct: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.surface,
  },
  bannerClient: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.accentLight,
  },
  bannerAmount: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.accent,
  },
  formCard: {
    ...CommonStyles.card,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalDataBox: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: Radius.md,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  modalDataText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
});
