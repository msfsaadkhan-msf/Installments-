import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { DrawerContentScrollView, DrawerItem, DrawerContentComponentProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../theme';
import { useTranslation } from 'react-i18next';

export default function DrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const navigateTo = (screen: string, params?: any) => {
    props.navigation.navigate('MainTabs', { screen, params });
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.profileContainer}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editBadge} 
              onPress={() => props.navigation.navigate('MainTabs', { screen: 'SettingsTab', params: { screen: 'SettingsMain' } })}
            >
              <MaterialCommunityIcons name="pencil" size={12} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name="shield-check" size={10} color={Colors.accent} />
              <Text style={styles.roleText}>ADMIN ACCESS</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {/* Operations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('navigation.operations')}</Text>
          <DrawerItem
            label={t('navigation.dashboard')}
            icon={({ focused, color, size }) => (
              <MaterialCommunityIcons 
                name={focused ? "view-dashboard" : "view-dashboard-outline"} 
                size={size} 
                color={focused ? Colors.accent : color} 
              />
            )}
            onPress={() => navigateTo('Dashboard')}
            labelStyle={styles.drawerLabel}
            activeTintColor={Colors.accent}
            inactiveTintColor={Colors.surface + 'CC'}
            activeBackgroundColor={Colors.accent + '15'}
          />
          <DrawerItem
            label={t('navigation.collect_payment')}
            icon={({ focused, color, size }) => (
              <MaterialCommunityIcons 
                name={focused ? "cash-register" : "cash-register"} 
                size={size} 
                color={focused ? Colors.accent : color} 
              />
            )}
            onPress={() => navigateTo('ClientsTab', { screen: 'CollectPaymentSelection' })}
            labelStyle={styles.drawerLabel}
            activeTintColor={Colors.accent}
            inactiveTintColor={Colors.surface + 'CC'}
            activeBackgroundColor={Colors.accent + '15'}
          />
          <DrawerItem
            label={t('navigation.add_new_client')}
            icon={({ focused, color, size }) => (
              <MaterialCommunityIcons 
                name={focused ? "account-plus" : "account-plus-outline"} 
                size={size} 
                color={focused ? Colors.accent : color} 
              />
            )}
            onPress={() => navigateTo('ClientsTab', { screen: 'AddClientScreen' })}
            labelStyle={styles.drawerLabel}
            activeTintColor={Colors.accent}
            inactiveTintColor={Colors.surface + 'CC'}
            activeBackgroundColor={Colors.accent + '15'}
          />
          <DrawerItem
            label={t('navigation.new_agreement')}
            icon={({ focused, color, size }) => (
              <MaterialCommunityIcons 
                name={focused ? "file-document-edit" : "file-document-edit-outline"} 
                size={size} 
                color={focused ? Colors.accent : color} 
              />
            )}
            onPress={() => navigateTo('InstallmentsTab', { screen: 'NewAgreement' })}
            labelStyle={styles.drawerLabel}
            activeTintColor={Colors.accent}
            inactiveTintColor={Colors.surface + 'CC'}
            activeBackgroundColor={Colors.accent + '15'}
          />
          <DrawerItem
            label={t('navigation.calculator')}
            icon={({ focused, color, size }) => (
              <MaterialCommunityIcons 
                name={focused ? "calculator" : "calculator-variant-outline"} 
                size={size} 
                color={focused ? Colors.accent : color} 
              />
            )}
            onPress={() => props.navigation.navigate('Calculator')}
            labelStyle={styles.drawerLabel}
            activeTintColor={Colors.accent}
            inactiveTintColor={Colors.surface + 'CC'}
            activeBackgroundColor={Colors.accent + '15'}
          />
        </View>

        <View style={styles.divider} />

        {/* Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('navigation.management')}</Text>
          <DrawerItem
            label={t('navigation.reports')}
            icon={({ focused, color, size }) => (
              <MaterialCommunityIcons 
                name={focused ? "chart-areaspline" : "chart-line"} 
                size={size} 
                color={focused ? Colors.accent : color} 
              />
            )}
            onPress={() => navigateTo('ReportsTab')}
            labelStyle={styles.drawerLabel}
            activeTintColor={Colors.accent}
            inactiveTintColor={Colors.surface + 'CC'}
            activeBackgroundColor={Colors.accent + '15'}
          />
          <DrawerItem
            label={t('navigation.business_profile')}
            icon={({ focused, color, size }) => (
              <MaterialCommunityIcons 
                name={focused ? "store" : "store-outline"} 
                size={size} 
                color={focused ? Colors.accent : color} 
              />
            )}
            onPress={() => navigateTo('SettingsTab', { screen: 'BusinessProfile' })}
            labelStyle={styles.drawerLabel}
            activeTintColor={Colors.accent}
            inactiveTintColor={Colors.surface + 'CC'}
            activeBackgroundColor={Colors.accent + '15'}
          />
          <DrawerItem
            label={t('navigation.app_settings')}
            icon={({ focused, color, size }) => (
              <MaterialCommunityIcons 
                name={focused ? "cog" : "cog-outline"} 
                size={size} 
                color={focused ? Colors.accent : color} 
              />
            )}
            onPress={() => navigateTo('SettingsTab', { screen: 'SettingsMain' })}
            labelStyle={styles.drawerLabel}
            activeTintColor={Colors.accent}
            inactiveTintColor={Colors.surface + 'CC'}
            activeBackgroundColor={Colors.accent + '15'}
          />
        </View>
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={() => logout()}
        >
          <MaterialCommunityIcons name="logout-variant" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Logout Session</Text>
        </TouchableOpacity>
        
        <View style={styles.brandingBox}>
          <Text style={styles.brandingMain}>IMS BY MSF</Text>
          <Text style={styles.brandingSub}>DIGITAL SOLUTIONS (SMC-PVT) LTD</Text>
          <View style={styles.versionLine}>
            <View style={styles.versionDot} />
            <Text style={styles.versionText}>v1.2.0 Stable</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    ...Shadows.md,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md + 2,
    color: Colors.surface,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.accentLight + '99',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)', // Accent with low opacity
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: Colors.accent,
  },
  roleText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.accent,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
  },
  section: {
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.accentLight + '66',
    marginLeft: 18,
    marginBottom: Spacing.xs,
    letterSpacing: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.md,
  },
  drawerLabel: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    marginLeft: -12,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.danger + '10',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.danger + '20',
    marginBottom: Spacing.xl,
  },
  logoutText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.danger,
    marginLeft: Spacing.sm,
  },
  brandingBox: {
    alignItems: 'center',
  },
  brandingMain: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 2,
    marginBottom: 2,
  },
  brandingSub: {
    fontFamily: Fonts.semiBold,
    fontSize: 8,
    color: Colors.surface + '66',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  versionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  versionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 6,
    opacity: 0.8,
  },
  versionText: {
    fontFamily: Fonts.medium,
    fontSize: 9,
    color: Colors.surface + '44',
  },
});
