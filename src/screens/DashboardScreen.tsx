import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Platform, StatusBar } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows, CommonStyles } from '../theme';
import KPICard from '../components/KPICard';
import PaymentItem from '../components/PaymentItem';
import { getClients, getInstallments, getPayments, getCurrencySetting, syncFromCloud } from '../services/storage';
import { DashboardStats, Payment, InstallmentStatus } from '../types';
import { formatCurrency } from '../theme';
import { getGreeting } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { scheduleOverdueCheckNotification } from '../services/notificationService';
import { initializeStorage } from '../services/mediaService';
import AdComponent from '../components/AdComponent';
import UpgradeModal from '../components/UpgradeModal';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { user } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeInstallments: 0,
    totalCollected: 0,
    totalPending: 0,
    overdueCount: 0,
    monthlyTarget: 0,
    monthlyCollected: 0,
    thisMonthTarget: 0,
    thisMonthCollected: 0,
    thisMonthOverdue: 0,
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [currency, setCurrency] = useState('PKR (₨)');
  const [subStatus, setSubStatus] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const loadData = async () => {
    try {
      const [allClients, allInstallments, allPayments, currentCurrency, subscriptionStatus] = await Promise.all([
        getClients(),
        getInstallments(),
        getPayments(),
        getCurrencySetting(),
        (require('../services/subscriptionService')).getSubscriptionStatus()
      ]);
      setCurrency(currentCurrency);
      setSubStatus(subscriptionStatus);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let activeCount = 0;
      let overdueCount = 0;
      let totalPending = 0;
      let totalCollected = 0;
      let thisMonthCollected = 0;
      let thisMonthTarget = 0;
      let thisMonthOverdueAmt = 0;

      allInstallments.forEach(inst => {
        if (inst.status === InstallmentStatus.ACTIVE) activeCount++;
        if (inst.status === InstallmentStatus.OVERDUE) {
          activeCount++;
          overdueCount++;
        }
        
        if (inst.status !== InstallmentStatus.COMPLETED) {
          totalPending += inst.remainingAmount;
          
          // Monthly calculation
          thisMonthTarget += inst.monthlyAmount;
          if (inst.status === InstallmentStatus.OVERDUE) {
            const dueDate = new Date(inst.nextDueDate);
            if (dueDate.getFullYear() < currentYear || (dueDate.getFullYear() === currentYear && dueDate.getMonth() <= currentMonth)) {
              thisMonthOverdueAmt += inst.monthlyAmount;
            }
          }
        }
      });

      allPayments.forEach(pay => {
        totalCollected += pay.amount;
        const payDate = new Date(pay.date);
        if (payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear) {
          thisMonthCollected += pay.amount;
        }
      });

      setStats({
        totalClients: allClients.length,
        activeInstallments: activeCount,
        totalCollected,
        totalPending,
        overdueCount,
        monthlyTarget: 500000, 
        monthlyCollected: totalCollected,
        thisMonthTarget: thisMonthTarget,
        thisMonthCollected: thisMonthCollected,
        thisMonthOverdue: thisMonthOverdueAmt,
      });

      if (overdueCount > 0) {
        scheduleOverdueCheckNotification(overdueCount);
      }

      const sortedPayments = [...allPayments].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 5);
      
      setRecentPayments(sortedPayments);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      initializeStorage();
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromCloud();
    await loadData();
    setRefreshing(false);
  };

  const QuickAction = ({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={styles.actionIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={CommonStyles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={() => navigation.openDrawer()}
        >
          <MaterialCommunityIcons name="menu" size={28} color={Colors.accent} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.greetingText}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>

        <TouchableOpacity 
          style={styles.avatarContainer} 
          onPress={() => navigation.navigate('SettingsTab', { screen: 'SettingsMain' })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase() || 'A'}</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Receivables Hero Card */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>Total Receivables</Text>
            <View style={styles.chip}>
              <Text style={styles.chipText}>LIFETIME</Text>
            </View>
          </View>
          <Text style={styles.heroValue}>{formatCurrency(stats.totalPending, currency)}</Text>
          <View style={styles.heroFooter}>
            <TouchableOpacity 
              style={styles.heroStat}
              onPress={() => navigation.navigate('ClientsTab', { screen: 'ClientsList' })}
            >
              <MaterialCommunityIcons name="account-group" size={14} color={Colors.accentLight} />
              <Text style={styles.heroStatText}>{stats.totalClients} Clients</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.heroStat}
              onPress={() => navigation.navigate('InstallmentsTab', { 
                screen: 'InstallmentsList',
                params: { initialFilter: InstallmentStatus.ACTIVE }
              })}
            >
              <MaterialCommunityIcons name="file-document" size={14} color={Colors.accentLight} />
              <Text style={styles.heroStatText}>{stats.activeInstallments} Active Plans</Text>
            </TouchableOpacity>
          </View>
          <MaterialCommunityIcons 
            name="piggy-bank-outline" 
            size={120} 
            color="rgba(255,255,255,0.05)" 
            style={styles.heroIconBg} 
          />
        </LinearGradient>

        {/* Monthly Performance Card - FULL WIDTH GOLEN ACCENT */}
        <View style={styles.monthlyContainer}>
          <View style={styles.monthlyHeader}>
            <View style={styles.monthlyTitleGroup}>
              <MaterialCommunityIcons name="calendar-month" size={18} color={Colors.accentDark} />
              <Text style={styles.monthlyTitle}>This Month Performance</Text>
            </View>
            <Text style={styles.monthlyDate}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
          </View>
          
          <View style={styles.monthlyGrid}>
            <View style={styles.monthlyStatItem}>
              <Text style={styles.monthlyStatLabel}>Target</Text>
              <Text style={styles.monthlyStatValue}>{formatCurrency(stats.thisMonthTarget, currency)}</Text>
            </View>
            <View style={[styles.monthlyStatItem, styles.statBorder]}>
              <Text style={[styles.monthlyStatLabel, { color: Colors.success }]}>Collected</Text>
              <Text style={[styles.monthlyStatValue, { color: Colors.success }]}>{formatCurrency(stats.thisMonthCollected, currency)}</Text>
            </View>
            <View style={styles.monthlyStatItem}>
              <Text style={[styles.monthlyStatLabel, { color: Colors.danger }]}>Overdue</Text>
              <Text style={[styles.monthlyStatValue, { color: Colors.danger }]}>{formatCurrency(stats.thisMonthOverdue, currency)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <KPICard
            title="Total Collected (Life)"
            value={formatCurrency(stats.totalCollected, currency)}
            icon="cash-multiple"
            color={Colors.success}
            width="100%"
            onPress={() => navigation.navigate('ReportsTab')}
          />
        </View>

        <View style={styles.kpiGrid}>
          <KPICard
            title="Overdue Plans"
            value={stats.overdueCount.toString()}
            icon="alert-decagram-outline"
            color={Colors.danger}
            onPress={() => navigation.navigate('InstallmentsTab', { 
              screen: 'InstallmentsList',
              params: { initialFilter: InstallmentStatus.OVERDUE }
            })}
          />
          <KPICard
            title="Active Plans"
            value={stats.activeInstallments.toString()}
            icon="check-decagram-outline"
            color={Colors.info}
            onPress={() => navigation.navigate('InstallmentsTab', { 
              screen: 'InstallmentsList',
              params: { initialFilter: InstallmentStatus.ACTIVE }
            })}
          />
        </View>

        {subStatus && !subStatus.isPro && (
          <TouchableOpacity 
            style={styles.upgradeHeaderCard} 
            onPress={() => setShowUpgradeModal(true)}
          >
            <View style={styles.upgradeHeaderInfo}>
              <MaterialCommunityIcons name="crown" size={24} color={Colors.accent} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.upgradeHeaderText}>Upgrade to Pro</Text>
                <Text style={styles.upgradeHeaderSub}>Unlock unlimited clients & plans</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.accent} />
          </TouchableOpacity>
        )}

        <AdComponent />

        <UpgradeModal 
          visible={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={loadData}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? 45 : 60,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
    ...Shadows.md,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  greetingText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.accentLight + 'CC',
  },
  userName: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.surface,
    marginTop: -2,
  },
  avatarContainer: {
    ...Shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  heroCard: {
    width: '100%',
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    marginTop: -Spacing.sm, 
    marginBottom: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.accentLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  chipText: {
    fontFamily: Fonts.bold,
    fontSize: 8,
    color: Colors.surface,
  },
  heroValue: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    color: Colors.surface,
    marginBottom: Spacing.md,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: Spacing.md,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  heroStatText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.accentLight,
    marginLeft: 6,
  },
  heroIconBg: {
    position: 'absolute',
    right: -20,
    bottom: -20,
  },
  monthlyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    paddingBottom: Spacing.xs,
  },
  monthlyTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthlyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primary,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  monthlyDate: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textMuted,
  },
  monthlyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.background,
  },
  monthlyStatLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 9,
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  monthlyStatValue: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  kpiRow: {
    marginBottom: Spacing.xs,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.primary,
    marginTop: Spacing.md,
  },
  viewAllText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.accentDark,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  actionItem: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 4,
    alignItems: 'center',
  },
  actionIcon: {
    width: 54, // Smaller as requested
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E0E0E0',
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  actionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  listContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  upgradeHeaderCard: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '60',
    ...Shadows.md,
  },
  upgradeHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeHeaderText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.accent,
  },
  upgradeHeaderSub: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.accentLight,
    opacity: 0.8,
  },
});
