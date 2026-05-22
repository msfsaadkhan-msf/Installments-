import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Payment } from '../types';
import { Colors, Fonts, FontSizes, Shadows, Radius, Spacing, formatCurrency } from '../theme';
import { formatDateSlash } from '../utils/date';

interface PaymentItemProps {
  payment: Payment;
  showDetails?: boolean;
  currency?: string;
  isLast?: boolean;
  onLongPress?: (payment: Payment) => void;
}

export default function PaymentItem({ 
  payment, 
  showDetails = false, 
  currency = 'PKR (₨)', 
  isLast = false,
  onLongPress
}: PaymentItemProps) {
  return (
    <TouchableOpacity 
      style={[styles.container, isLast && { borderBottomWidth: 0 }]}
      onLongPress={() => onLongPress && onLongPress(payment)}
      activeOpacity={0.7}
    >
      <View style={styles.leftRow}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="arrow-bottom-left" size={20} color={Colors.success} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.amount} numberOfLines={1}>{formatCurrency(payment.amount, currency)}</Text>
          <Text style={styles.date} numberOfLines={1}>{formatDateSlash(payment.date)} • {payment.method}</Text>
          {payment.notes && (
            <Text style={styles.notes} numberOfLines={2}>{payment.notes}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.rightContent}>
        {showDetails ? (
           <View style={styles.detailsBox}>
             <Text style={styles.clientName} numberOfLines={1}>{payment.clientName}</Text>
             <Text style={styles.productName} numberOfLines={1}>{payment.productName}</Text>
           </View>
        ) : (
          <View style={{ alignItems: 'flex-end' }}>
            {payment.remainingBalance !== undefined && (
              <Text style={styles.remainingText}>Rem: {formatCurrency(payment.remainingBalance, currency)}</Text>
            )}
            {payment.receiptNo && (
              <View style={styles.receiptContainer}>
                <Text style={styles.receiptText}>#{payment.receiptNo}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.success + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  amount: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  date: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rightContent: {
    alignItems: 'flex-end',
    marginLeft: Spacing.md,
  },
  detailsBox: {
    alignItems: 'flex-end',
  },
  clientName: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.primary,
  },
  productName: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  notes: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    backgroundColor: Colors.background,
    paddingHorizontal: 4,
    borderRadius: Radius.sm,
  },
  remainingText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.accent,
    marginBottom: 2,
  },
  receiptContainer: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  receiptText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
