import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InstallmentStatus } from '../types';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '../theme';

interface StatusBadgeProps {
  status: InstallmentStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let bgColor = Colors.background;
  let textColor = Colors.textPrimary;
  let label = '';

  switch (status) {
    case InstallmentStatus.ACTIVE:
      bgColor = Colors.infoLight;
      textColor = Colors.info;
      label = 'Active';
      break;
    case InstallmentStatus.COMPLETED:
      bgColor = Colors.successLight;
      textColor = Colors.success;
      label = 'Completed';
      break;
    case InstallmentStatus.OVERDUE:
      bgColor = Colors.dangerLight;
      textColor = Colors.danger;
      label = 'Overdue';
      break;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    textTransform: 'uppercase',
  },
});
