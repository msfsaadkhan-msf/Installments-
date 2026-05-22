import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Installment } from '../types';
import { Colors, Fonts, FontSizes, Shadows, Radius, Spacing, formatCurrency } from '../theme';
import StatusBadge from './StatusBadge';
import { calcProgress, calcRemaining } from '../utils/currency';
import { formatDateSlash } from '../utils/date';

interface InstallmentCardProps {
  installment: Installment;
  onPress: (item: Installment) => void;
  onLongPress?: (item: Installment) => void;
  showClientName?: boolean;
  onCollectPayment?: (item: Installment) => void;
  onViewAgreement?: (item: Installment) => void;
  currency?: string;
}

export default function InstallmentCard({ 
  installment, 
  onPress, 
  onLongPress,
  showClientName = false, 
  onCollectPayment, 
  onViewAgreement, 
  currency = 'PKR (₨)' 
}: InstallmentCardProps) {
  const progress = calcProgress(installment.paidAmount + installment.downPayment, installment.totalAmount);
  const remaining = calcRemaining(installment.totalAmount, installment.downPayment, installment.paidAmount);

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.7} 
      onPress={() => onPress(installment)}
      onLongPress={() => onLongPress && onLongPress(installment)}
    >
      <View style={styles.headerRow}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{installment.productName}</Text>
          {showClientName && (
            <Text style={styles.clientName} numberOfLines={1}>Client: {installment.clientName}</Text>
          )}
        </View>
        <StatusBadge status={installment.status} />
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Total Due</Text>
          <Text style={styles.metricValue}>{formatCurrency(installment.totalAmount, currency)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Remaining</Text>
          <Text style={[styles.metricValue, { color: Colors.danger }]}>{formatCurrency(remaining, currency)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Progress</Text>
          <Text style={[styles.metricValue, { color: Colors.success }]}>{Math.round(progress)}%</Text>
        </View>
      </View>

      <View style={styles.progressWrapper}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.progressSubInfo}>
          <Text style={styles.progressDetail}>
            Paid {installment.paidInstallments + (installment.downPayment > 0 ? 0 : 0)} of {installment.tenure} months
          </Text>
          <Text style={styles.dueDate}>Next: {formatDateSlash(installment.nextDueDate)}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {onCollectPayment && (installment.status === 'active' || installment.status === 'overdue') && (
          <TouchableOpacity 
            style={styles.btnCollect} 
            onPress={() => onCollectPayment(installment)}
          >
            <MaterialCommunityIcons name="cash-multiple" size={16} color={Colors.surface} />
            <Text style={styles.btnCollectText}>Collect</Text>
          </TouchableOpacity>
        )}
        
        {onViewAgreement && (
          <TouchableOpacity 
            style={styles.btnSecondary} 
            onPress={() => onViewAgreement(installment)}
          >
            <MaterialCommunityIcons name="file-document-outline" size={16} color={Colors.primary} />
            <Text style={styles.btnSecondaryText}>Agreement</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  productInfo: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  productName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  clientName: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: Fonts.medium,
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  progressWrapper: {
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  progressSubInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDetail: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textMuted,
  },
  dueDate: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.warning,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  btnCollect: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
    ...Shadows.sm,
  },
  btnCollectText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.surface,
    marginLeft: 6,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSecondaryText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 6,
  },
});
