import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Shadows, Radius, Spacing } from '../theme';

interface KPICardProps {
  title: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  subtitle?: string;
  width?: number | string;
  onPress?: () => void;
}

export default function KPICard({ title, value, icon, color, subtitle, width = '48%', onPress }: KPICardProps) {
  const CardContent = (
    <>
      <View style={styles.topRow}>
        <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <View style={[styles.indicator, { backgroundColor: color }]} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        style={[styles.container, { width: width as any }]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { width: width as any }]}>
      {CardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 4,
    height: 12,
    borderRadius: Radius.full,
  },
  content: {
    marginTop: Spacing.xs,
  },
  value: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.primary,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
