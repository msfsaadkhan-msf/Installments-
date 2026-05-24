import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Radius } from '../theme';
import Header from '../components/Header';
import { getInstallments, addPayment, updateInstallment, getPayments, getCurrencySetting } from '../services/storage';
import { generateWhatsAppReceipt } from '../utils/whatsappGenerator';
import { generateAndPrintReceipt } from '../utils/receiptGenerator';
import { Client, Installment, Payment, PaymentMethod, InstallmentStatus } from '../types';
import { generateId, todayISO } from '../utils/date';
import { Picker } from '@react-native-picker/picker';
import { formatCurrency } from '../theme';

export default function ClientPaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const client: Client | undefined = route.params?.client;

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [totalMonthly, setTotalMonthly] = useState(0);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [receiptNo, setReceiptNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [currency, setCurrency] = useState('PKR (₨)');
  const [paymentDate, setPaymentDate] = useState(todayISO());

  const loadData = async () => {
    if (!client) return;
    try {
      const all = await getInstallments();
      const [curr] = await Promise.all([getCurrencySetting()]);
      setCurrency(curr);
      const active = all.filter(i => i.clientId === client.id && i.status !== InstallmentStatus.COMPLETED);
      setInstallments(active);
      setTotalPending(active.reduce((s, i) => s + i.remainingAmount, 0));
      setTotalMonthly(active.reduce((s, i) => s + i.monthlyAmount, 0));
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [client])
  );

  if (!client) {
    return (
      <View style={CommonStyles.screen}>
        <Header title="Error" showBack />
        <View style={CommonStyles.center}>
          <Text>Client data missing.</Text>
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

    if (payAmount > totalPending) {
      Alert.alert('Warning', 'Payment amount is greater than the total pending balance.');
      return;
    }

    setLoading(true);

    try {
      // Sort installments by nearest due date ascending
      const sortedPlans = [...installments].sort((a,b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
      
      let remainingPayment = payAmount;

      // Pass 1: Try to clear the monthly amount for each plan
      const createdPayments: Payment[] = [];
      for (const plan of sortedPlans) {
        if (remainingPayment <= 0) break;
        
        const alloc = Math.min(plan.monthlyAmount, plan.remainingAmount, remainingPayment);
        if (alloc > 0) {
          remainingPayment -= alloc;
          
          const newPayment: Payment = {
            id: generateId(),
            installmentId: plan.id,
            clientName: plan.clientName,
            productName: plan.productName,
            amount: alloc,
            date: paymentDate,
            receiptNo: receiptNo,
            method,
          };
          await addPayment(newPayment);
          createdPayments.push(newPayment);
          
          plan.paidAmount += alloc;
          plan.remainingAmount -= alloc;
          plan.paidInstallments += 1;
          if (plan.remainingAmount <= 0) plan.status = InstallmentStatus.COMPLETED;
          
          await updateInstallment(plan);
        }
      }

      // Pass 2: If there's still money left over, distribute it greedily starting from the nearest plan
      if (remainingPayment > 0) {
        for (const plan of sortedPlans) {
          if (remainingPayment <= 0) break;
          // Refresh plan object since it was modified in memory
          if (plan.remainingAmount > 0) {
            const alloc = Math.min(plan.remainingAmount, remainingPayment);
            remainingPayment -= alloc;

            const newPayment: Payment = {
              id: generateId(),
              installmentId: plan.id,
              clientName: plan.clientName,
              productName: plan.productName,
              amount: alloc,
              date: paymentDate,
              receiptNo: receiptNo,
              method,
            };
            await addPayment(newPayment);
            createdPayments.push(newPayment);

            plan.paidAmount += alloc;
            plan.remainingAmount -= alloc;
            if (plan.remainingAmount <= 0) plan.status = InstallmentStatus.COMPLETED;
            
            await updateInstallment(plan);
          }
        }
      }

      setSuccessData({
        paidAmount: payAmount,
        installmentsAffected: sortedPlans,
        createdPayments
      });
      setLoading(false);
      setShowSuccess(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to process bulk payment.');
      setLoading(false);
    }
  };

  const handleReceiptAction = async (type: 'whatsapp' | 'print') => {
    const { getSubscriptionStatus } = require('../services/subscriptionService');
    const status = await getSubscriptionStatus();

    if (!status.isPro && !status.canAccessReceipts) {
      Alert.alert(
        'Pro Feature',
        'WhatsApp and Print receipts are exclusive to Pro members. Upgrade to unlock premium receipt features.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => Alert.alert('Upgrade', 'Payment integration coming soon.') }
        ]
      );
      return;
    }

    if (type === 'whatsapp') {
      const allPayments = await getPayments();
      await generateWhatsAppReceipt(successData.installmentsAffected, allPayments, client.phone);
    } else {
      await generateAndPrintReceipt(
        client.name, 
        successData.createdPayments, 
        successData.installmentsAffected
      );
    }
  };

  return (
    <View style={CommonStyles.screen}>
      <Header title="Collect Payment (All)" showBack />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerClient}>{client.name}</Text>
          <View style={[CommonStyles.rowBetween, { marginTop: Spacing.sm }]}>
            <Text style={styles.bannerLabel}>Total Pending Debt:</Text>
            <Text style={styles.bannerAmount}>{formatCurrency(totalPending, currency)}</Text>
          </View>
          <View style={[CommonStyles.rowBetween, { marginTop: 4 }]}>
            <Text style={styles.bannerLabel}>Combined Monthly:</Text>
            <Text style={[styles.bannerAmount, { fontSize: FontSizes.base, color: Colors.surface }]}>{formatCurrency(totalMonthly, currency)}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={CommonStyles.sectionTitle}>Payment Details</Text>
          
          <Text style={{ fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: Spacing.md }}>
            This amount will be automatically distributed across {installments.length} active plans, prioritizing plans that are due soonest.
          </Text>

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
                onValueChange={(itemValue: PaymentMethod) => setMethod(itemValue)}
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
        </View>

        <TouchableOpacity 
          style={CommonStyles.buttonPrimary} 
          onPress={handleSave}
          disabled={loading || installments.length === 0}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={CommonStyles.buttonPrimaryText}>Confirm Distribution</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={showSuccess} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="check-all" size={60} color={Colors.success} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.modalTitle}>Multi-Payment Recorded!</Text>
            
            {successData && (
              <View style={styles.modalDataBox}>
                <Text style={styles.modalDataText}>Total Distributed: <Text style={{ fontFamily: Fonts.bold }}>{formatCurrency(successData.paidAmount, currency)}</Text></Text>
                <Text style={styles.modalDataText}>Plans Affected: {successData.installmentsAffected.length}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[CommonStyles.buttonPrimary, { backgroundColor: '#25D366', marginBottom: Spacing.sm, width: '100%', flexDirection: 'row', justifyContent: 'center' }]}
              onPress={() => handleReceiptAction('whatsapp')}
            >
              <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={CommonStyles.buttonPrimaryText}>Send WhatsApp Details</Text>
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
  bannerClient: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.surface,
  },
  bannerLabel: {
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
    textAlign: 'center',
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
