import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Radius } from '../theme';
import Header from '../components/Header';
import { getAgreementTerms, saveAgreementTerms } from '../services/storage';

export default function EditTermsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState('');

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      const data = await getAgreementTerms();
      setTerms(data);
    } catch (error) {
      console.error('Failed to load terms', error);
    }
  };

  const handleSave = async () => {
    if (!terms.trim()) {
      Alert.alert('Error', 'Terms content cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await saveAgreementTerms(terms);
      Alert.alert('Success', 'Agreement terms updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save terms');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={CommonStyles.screen}>
      <Header title="Legal Terms & Conditions" showBack />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Edit Agreement Sidebar</Text>
          <Text style={styles.infoText}>
            The text below will appear at the bottom of every generated Agreement PDF. 
            Use clear and concise language for your installment rules.
          </Text>
        </View>

        <View style={[CommonStyles.inputContainer, styles.termsContainer]}>
          <TextInput
            style={[CommonStyles.inputText, styles.termsInput]}
            placeholder="Enter terms and conditions here..."
            placeholderTextColor={Colors.textMuted}
            value={terms}
            onChangeText={setTerms}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity 
          style={CommonStyles.buttonPrimary} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={CommonStyles.buttonPrimaryText}>Update Terms</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[CommonStyles.buttonOutline, { marginTop: Spacing.md }]} 
          onPress={() => {
            setTerms('By signing this agreement, the client agrees to pay the monthly installments on or before the due date. Failure to pay may result in legal action or immediate retrieval of the product. The guarantors accept full and equal responsibility for the remaining balance if the client defaults. Both parties agree that the product remains the property of the company until full payment is received.');
          }}
        >
          <Text style={CommonStyles.buttonOutlineText}>Reset to Default</Text>
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
  infoBox: {
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.primary,
    marginBottom: 4,
  },
  infoText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  termsContainer: {
    minHeight: 300,
    backgroundColor: Colors.surface,
  },
  termsInput: {
    flex: 1,
    lineHeight: 22,
  },
});
