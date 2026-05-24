import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows, CommonStyles } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { submitSuggestion } from '../services/feedbackService';

interface SuggestionModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userPhone: string;
}

export default function SuggestionModal({ visible, onClose, userName, userPhone }: SuggestionModalProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert(t('common.error'), 'Please enter your suggestion.');
      return;
    }

    setIsSubmitting(true);
    const result = await submitSuggestion(text, userName, userPhone);
    setIsSubmitting(false);

    if (result.success) {
      Alert.alert(t('common.success'), 'Thank you for your feedback! We will review it soon.');
      setText('');
      onClose();
    } else {
      Alert.alert(t('common.error'), result.error || 'Failed to submit suggestion.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('settings.suggest_update')}</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              Help us improve! Share your ideas for new features or improvements.
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type your suggestion here..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={5}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.submitText}>{t('common.submit')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  container: {
    width: '100%',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
});
