import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, FlatList, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows, CommonStyles } from '../theme';
import { getClients, getCurrencySetting } from '../services/storage';
import { Client } from '../types';
import { shareCalculatorDetails } from '../utils/whatsappGenerator';
import { useTranslation } from 'react-i18next';

export default function CalculatorScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [price, setPrice] = useState('');
  const [markupPercent, setMarkupPercent] = useState('0');
  
  // Tenure & Installment bidirectional logic
  const [tenure, setTenure] = useState('12');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [lastEdited, setLastEdited] = useState<'tenure' | 'amount'>('tenure');
  
  // Down Payment modes
  const [dpMode, setDpMode] = useState<'amount' | 'percent'>('amount');
  const [downPayment, setDownPayment] = useState('');
  const [dpPercent, setDpPercent] = useState('0');
  
  const [markupAmount, setMarkupAmount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [currency, setCurrency] = useState('PKR (₨)');
  
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [allClients, currentCurrency] = await Promise.all([
        getClients(),
        getCurrencySetting()
      ]);
      setClients(allClients);
      setCurrency(currentCurrency);
    } catch (error) {
      console.error('Failed to load calculator data', error);
    }
  };

  // Intermediate values for calculations
  const p = parseFloat(price) || 0;
  const m = parseFloat(markupPercent) || 0;
  const calculatedMarkup = (p * m) / 100;
  const total = p + calculatedMarkup;

  useEffect(() => {
    setMarkupAmount(calculatedMarkup);
    setTotalValue(total);
    
    // Sync Down Payment
    if (dpMode === 'percent') {
      const per = parseFloat(dpPercent) || 0;
      const amt = (total * per) / 100;
      setDownPayment(amt > 0 ? amt.toFixed(0) : '');
    } else {
      const amt = parseFloat(downPayment) || 0;
      const per = total > 0 ? (amt / total) * 100 : 0;
      setDpPercent(per > 0 ? per.toFixed(1) : '0');
    }
  }, [price, markupPercent, dpPercent, downPayment, dpMode]);

  // Sync Installment/Tenure
  useEffect(() => {
    const d = parseFloat(downPayment) || 0;
    const remaining = total - d;

    if (lastEdited === 'tenure') {
      const ten = parseInt(tenure) || 1;
      const mon = remaining > 0 ? remaining / ten : 0;
      setMonthlyAmount(mon > 0 ? mon.toFixed(0) : '');
    } else {
      const mon = parseFloat(monthlyAmount) || 1;
      const ten = remaining > 0 ? Math.ceil(remaining / mon) : 1;
      if (ten > 0 && ten !== parseInt(tenure)) {
        setTenure(ten.toString());
      }
    }
  }, [total, downPayment, tenure, monthlyAmount, lastEdited]);

  const handleShare = async () => {
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid product price.');
      return;
    }

    const details = {
      price: parseFloat(price),
      markupPercent: parseFloat(markupPercent),
      markupAmount: markupAmount,
      totalValue: totalValue,
      tenure: parseInt(tenure),
      downPayment: parseFloat(downPayment) || 0,
      installment: parseFloat(monthlyAmount) || 0
    };

    if (selectedClient) {
      await shareCalculatorDetails(details, selectedClient.phone);
    } else {
      setShowClientPicker(true);
    }
  };

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setShowClientPicker(false);
    shareCalculatorDetails({
        price: parseFloat(price),
        markupPercent: parseFloat(markupPercent),
        markupAmount: markupAmount,
        totalValue: totalValue,
        tenure: parseInt(tenure),
        downPayment: parseFloat(downPayment) || 0,
        installment: parseFloat(monthlyAmount) || 0
      }, client.phone);
  };

  const renderClientItem = ({ item }: { item: Client }) => (
    <TouchableOpacity 
      style={styles.clientItem} 
      onPress={() => selectClient(item)}
    >
      <View style={styles.clientAvatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientPhone}>{item.phone}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={CommonStyles.screen}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={() => navigation.openDrawer()}
        >
          <MaterialCommunityIcons name="menu" size={28} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Installment Calculator</Text>
          <Text style={styles.headerSub}>Plan your installments instantly</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={CommonStyles.cardElevated}>
          <Text style={CommonStyles.sectionTitle}>Input Details</Text>
          
          <Text style={CommonStyles.inputLabel}>Product Price</Text>
          <View style={[CommonStyles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
            <TextInput
              style={CommonStyles.inputText}
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              keyboardType="numeric"
            />
            <Text style={styles.inputAdornment}>{currency.split(' ')[0]}</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={CommonStyles.inputLabel}>Markup %</Text>
              <View style={[CommonStyles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput
                  style={CommonStyles.inputText}
                  value={markupPercent}
                  onChangeText={setMarkupPercent}
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Text style={styles.inputAdornment}>%</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={CommonStyles.inputLabel}>Tenure</Text>
              <View style={[CommonStyles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput
                  style={CommonStyles.inputText}
                  value={tenure}
                  onChangeText={(val) => {
                    setTenure(val);
                    setLastEdited('tenure');
                  }}
                  onFocus={() => setLastEdited('tenure')}
                  placeholder="12"
                  keyboardType="numeric"
                />
                <Text style={styles.inputAdornment}>Mo</Text>
              </View>
            </View>
          </View>

          <View style={styles.subHeaderRow}>
            <Text style={CommonStyles.inputLabel}>Down Payment</Text>
            <View style={styles.modeToggle}>
              <TouchableOpacity 
                style={[styles.modeBtn, dpMode === 'amount' && styles.modeBtnActive]} 
                onPress={() => setDpMode('amount')}
              >
                <Text style={[styles.modeText, dpMode === 'amount' && styles.modeTextActive]}>Amount</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeBtn, dpMode === 'percent' && styles.modeBtnActive]} 
                onPress={() => setDpMode('percent')}
              >
                <Text style={[styles.modeText, dpMode === 'percent' && styles.modeTextActive]}>%</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[CommonStyles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
            <TextInput
              style={CommonStyles.inputText}
              value={dpMode === 'amount' ? downPayment : dpPercent}
              onChangeText={dpMode === 'amount' ? setDownPayment : setDpPercent}
              placeholder="0"
              keyboardType="numeric"
            />
            <Text style={styles.inputAdornment}>
              {dpMode === 'amount' ? currency.split(' ')[0] : '%'}
            </Text>
          </View>
        </View>

        <View style={[CommonStyles.cardElevated, { marginTop: Spacing.lg, backgroundColor: Colors.primary }]}>
          <Text style={[CommonStyles.sectionTitle, { color: Colors.surface }]}>Calculation Results</Text>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Markup Amount:</Text>
            <Text style={styles.resultValue}>{currency.split(' ')[0]} {markupAmount.toLocaleString()}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Total Product Value:</Text>
            <Text style={styles.resultValue}>{currency.split(' ')[0]} {totalValue.toLocaleString()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.subHeaderRow}>
            <Text style={[styles.resultLabel, { color: Colors.accent }]}>Installment / Month</Text>
            <View style={styles.activeIndicator}>
              <View style={[styles.dot, lastEdited === 'amount' && styles.dotActive]} />
              <Text style={styles.indicatorText}>{lastEdited === 'amount' ? 'Manual' : 'System'}</Text>
            </View>
          </View>

          <View style={[CommonStyles.inputContainer, { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}>
            <TextInput
              style={[CommonStyles.inputText, { color: Colors.accent, fontSize: FontSizes.xl, height: 45 }]}
              value={monthlyAmount}
              onChangeText={(val) => {
                setMonthlyAmount(val);
                setLastEdited('amount');
              }}
              onFocus={() => setLastEdited('amount')}
              placeholder="0"
              keyboardType="numeric"
            />
            <Text style={[styles.inputAdornment, { color: Colors.accent, fontSize: FontSizes.lg }]}>
              {currency.split(' ')[0]}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[CommonStyles.buttonPrimary, { marginTop: Spacing.xl, flexDirection: 'row' }]}
          onPress={handleShare}
        >
          <MaterialCommunityIcons name="whatsapp" size={24} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={CommonStyles.buttonPrimaryText}>Share Details on WhatsApp</Text>
        </TouchableOpacity>

        {selectedClient && (
            <TouchableOpacity 
                style={styles.clearClient}
                onPress={() => setSelectedClient(null)}
            >
                <Text style={styles.clearClientText}>Sharing with: {selectedClient.name} (Change)</Text>
            </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={showClientPicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setShowClientPicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
               style={styles.shareGeneric}
               onPress={() => {
                 setShowClientPicker(false);
                 shareCalculatorDetails({
                     price: parseFloat(price),
                     markupPercent: parseFloat(markupPercent),
                     markupAmount: markupAmount,
                     totalValue: totalValue,
                     tenure: parseInt(tenure),
                     downPayment: parseFloat(downPayment) || 0,
                     installment: parseFloat(monthlyAmount) || 0
                   });
               }}
            >
                <MaterialCommunityIcons name="share-variant" size={20} color={Colors.info} />
                <Text style={styles.shareGenericText}>Share without selecting client</Text>
            </TouchableOpacity>

            <FlatList
              data={clients}
              keyExtractor={(item) => item.id}
              renderItem={renderClientItem}
              ListEmptyComponent={<Text style={styles.emptyText}>No clients found</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? 45 : 60,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    ...Shadows.md,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.surface,
  },
  headerSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.accentLight,
    opacity: 0.8,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  row: {
    flexDirection: 'row',
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
    padding: 2,
  },
  modeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm - 2,
  },
  modeBtnActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  modeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  modeTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.bold,
  },
  inputAdornment: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 6,
  },
  dotActive: {
    backgroundColor: Colors.accent,
  },
  indicatorText: {
    fontFamily: Fonts.medium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  resultLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  resultValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.surface,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: '70%',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontFamily: Fonts.bold,
    color: Colors.surface,
  },
  clientName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  clientPhone: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: Colors.textMuted,
  },
  shareGeneric: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.info + '10',
      padding: Spacing.md,
      borderRadius: Radius.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: Colors.info + '20',
  },
  shareGenericText: {
      fontFamily: Fonts.semiBold,
      color: Colors.info,
      marginLeft: 8,
  },
  clearClient: {
      alignItems: 'center',
      marginTop: Spacing.md,
  },
  clearClientText: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: Colors.textMuted,
      textDecorationLine: 'underline',
  }
});
