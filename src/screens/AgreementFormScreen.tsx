import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Colors, Fonts, Radius, Spacing, Shadows } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { generateAndShareAgreementPDF, AgreementData } from '../utils/pdfGenerator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addClient, addInstallment } from '../services/storage';
import { generateId, todayISO } from '../utils/date';
import { Client, InstallmentStatus } from '../types';
import ContactPicker from '../components/ContactPicker';
import { getInstallments, getCurrencySetting } from '../services/storage';

export default function AgreementFormScreen({ navigation }: any) {
  const [formData, setFormData] = useState<AgreementData>({
    clientName: '',
    clientCnic: '',
    clientPhone: '',
    clientAddress: '',
    guarantor1Name: '',
    guarantor1Cnic: '',
    guarantor1Phone: '',
    guarantor1Address: '',
    guarantor2Name: '',
    guarantor2Cnic: '',
    guarantor2Phone: '',
    guarantor2Address: '',
    productName: '',
    productModel: '',
    productSerial: '',
    totalPrice: '',
    advancePayment: '',
    remainingBalance: '',
    monthlyInstallment: '',
    installmentDuration: '',
    fatherName: '',
    invoiceNo: '',
    place: '',
  });

  const [clientPhoto, setClientPhoto] = useState<string | null>(null);
  const [clientCnicFront, setClientCnicFront] = useState<string | null>(null);
  const [clientCnicBack, setClientCnicBack] = useState<string | null>(null);
  const [g1CnicFront, setG1CnicFront] = useState<string | null>(null);
  const [g1CnicBack, setG1CnicBack] = useState<string | null>(null);
  const [g2CnicFront, setG2CnicFront] = useState<string | null>(null);
  const [g2CnicBack, setG2CnicBack] = useState<string | null>(null);
  const [productPhoto, setProductPhoto] = useState<string | null>(null);

  const [currency, setCurrency] = useState('PKR (₨)');
  const [currencySymbol, setCurrencySymbol] = useState('₨');

  React.useEffect(() => {
    getCurrencySetting().then(cur => {
      setCurrency(cur);
      const symbol = cur.match(/\((.*)\)/)?.[1] || '₨';
      setCurrencySymbol(symbol);
    });
  }, []);

  const pickImage = async (field: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll access is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: field === 'clientPhoto',
      aspect: field === 'clientPhoto' ? [1, 1] : undefined,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (field === 'clientPhoto') setClientPhoto(uri);
      else if (field === 'clientCnicFront') setClientCnicFront(uri);
      else if (field === 'clientCnicBack') setClientCnicBack(uri);
      else if (field === 'g1CnicFront') setG1CnicFront(uri);
      else if (field === 'g1CnicBack') setG1CnicBack(uri);
      else if (field === 'g2CnicFront') setG2CnicFront(uri);
      else if (field === 'g2CnicBack') setG2CnicBack(uri);
      else if (field === 'productPhoto') setProductPhoto(uri);
    }
  };

  const handleChange = (field: keyof AgreementData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    const total = parseFloat(formData.totalPrice) || 0;
    const advance = parseFloat(formData.advancePayment) || 0;
    const months = parseInt(formData.installmentDuration) || 1;
    
    const remaining = Math.max(0, total - advance);
    const monthly = (remaining / months).toFixed(0);

    setFormData(prev => ({
      ...prev,
      remainingBalance: remaining.toString(),
      monthlyInstallment: monthly.toString(),
    }));
  };

  const handleSubmit = async () => {
    // Removed subscription and plan limit checks

    const clientId = generateId();
    if (formData.clientName && formData.clientPhone) {
      try {
        const newClient: Client = {
          id: clientId,
          name: formData.clientName,
          phone: formData.clientPhone,
          cnic: formData.clientCnic || '',
          address: formData.clientAddress || '',
          city: 'Unknown',
          fatherName: formData.fatherName,
          createdAt: todayISO(),
          profileImage: clientPhoto || undefined,
          cnicFront: clientCnicFront || undefined,
          cnicBack: clientCnicBack || undefined,
        };
        await addClient(newClient);
      } catch (error) {
        console.error('Failed to save client automatically:', error);
      }
    }

    // Also save the installment plan for tracking
    if (formData.productName && formData.totalPrice && formData.installmentDuration) {
      try {
        const total = parseFloat(formData.totalPrice) || 0;
        const advance = parseFloat(formData.advancePayment) || 0;
        const months = parseInt(formData.installmentDuration) || 0;
        const remaining = total - advance;
        const monthly = parseFloat(formData.monthlyInstallment) || (months > 0 ? remaining / months : 0);

        await addInstallment({
          id: generateId(),
          clientId: clientId, 
          clientName: formData.clientName,
          productName: formData.productName,
          productModel: formData.productModel,
          productSerial: formData.productSerial,
          totalAmount: total,
          downPayment: advance,
          financedAmount: remaining,
          monthlyAmount: Math.round(monthly),
          tenure: months,
          startDate: todayISO(),
          nextDueDate: todayISO(), // Default to today, user can adjust in separate screens if needed
          status: InstallmentStatus.ACTIVE,
          paidAmount: 0,
          paidInstallments: 0,
          remainingAmount: remaining,
          productImage: productPhoto || undefined,
          guarantor1Name: formData.guarantor1Name,
          guarantor1Cnic: formData.guarantor1Cnic,
          guarantor1Phone: formData.guarantor1Phone,
          guarantor1Address: formData.guarantor1Address,
          guarantor1CnicFront: g1CnicFront || undefined,
          guarantor1CnicBack: g1CnicBack || undefined,
          guarantor2Name: formData.guarantor2Name,
          guarantor2Cnic: formData.guarantor2Cnic,
          guarantor2Phone: formData.guarantor2Phone,
          guarantor2Address: formData.guarantor2Address,
          guarantor2CnicFront: g2CnicFront || undefined,
          guarantor2CnicBack: g2CnicBack || undefined,
          placeOfAgreement: formData.place,
        });
      } catch (error) {
        console.error('Failed to save installment automatically:', error);
      }
    }

    await generateAndShareAgreementPDF({
      ...formData,
      clientPhoto: clientPhoto || undefined,
      clientCnicFront: clientCnicFront || undefined,
      clientCnicBack: clientCnicBack || undefined,
      guarantor1CnicFront: g1CnicFront || undefined,
      guarantor1CnicBack: g1CnicBack || undefined,
      guarantor2CnicFront: g2CnicFront || undefined,
      guarantor2CnicBack: g2CnicBack || undefined,
      productPhoto: productPhoto || undefined,
    });
  };

  const renderInput = (label: string, field: keyof AgreementData, placeholder: string, keyboardType: any = 'default', onBlur?: () => void, isPhone?: boolean, relatedNameField?: keyof AgreementData) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
        <TextInput
          style={{ flex: 1, height: 45, fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary }}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={formData[field] as string}
          onChangeText={(text) => handleChange(field, text)}
          keyboardType={keyboardType}
          onBlur={onBlur}
        />
        {isPhone && (
          <ContactPicker 
            onSelect={(contactName, contactPhone) => {
              setFormData(prev => {
                const newData = { ...prev, [field]: contactPhone };
                if (relatedNameField && !prev[relatedNameField]) {
                  (newData as any)[relatedNameField] = contactName;
                }
                return newData;
              });
            }} 
          />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Agreement</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Client Details</Text>
            
            <View style={styles.profilePickerRow}>
              <TouchableOpacity style={styles.profilePicker} onPress={() => pickImage('clientPhoto')}>
                {clientPhoto ? (
                  <Image source={{ uri: clientPhoto }} style={styles.pickerImage} />
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <MaterialCommunityIcons name="camera-plus" size={30} color={Colors.textMuted} />
                    <Text style={styles.pickerText}>Client Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                {renderInput('Full Name', 'clientName', 'e.g. Asad Khan')}
                {renderInput("Father's Name", 'fatherName', "e.g. Muhammad Khan")}
              </View>
            </View>

            {renderInput('CNIC (without dashes)', 'clientCnic', 'e.g. 4210112345671', 'numeric')}
            {renderInput('Phone Number', 'clientPhone', '03XXXXXXXXX', 'phone-pad', undefined, true, 'clientName')}
            {renderInput('Current Address', 'clientAddress', 'House #, Street, City')}

            <Text style={styles.subLabel}>Client CNIC Documents</Text>
            <View style={styles.docRow}>
              <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('clientCnicFront')}>
                {clientCnicFront ? (
                  <Image source={{ uri: clientCnicFront }} style={styles.pickerImage} />
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={20} color={Colors.textMuted} />
                    <Text style={styles.pickerText}>Front</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('clientCnicBack')}>
                {clientCnicBack ? (
                  <Image source={{ uri: clientCnicBack }} style={styles.pickerImage} />
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={20} color={Colors.textMuted} />
                    <Text style={styles.pickerText}>Back</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Guarantor 1 Details</Text>
            {renderInput('Guarantor Name', 'guarantor1Name', '')}
            {renderInput('CNIC', 'guarantor1Cnic', '', 'numeric')}
            {renderInput('Phone Number', 'guarantor1Phone', '', 'phone-pad', undefined, true, 'guarantor1Name')}
            {renderInput('Guarantor 1 Address', 'guarantor1Address', '')}

            <Text style={styles.subLabel}>Guarantor 1 CNIC Documents</Text>
            <View style={styles.docRow}>
              <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('g1CnicFront')}>
                {g1CnicFront ? (
                  <Image source={{ uri: g1CnicFront }} style={styles.pickerImage} />
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={20} color={Colors.textMuted} />
                    <Text style={styles.pickerText}>Front</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('g1CnicBack')}>
                {g1CnicBack ? (
                  <Image source={{ uri: g1CnicBack }} style={styles.pickerImage} />
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={20} color={Colors.textMuted} />
                    <Text style={styles.pickerText}>Back</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Guarantor 2 Details</Text>
            {renderInput('Guarantor Name', 'guarantor2Name', '')}
            {renderInput('CNIC', 'guarantor2Cnic', '', 'numeric')}
            {renderInput('Phone Number', 'guarantor2Phone', '', 'phone-pad', undefined, true, 'guarantor2Name')}
            {renderInput('Guarantor 2 Address', 'guarantor2Address', '')}

            <Text style={styles.subLabel}>Guarantor 2 CNIC Documents</Text>
            <View style={styles.docRow}>
              <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('g2CnicFront')}>
                {g2CnicFront ? (
                  <Image source={{ uri: g2CnicFront }} style={styles.pickerImage} />
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={20} color={Colors.textMuted} />
                    <Text style={styles.pickerText}>Front</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('g2CnicBack')}>
                {g2CnicBack ? (
                  <Image source={{ uri: g2CnicBack }} style={styles.pickerImage} />
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={20} color={Colors.textMuted} />
                    <Text style={styles.pickerText}>Back</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            {renderInput('Product Name (e.g. Bike, AC)', 'productName', '')}
            {renderInput('Model / Year', 'productModel', '')}
            {renderInput('Serial / Engine Number', 'productSerial', '')}
            {renderInput('Place of Agreement', 'place', 'e.g. Charsadda')}
            {renderInput('Invoice Number (Optional)', 'invoiceNo', 'Auto-generated if empty')}

            <Text style={styles.subLabel}>Product Photo</Text>
            <TouchableOpacity style={styles.productPicker} onPress={() => pickImage('productPhoto')}>
              {productPhoto ? (
                <Image source={{ uri: productPhoto }} style={styles.pickerImage} />
              ) : (
                <View style={styles.pickerPlaceholder}>
                  <MaterialCommunityIcons name="camera-outline" size={24} color={Colors.textMuted} />
                  <Text style={styles.pickerText}>Add Product Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Financial Summary</Text>
            {renderInput(`Total Price (${currencySymbol})`, 'totalPrice', '0', 'numeric', handleCalculate)}
            {renderInput(`Advance Payment (${currencySymbol})`, 'advancePayment', '0', 'numeric', handleCalculate)}
            {renderInput('Installment Duration (Months)', 'installmentDuration', '12', 'numeric', handleCalculate)}
            
            <View style={styles.autoCalculateBox}>
              <Text style={styles.autoCalculateBoxText}>Remaining Balance: {currencySymbol} {formData.remainingBalance || '0'}</Text>
              <Text style={styles.autoCalculateBoxText}>Monthly Installment: {currencySymbol} {formData.monthlyInstallment || '0'}</Text>
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: Colors.primaryLight + '10', borderColor: Colors.primary, borderWidth: 1, borderStyle: 'dashed' }]}>
            <Text style={[styles.sectionTitle, { borderBottomColor: Colors.primary }]}>Agreement Printing Note</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
              <Text style={{ marginLeft: 8, fontFamily: Fonts.medium, fontSize: 13, color: Colors.primary }}>
                The following sections will be added to the PDF:
              </Text>
            </View>
            <View style={styles.previewRow}>
              <View style={styles.previewItem}><Text style={styles.previewText}>G1 Thumb</Text></View>
              <View style={styles.previewItem}><Text style={styles.previewText}>G2 Thumb</Text></View>
            </View>
            <View style={styles.previewRow}>
              <View style={styles.previewItem}><Text style={styles.previewText}>Customer Sig/Thumb</Text></View>
              <View style={styles.previewItem}><Text style={styles.previewText}>Company Stamp/Sig</Text></View>
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color="#FFF" />
            <Text style={styles.submitButtonText}>Generate & Share PDF</Text>
          </TouchableOpacity>


        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.surface,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  autoCalculateBox: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  autoCalculateBoxText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: '#2E7D32',
    marginVertical: 2,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    elevation: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFF',
    marginLeft: 8,
  },
  profilePickerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  profilePicker: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pickerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pickerPlaceholder: {
    alignItems: 'center',
  },
  pickerText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  subLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  docPicker: {
    flex: 1,
    height: 80,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productPicker: {
    height: 100,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewItem: {
    flex: 0.48,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  previewText: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
});
