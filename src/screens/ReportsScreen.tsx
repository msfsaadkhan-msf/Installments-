import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Radius, Shadows } from '../theme';
import Header from '../components/Header';
import { getPayments, syncFromCloud, getCurrencySetting } from '../services/storage';
import { Payment } from '../types';
import { formatCurrency } from '../utils/currency';
import { getInstallments } from '../services/storage';
import { InstallmentStatus } from '../types';
import AdComponent from '../components/AdComponent';

export default function ReportsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState('PKR (₨)');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const loadData = async () => {
    try {
      const [allPayments, cur] = await Promise.all([
        getPayments(),
        getCurrencySetting()
      ]);
      setCurrency(cur);
      // Sort by date newest first
      const sorted = allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


      // Calculate total for selected month/year
      let total = 0;
      const filtered = sorted.filter(p => {
        const d = new Date(p.date);
        const matches = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        if (matches) total += p.amount;
        return matches;
      });
      setPayments(filtered);
      setMonthlyTotal(total);

      // Calculate Target: Sum of monthly amounts for all active plans
      const allInst = await getInstallments();
      const target = allInst
        .filter(inst => inst.status === InstallmentStatus.ACTIVE || inst.status === InstallmentStatus.OVERDUE)
        .reduce((sum, inst) => sum + inst.monthlyAmount, 0);
      
      setMonthlyTarget(target || 1); // Avoid division by zero

    } catch (error) {
      console.error('Failed to load payments for reports', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedMonth, selectedYear])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromCloud();
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={CommonStyles.screen}>
      <Header title="Reports" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.filterSection}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedMonth}
              onValueChange={(val) => setSelectedMonth(val)}
              style={styles.picker}
              dropdownIconColor={Colors.accent}
            >
              {months.map((m, i) => (
                <Picker.Item key={m} label={m} value={i} />
              ))}
            </Picker>
          </View>
          <View style={[styles.pickerWrapper, { width: 100, marginLeft: Spacing.sm }]}>
            <Picker
              selectedValue={selectedYear}
              onValueChange={(val) => setSelectedYear(val)}
              style={styles.picker}
              dropdownIconColor={Colors.accent}
            >
              {years.map(y => (
                <Picker.Item key={y} label={y.toString()} value={y} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Collected in {months[selectedMonth]}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(monthlyTotal, currency)}</Text>
          <Text style={styles.summarySub}>Expected this month: {formatCurrency(monthlyTarget, currency)}</Text>
          
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min((monthlyTotal / monthlyTarget) * 100, 100)}%` }]} />
          </View>
        </View>

        <Text style={CommonStyles.sectionTitle}>Full Payment History</Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { flex: 2 }]}>Date</Text>
            <Text style={[styles.th, { flex: 3 }]}>Client</Text>
            <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Amount</Text>
          </View>

          {payments.map((p, index) => {
            const d = new Date(p.date);
            const formattedDate = `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()].substring(0,3)} ${d.getFullYear()}`;
            return (
              <View key={p.id} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowAlt : null]}>
                <Text style={[styles.td, { flex: 3 }]} numberOfLines={1}>{formattedDate}</Text>
                <Text style={[styles.td, { flex: 3 }]} numberOfLines={1}>{p.clientName}</Text>
                <Text style={[styles.tdAmount, { flex: 3 }]} numberOfLines={1}>{formatCurrency(p.amount, currency)}</Text>
              </View>
            );
          })}
          {payments.length === 0 && (
            <Text style={styles.emptyText}>No payments recorded yet.</Text>
          )}
        </View>

        <AdComponent />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  filterSection: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 45,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    color: Colors.textPrimary,
    fontFamily: Fonts.medium,
  },
  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  summaryLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.accentLight,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xxxl,
    color: Colors.surface,
  },
  summarySub: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.surface,
    opacity: 0.8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressBg: {
    height: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  table: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  th: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableRowAlt: {
    backgroundColor: Colors.surfaceAlt + '40',
  },
  td: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  tdAmount: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  emptyText: {
    padding: Spacing.xl,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
});
