import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Radius, Shadows, formatCurrency } from '../theme';
import CustomCamera from '../components/CustomCamera';
import ContactPicker from '../components/ContactPicker';
import Header from '../components/Header';
import { addInstallment, addPayment, getCurrencySetting } from '../services/storage';
import { Client, Installment, Payment, InstallmentStatus } from '../types';
import { generateId, todayISO, addMonths } from '../utils/date';
import { calcMonthlyInstallment } from '../utils/currency';
import { pickOrCaptureImage, saveOrganizedImage } from '../services/mediaService';

export default function NewInstallmentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preSelectedClient: Client | undefined = route.params?.client;

  const [productName, setProductName] = useState('');
  const [productModel, setProductModel] = useState('');
  const [productSerial, setProductSerial] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [tenure, setTenure] = useState('');
  const [guarantor1Name, setGuarantor1Name] = useState('');
  const [guarantor1Cnic, setGuarantor1Cnic] = useState('');
  const [guarantor1Phone, setGuarantor1Phone] = useState('');
  const [guarantor2Name, setGuarantor2Name] = useState('');
  const [guarantor2Cnic, setGuarantor2Cnic] = useState('');
  const [guarantor2Phone, setGuarantor2Phone] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [nextDueDate, setNextDueDate] = useState(addMonths(todayISO(), 1));
  const [guarantor1Address, setGuarantor1Address] = useState('');
  const [guarantor2Address, setGuarantor2Address] = useState('');
  const [endDate, setEndDate] = useState('');
  const [variants, setVariants] = useState<{ label: string, value: string }[]>([
    { label: '', value: '' }
  ]);
  const [productPhotos, setProductPhotos] = useState<string[]>([]);
  const [monthlyAmountState, setMonthlyAmountState] = useState('');
  const [placeOfAgreement, setPlaceOfAgreement] = useState('');
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('PKR (₨)');

  useEffect(() => {
    (async () => {
      const c = await getCurrencySetting();
      setCurrency(c);
    })();
  }, []);

  useEffect(() => {
    if (startDate && tenure) {
      const calculatedEndDate = addMonths(startDate, parseInt(tenure, 10) || 0);
      setEndDate(calculatedEndDate);
    }
  }, [startDate, tenure]);

  const [isManualMonthly, setIsManualMonthly] = useState(false);

  useEffect(() => {
    if (!isManualMonthly) {
      const f = (parseFloat(totalAmount) || 0) - (parseFloat(downPayment) || 0);
      const t = parseInt(tenure, 10) || 1;
      const calculated = Math.round(f / t);
      setMonthlyAmountState(calculated.toString());
    }
  }, [totalAmount, downPayment, tenure]);

  const handleMonthlyAmountChange = (val: string) => {
    setIsManualMonthly(true);
    setMonthlyAmountState(val);
    const m = parseFloat(val) || 0;
    const f = (parseFloat(totalAmount) || 0) - (parseFloat(downPayment) || 0);
    if (m > 0 && f > 0) {
      const newTenure = Math.ceil(f / m);
      setTenure(newTenure.toString());
    }
  };

  const handleTenureChange = (val: string) => {
    setIsManualMonthly(false);
    setTenure(val);
  };

  const [productImage, setProductImage] = useState<string | null>(null);
  const [g1CnicFront, setG1CnicFront] = useState<string | null>(null);
  const [g1CnicBack, setG1CnicBack] = useState<string | null>(null);
  const [g2CnicFront, setG2CnicFront] = useState<string | null>(null);
  const [g2CnicBack, setG2CnicBack] = useState<string | null>(null);

  const pickImage = async (field: string) => {
    const uri = await pickOrCaptureImage('document');
    if (uri) {
      if (field === 'product') setProductPhotos(prev => [...prev, uri]);
      else if (field === 'g1Front') setG1CnicFront(uri);
      else if (field === 'g1Back') setG1CnicBack(uri);
      else if (field === 'g2Front') setG2CnicFront(uri);
      else if (field === 'g2Back') setG2CnicBack(uri);
    }
  };

  const removeProductPhoto = (index: number) => {
    setProductPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { label: '', value: '' }]);
  };

  const updateVariant = (index: number, key: 'label' | 'value', value: string) => {
    const newVariants = [...variants];
    newVariants[index][key] = value;
    setVariants(newVariants);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const financedAmount = (parseFloat(totalAmount) || 0) - (parseFloat(downPayment) || 0);
  const monthlyAmount = parseFloat(monthlyAmountState) || 0;

  const handleSave = async () => {
    if (!preSelectedClient) {
      Alert.alert('Error', 'No client selected');
      return;
    }
    if (!productName || !totalAmount || !downPayment || !tenure) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      let finalProduct = productImage;
      let finalG1Front = g1CnicFront;
      let finalG1Back = g1CnicBack;
      let finalG2Front = g2CnicFront;
      let finalG2Back = g2CnicBack;

      const clientName = preSelectedClient.name;

      // Save images to organized folders
      if (productImage && !productImage.includes('IMS by MSF')) {
        finalProduct = await saveOrganizedImage(productImage, clientName, 'Client', 'product');
      }
      if (g1CnicFront && !g1CnicFront.includes('IMS by MSF')) {
        finalG1Front = await saveOrganizedImage(g1CnicFront, clientName, 'Guarantors', 'g1_front');
      }
      if (g1CnicBack && !g1CnicBack.includes('IMS by MSF')) {
        finalG1Back = await saveOrganizedImage(g1CnicBack, clientName, 'Guarantors', 'g1_back');
      }
      if (g2CnicFront && !g2CnicFront.includes('IMS by MSF')) {
        finalG2Front = await saveOrganizedImage(g2CnicFront, clientName, 'Guarantors', 'g2_front');
      }
      if (g2CnicBack && !g2CnicBack.includes('IMS by MSF')) {
        finalG2Back = await saveOrganizedImage(g2CnicBack, clientName, 'Guarantors', 'g2_back');
      }

      const newPlan: Installment = {
        id: generateId(),
        clientId: preSelectedClient.id,
        clientName: preSelectedClient.name,
        productName,
        productModel,
        productSerial,
        guarantor1Name,
        guarantor1Cnic,
        guarantor1Phone,
        guarantor2Name,
        guarantor2Cnic,
        guarantor2Phone,
        totalAmount: parseFloat(totalAmount),
        downPayment: parseFloat(downPayment),
        financedAmount,
        monthlyAmount,
        tenure: parseInt(tenure, 10),
        startDate,
        nextDueDate,
        installmentEndDate: endDate,
        guarantor1Address,
        guarantor2Address,
        variants: variants.filter(v => v.label.trim() !== ''),
        productPhotos: [], // Will populate after saving
        placeOfAgreement,
        productImage: '', // Deprecated but keeping for compatibility if needed
        guarantor1CnicFront: finalG1Front || undefined,
        guarantor1CnicBack: finalG1Back || undefined,
        guarantor2CnicFront: finalG2Front || undefined,
        guarantor2CnicBack: finalG2Back || undefined,
        status: nextDueDate < todayISO() ? InstallmentStatus.OVERDUE : InstallmentStatus.ACTIVE,
        paidAmount: 0,
        paidInstallments: 0,
        remainingAmount: financedAmount,
      };

      // Save multiple product photos
      const savedPhotos = [];
      for (const photo of productPhotos) {
        if (!photo.includes('IMS by MSF')) {
          const savedPath = await saveOrganizedImage(photo, clientName, 'Client', `product_${Date.now()}_${Math.random().toString(36).substring(7)}`);
          savedPhotos.push(savedPath);
        } else {
          savedPhotos.push(photo);
        }
      }
      newPlan.productPhotos = savedPhotos;
      if (savedPhotos.length > 0) newPlan.productImage = savedPhotos[0];

      await addInstallment(newPlan);

      // Record down payment in payment history if > 0
      if (newPlan.downPayment > 0) {
        const downPaymentRecord: Payment = {
          id: generateId(),
          installmentId: newPlan.id,
          clientName: newPlan.clientName,
          productName: newPlan.productName,
          amount: newPlan.downPayment,
          date: startDate, // Uses the user-selected Start Date as the collection date
          receiptNo: 'Down Payment',
          method: 'Cash' as any,
        };
        await addPayment(downPaymentRecord);
      }

      setLoading(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save installment plan.');
      setLoading(false);
    }
  };

  return (
    <View style={CommonStyles.screen}>
      <Header title="New Installment Plan" showBack={true} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {preSelectedClient && (
          <View style={styles.clientBanner}>
            <Text style={styles.clientBannerLabel}>Client:</Text>
            <Text style={styles.clientBannerName}>{preSelectedClient.name}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Product Name *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="e.g. Samsung Galaxy S24" value={productName} onChangeText={setProductName} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Model (Optional)</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="e.g. SM-S921B" value={productModel} onChangeText={setProductModel} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Serial Number (Optional)</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="e.g. IMEI or SN" value={productSerial} onChangeText={setProductSerial} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
              <Text style={CommonStyles.inputLabel}>Product Variants</Text>
              <TouchableOpacity onPress={addVariant} style={styles.addSmallBtn}>
                <MaterialCommunityIcons name="plus" size={14} color={Colors.surface} />
                <Text style={styles.addSmallBtnText}>Add New</Text>
              </TouchableOpacity>
            </View>
            {variants.map((v, index) => (
              <View key={index} style={[styles.row, { marginBottom: Spacing.sm, alignItems: 'center' }]}>
                <View style={[CommonStyles.inputContainer, { flex: 1.2, marginBottom: 0 }]}>
                  <TextInput 
                    style={CommonStyles.inputText} 
                    placeholder="e.g. Color" 
                    value={v.label} 
                    onChangeText={(val) => updateVariant(index, 'label', val)} 
                  />
                </View>
                <View style={[CommonStyles.inputContainer, { flex: 1.8, marginLeft: 8, marginBottom: 0 }]}>
                  <TextInput 
                    style={CommonStyles.inputText} 
                    placeholder="Value" 
                    value={v.value} 
                    onChangeText={(val) => updateVariant(index, 'value', val)} 
                  />
                </View>
                <TouchableOpacity onPress={() => removeVariant(index)} style={{ marginLeft: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={24} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <Text style={CommonStyles.inputLabel}>Product Photo / Documents</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {productPhotos.map((uri, index) => (
              <View key={index} style={styles.photoThumbContainer}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => removeProductPhoto(index)}>
                  <MaterialCommunityIcons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity 
              style={styles.addPhotoBtn} 
              onPress={() => pickImage('product')}
            >
              <MaterialCommunityIcons name="camera-plus" size={24} color={Colors.textMuted} />
              <Text style={styles.addPhotoBtnText}>Add</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Guarantor 1</Text>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Name</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="Full Name" value={guarantor1Name} onChangeText={setGuarantor1Name} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>CNIC</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="00000-0000000-0" value={guarantor1Cnic} onChangeText={setGuarantor1Cnic} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Phone</Text>
            <View style={[CommonStyles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
              <TextInput style={[CommonStyles.inputText, { flex: 1 }]} placeholder="03xx-xxxxxxx" value={guarantor1Phone} onChangeText={setGuarantor1Phone} keyboardType="phone-pad" />
              <ContactPicker 
                onSelect={(contactName, contactPhone) => {
                  setGuarantor1Phone(contactPhone);
                  if (!guarantor1Name) setGuarantor1Name(contactName);
                }} 
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Current Address</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="H #, Street, City" value={guarantor1Address} onChangeText={setGuarantor1Address} />
            </View>
          </View>

          <Text style={CommonStyles.inputLabel}>CNIC Documents</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('g1Front')}>
              {g1CnicFront ? (
                <Image source={{ uri: g1CnicFront }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={24} color={Colors.textMuted} />
                  <Text style={styles.imagePlaceholderText}>Front Side</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.docPicker, { marginLeft: Spacing.md }]} onPress={() => pickImage('g1Back')}>
              {g1CnicBack ? (
                <Image source={{ uri: g1CnicBack }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={24} color={Colors.textMuted} />
                  <Text style={styles.imagePlaceholderText}>Back Side</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Guarantor 2</Text>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Name</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="Full Name" value={guarantor2Name} onChangeText={setGuarantor2Name} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>CNIC</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="00000-0000000-0" value={guarantor2Cnic} onChangeText={setGuarantor2Cnic} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Phone</Text>
            <View style={[CommonStyles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
              <TextInput style={[CommonStyles.inputText, { flex: 1 }]} placeholder="03xx-xxxxxxx" value={guarantor2Phone} onChangeText={setGuarantor2Phone} keyboardType="phone-pad" />
              <ContactPicker 
                onSelect={(contactName, contactPhone) => {
                  setGuarantor2Phone(contactPhone);
                  if (!guarantor2Name) setGuarantor2Name(contactName);
                }} 
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Current Address</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="H #, Street, City" value={guarantor2Address} onChangeText={setGuarantor2Address} />
            </View>
          </View>

          <Text style={CommonStyles.inputLabel}>CNIC Documents</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('g2Front')}>
              {g2CnicFront ? (
                <Image source={{ uri: g2CnicFront }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={24} color={Colors.textMuted} />
                  <Text style={styles.imagePlaceholderText}>Front Side</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.docPicker, { marginLeft: Spacing.md }]} onPress={() => pickImage('g2Back')}>
              {g2CnicBack ? (
                <Image source={{ uri: g2CnicBack }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={24} color={Colors.textMuted} />
                  <Text style={styles.imagePlaceholderText}>Back Side</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Financial Details</Text>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Total Product Value ({formatCurrency(0, currency).split(' ')[0]}) *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="250000" keyboardType="numeric" value={totalAmount} onChangeText={setTotalAmount} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Down Payment ({formatCurrency(0, currency).split(' ')[0]}) *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="50000" keyboardType="numeric" value={downPayment} onChangeText={setDownPayment} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Plan Tenure (Months) *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="12" keyboardType="numeric" value={tenure} onChangeText={handleTenureChange} />
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Next Due Date (YYYY-MM-DD)</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} value={nextDueDate} onChangeText={setNextDueDate} placeholder="YYYY-MM-DD" />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>End Date (Automatic)</Text>
            <View style={[CommonStyles.inputContainer, { backgroundColor: Colors.borderLight }]}>
              <TextInput style={[CommonStyles.inputText, { color: Colors.textSecondary }]} value={endDate} editable={false} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Place of Agreement</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} value={placeOfAgreement} onChangeText={setPlaceOfAgreement} placeholder="e.g. Main Office / Showroom" />
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Plan Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Financed Amount:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(financedAmount > 0 ? financedAmount : 0, currency)}</Text>
          </View>
           <View style={[styles.summaryTotalRow, { marginTop: Spacing.md }]}>
            <Text style={styles.summaryLabelLarge}>Monthly Installment:</Text>
            <View style={styles.inlineInputContainer}>
              <Text style={styles.currencyPrefix}>{currency.split(' ')[0]} </Text>
              <TextInput 
                style={styles.summaryValueLargeInput}
                value={monthlyAmountState}
                onChangeText={handleMonthlyAmountChange}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={CommonStyles.buttonPrimary} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={CommonStyles.buttonPrimaryText}>Confirm & Create</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  clientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  clientBannerLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.surface,
    opacity: 0.8,
    marginRight: Spacing.xs,
  },
  clientBannerName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.surface,
  },
  formCard: {
    ...CommonStyles.card,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    ...CommonStyles.card,
    backgroundColor: Colors.accentLight + '30',
    borderColor: Colors.accent,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  inlineInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.accent,
    paddingBottom: 2,
  },
  currencyPrefix: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
  },
  summaryValueLargeInput: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    minWidth: 80,
    padding: 0,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  summaryValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  summaryLabelLarge: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.primary,
    flex: 1,
  },
  summaryValueLarge: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    textAlign: 'right',
    flex: 2,
  },
  imagePicker: {
    height: 150,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  docPicker: {
    flex: 1,
    height: 100,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  addSmallBtnText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    color: Colors.surface,
    marginLeft: 4,
  },
  photoThumbContainer: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
    position: 'relative',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
  },
  photoRemove: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.danger,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
