import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Radius, Shadows } from '../theme';
import { formatCurrency } from '../utils/currency';
import CustomCamera from '../components/CustomCamera';
import ContactPicker from '../components/ContactPicker';
import Header from '../components/Header';
import { addInstallment, addPayment, getCurrencySetting, updateInstallment, syncInstallmentWithPayments, getPreviewNextInvoiceNumber, incrementInvoiceConfig } from '../services/storage';
import { Client, Installment, Payment, InstallmentStatus } from '../types';
import { generateId, todayISO, addMonths, diffMonths } from '../utils/date';
import { calcMonthlyInstallment } from '../utils/currency';
import { pickOrCaptureImage, saveOrganizedImage } from '../services/mediaService';

export default function NewInstallmentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preSelectedClient: Client | undefined = route.params?.client;
  const planToEdit: Installment | undefined = route.params?.planToEdit;

  const [productName, setProductName] = useState(planToEdit?.productName || '');
  const [productPrice, setProductPrice] = useState(planToEdit?.productPrice?.toString() || '');
  const [productPercentage, setProductPercentage] = useState(planToEdit?.productPercentage?.toString() || '');
  const [productModel, setProductModel] = useState(planToEdit?.productModel || '');
  const [productSerial, setProductSerial] = useState(planToEdit?.productSerial || '');
  const [totalAmount, setTotalAmount] = useState(planToEdit?.totalAmount.toString() || '');
  const [downPayment, setDownPayment] = useState(planToEdit?.downPayment.toString() || '');
  const [tenure, setTenure] = useState(planToEdit?.tenure.toString() || '');
  const [guarantor1Name, setGuarantor1Name] = useState(planToEdit?.guarantor1Name || '');
  const [guarantor1FatherName, setGuarantor1FatherName] = useState(planToEdit?.guarantor1FatherName || '');
  const [guarantor1Cnic, setGuarantor1Cnic] = useState(planToEdit?.guarantor1Cnic || '');
  const [guarantor1Phone, setGuarantor1Phone] = useState(planToEdit?.guarantor1Phone || '');
  const [guarantor2Name, setGuarantor2Name] = useState(planToEdit?.guarantor2Name || '');
  const [guarantor2FatherName, setGuarantor2FatherName] = useState(planToEdit?.guarantor2FatherName || '');
  const [guarantor2Cnic, setGuarantor2Cnic] = useState(planToEdit?.guarantor2Cnic || '');
  const [guarantor2Phone, setGuarantor2Phone] = useState(planToEdit?.guarantor2Phone || '');
  const [startDate, setStartDate] = useState(planToEdit?.startDate || todayISO());
  const [nextDueDate, setNextDueDate] = useState(planToEdit?.nextDueDate || addMonths(todayISO(), 1));
  const [guarantor1Address, setGuarantor1Address] = useState(planToEdit?.guarantor1Address || '');
  const [guarantor2Address, setGuarantor2Address] = useState(planToEdit?.guarantor2Address || '');
  const [endDate, setEndDate] = useState(planToEdit?.installmentEndDate || '');
  const [variants, setVariants] = useState<{ label: string, value: string }[]>(
    planToEdit?.variants || [{ label: '', value: '' }]
  );
  const [productPhotos, setProductPhotos] = useState<string[]>(planToEdit?.productPhotos || []);
  const [monthlyAmountState, setMonthlyAmountState] = useState(planToEdit?.monthlyAmount.toString() || '');
  const [placeOfAgreement, setPlaceOfAgreement] = useState(planToEdit?.placeOfAgreement || '');
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('PKR (₨)');
  const [invoiceNo, setInvoiceNo] = useState(planToEdit?.invoiceNo || '');
  const [isManualInvoice, setIsManualInvoice] = useState(false);

  const [g1CnicFront, setG1CnicFront] = useState<string | null>(planToEdit?.guarantor1CnicFront || null);
  const [g1CnicBack, setG1CnicBack] = useState<string | null>(planToEdit?.guarantor1CnicBack || null);
  const [g2CnicFront, setG2CnicFront] = useState<string | null>(planToEdit?.guarantor2CnicFront || null);
  const [g2CnicBack, setG2CnicBack] = useState<string | null>(planToEdit?.guarantor2CnicBack || null);

  useEffect(() => {
    (async () => {
      const c = await getCurrencySetting();
      setCurrency(c);
      
      if (!planToEdit) {
        const nextInvoice = await getPreviewNextInvoiceNumber();
        setInvoiceNo(nextInvoice);
      }
    })();
  }, [planToEdit]);

  const [isManualMonthly, setIsManualMonthly] = useState(false);
  const [isManualTotal, setIsManualTotal] = useState(false);
  const [isManualNextDue, setIsManualNextDue] = useState(false);
  const [isManualEndDate, setIsManualEndDate] = useState(false);

  useEffect(() => {
    if (!isManualEndDate && startDate && tenure) {
      const calculatedEndDate = addMonths(startDate, parseInt(tenure, 10) || 0);
      setEndDate(calculatedEndDate);
    }
  }, [startDate, tenure, isManualEndDate]);

  useEffect(() => {
    if (!isManualTotal) {
      const price = parseFloat(productPrice) || 0;
      const percentage = parseFloat(productPercentage) || 0;
      if (price > 0) {
        const total = Math.round(price + (price * percentage / 100));
        setTotalAmount(total.toString());
      }
    }
  }, [productPrice, productPercentage]);

  useEffect(() => {
    if (!isManualNextDue && startDate) {
      const next = addMonths(startDate, 1);
      if (next) setNextDueDate(next);
    }
  }, [startDate]);

  useEffect(() => {
    if (!isManualMonthly) {
      const f = (parseFloat(totalAmount) || 0) - (parseFloat(downPayment) || 0);
      const t = parseInt(tenure, 10) || 1;
      const calculated = Math.round(f / t);
      setMonthlyAmountState(calculated.toString());
    }
  }, [totalAmount, downPayment, tenure]);

  const handleTotalAmountChange = (val: string) => {
    setIsManualTotal(true);
    setTotalAmount(val);
    const total = parseFloat(val) || 0;
    const price = parseFloat(productPrice) || 0;
    if (price > 0) {
      const percentage = ((total - price) / price) * 100;
      // Use toFixed(1) for cleaner percentage values, or round
      setProductPercentage(parseFloat(percentage.toFixed(2)).toString());
    }
  };

  const handleNextDueDateChange = (val: string) => {
    setIsManualNextDue(true);
    setNextDueDate(val);
  };

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

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (val.length >= 10) {
      const months = diffMonths(startDate, val);
      if (months > 0) {
        setIsManualEndDate(true);
        setTenure(months.toString());
      }
    }
  };

  const handleTenureChange = (val: string) => {
    setIsManualMonthly(false);
    setIsManualEndDate(false);
    setTenure(val);
  };

  const handlePriceChange = (val: string) => {
    setIsManualTotal(false);
    setProductPrice(val);
  };

  const handlePercentageChange = (val: string) => {
    setIsManualTotal(false);
    setProductPercentage(val);
  };

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

  const financedAmount = Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(downPayment) || 0));
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
      // Feature Gate: Plan Limit per Client
      const { getSubscriptionStatus } = require('../services/subscriptionService');
      const { getInstallments } = require('../services/storage');
      const status = await getSubscriptionStatus();
      const installments = await getInstallments();
      const currentPlans = installments.filter((i: any) => i.clientId === preSelectedClient.id).length;

      if (!status.isPro && currentPlans >= status.maxPlansPerClient && !planToEdit) {
        setLoading(false);
        Alert.alert(
          'Plan Limit Reached',
          `Standard accounts are limited to ${status.maxPlansPerClient} installment plans per client. Upgrade to Pro for unlimited plans and premium features.`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Upgrade Now', onPress: () => Alert.alert('Upgrade', 'Payment integration coming soon.') }
          ]
        );
        return;
      }

      const clientName = preSelectedClient.name;

      let finalG1Front = g1CnicFront;
      let finalG1Back = g1CnicBack;
      let finalG2Front = g2CnicFront;
      let finalG2Back = g2CnicBack;

      // Save multiple product photos
      const savedPhotos: string[] = [];
      for (const photo of productPhotos) {
        if (!photo.includes('IMS by MSF')) {
          const savedPath = await saveOrganizedImage(photo, clientName, 'Client', `product_${Date.now()}_${Math.random().toString(36).substring(7)}`);
          savedPhotos.push(savedPath);
        } else {
          savedPhotos.push(photo);
        }
      }

      // Save images to organized folders
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

      if (planToEdit) {
        const updatedPlan: Installment = {
          ...planToEdit,
          invoiceNo: invoiceNo || planToEdit.invoiceNo,
          productName,
          productModel,
          productSerial,
          guarantor1Name,
          guarantor1FatherName,
          guarantor1Cnic,
          guarantor1Phone,
          guarantor2Name,
          guarantor2FatherName,
          guarantor2Cnic,
          guarantor2Phone,
          productPrice: parseFloat(productPrice) || 0,
          productPercentage: parseFloat(productPercentage) || 0,
          totalAmount: parseFloat(totalAmount) || 0,
          downPayment: parseFloat(downPayment) || 0,
          financedAmount: financedAmount || 0,
          monthlyAmount: monthlyAmount || 0,
          tenure: parseInt(tenure, 10) || 0,
          startDate,
          nextDueDate,
          installmentEndDate: endDate,
          guarantor1Address,
          guarantor2Address,
          variants: variants.filter(v => v.label.trim() !== ''),
          productPhotos: savedPhotos,
          placeOfAgreement,
          guarantor1CnicFront: finalG1Front || undefined,
          guarantor1CnicBack: finalG1Back || undefined,
          guarantor2CnicFront: finalG2Front || undefined,
          guarantor2CnicBack: finalG2Back || undefined,
        };
        if (savedPhotos.length > 0) updatedPlan.productImage = savedPhotos[0];
        
        await updateInstallment(updatedPlan);
        await syncInstallmentWithPayments(updatedPlan.id);
      } else {
        const finalInvoiceNo = invoiceNo || await getPreviewNextInvoiceNumber();
        const newPlan: Installment = {
          id: generateId(),
          clientId: preSelectedClient.id,
          clientName: preSelectedClient.name,
          productName,
          invoiceNo: finalInvoiceNo,
          productModel,
          productSerial,
          guarantor1Name,
          guarantor1FatherName,
          guarantor1Cnic,
          guarantor1Phone,
          guarantor2Name,
          guarantor2FatherName,
          guarantor2Cnic,
          guarantor2Phone,
          productPrice: parseFloat(productPrice) || 0,
          productPercentage: parseFloat(productPercentage) || 0,
          totalAmount: parseFloat(totalAmount) || 0,
          downPayment: parseFloat(downPayment) || 0,
          financedAmount: financedAmount || 0,
          monthlyAmount: monthlyAmount || 0,
          tenure: parseInt(tenure, 10) || 0,
          startDate,
          nextDueDate,
          installmentEndDate: endDate,
          guarantor1Address,
          guarantor2Address,
          variants: variants.filter(v => v.label.trim() !== ''),
          productPhotos: savedPhotos,
          placeOfAgreement,
          productImage: savedPhotos.length > 0 ? savedPhotos[0] : '',
          guarantor1CnicFront: finalG1Front || undefined,
          guarantor1CnicBack: finalG1Back || undefined,
          guarantor2CnicFront: finalG2Front || undefined,
          guarantor2CnicBack: finalG2Back || undefined,
          status: nextDueDate < todayISO() ? InstallmentStatus.OVERDUE : InstallmentStatus.ACTIVE,
          paidAmount: 0,
          paidInstallments: 0,
          remainingAmount: financedAmount,
        };
        await addInstallment(newPlan);
        await incrementInvoiceConfig();

        // Record down payment in payment history if > 0
        if (newPlan.downPayment > 0) {
          const downPaymentRecord: Payment = {
            id: generateId(),
            installmentId: newPlan.id,
            clientName: newPlan.clientName,
            productName: newPlan.productName,
            amount: newPlan.downPayment,
            date: startDate,
            receiptNo: 'Down Payment',
            method: 'Cash' as any,
          };
          await addPayment(downPaymentRecord);
        }
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
      <Header title={planToEdit ? "Edit Plan" : "New Installment Plan"} showBack={true} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {preSelectedClient && (
          <View style={styles.clientBanner}>
            <Text style={styles.clientBannerLabel}>Client:</Text>
            <Text style={styles.clientBannerName}>{preSelectedClient.name}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Invoice Number *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput 
                style={CommonStyles.inputText} 
                placeholder="INV-XXXX" 
                value={invoiceNo} 
                onChangeText={(val) => {
                  setInvoiceNo(val);
                  setIsManualInvoice(true);
                }} 
              />
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Product Name *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="e.g. Samsung Galaxy S24" value={productName} onChangeText={setProductName} />
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
            <Text style={CommonStyles.inputLabel}>Father Name</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="Father Name" value={guarantor1FatherName} onChangeText={setGuarantor1FatherName} />
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
            <Text style={CommonStyles.inputLabel}>Father Name</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="Father Name" value={guarantor2FatherName} onChangeText={setGuarantor2FatherName} />
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
            <Text style={CommonStyles.inputLabel}>Product Price ({currency.split(' ')[0]}) *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="e.g. 100000" keyboardType="numeric" value={productPrice} onChangeText={handlePriceChange} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Markup Percentage (%) *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="e.g. 35" keyboardType="numeric" value={productPercentage} onChangeText={handlePercentageChange} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>Total Product Value ({currency.split(' ')[0]}) *</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput style={CommonStyles.inputText} placeholder="e.g. 135000" keyboardType="numeric" value={totalAmount} onChangeText={handleTotalAmountChange} />
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
              <TextInput style={CommonStyles.inputText} value={nextDueDate} onChangeText={handleNextDueDateChange} placeholder="YYYY-MM-DD" />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={CommonStyles.inputLabel}>End Date (YYYY-MM-DD)</Text>
            <View style={CommonStyles.inputContainer}>
              <TextInput 
                style={CommonStyles.inputText} 
                value={endDate} 
                onChangeText={handleEndDateChange} 
                placeholder="YYYY-MM-DD"
              />
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
