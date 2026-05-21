import { StyleSheet } from 'react-native';

// ─── Color Palette ────────────────────────────────────
export const Colors = {
  primary: '#1B2A4A',
  primaryLight: '#2C3E6B',
  primaryDark: '#111D35',
  accent: '#D4A340',
  accentLight: '#F5E6B8',
  accentDark: '#B8892E',
  background: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#1A1A2E',
  success: '#22C55E',
  successLight: '#DCFCE7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
};

// ─── Typography ───────────────────────────────────────
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 36,
};

// ─── Spacing ──────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

// ─── Border Radius ────────────────────────────────────
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
};

// ─── Shadows ──────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const formatCurrency = (amount: number, currency: string) => {
  const symbol = currency.match(/\((.*)\)/)?.[1] || 'Rs';
  return `${symbol} ${amount.toLocaleString()}`;
};

// ─── Common Styles ────────────────────────────────────
export const CommonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  cardElevated: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
  },
  inputLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  inputText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPrimaryText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonSecondaryText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonOutlineText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.base,
  },
});
