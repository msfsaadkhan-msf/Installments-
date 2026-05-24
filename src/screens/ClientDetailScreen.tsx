import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Linking, Alert, Image, Modal, TextInput } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, CommonStyles, Shadows, Radius } from '../theme';
import Header from '../components/Header';
import InstallmentCard from '../components/InstallmentCard';
import { getInstallments, updateClient, updateInstallment } from '../services/storage';
import { Client, Installment, InstallmentStatus } from '../types';
import { generateAgreementPDF } from '../services/pdfService';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

export default function ClientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const client: Client | undefined = route.params?.client;

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [editingDueDatePlan, setEditingDueDatePlan] = useState<Installment | null>(null);
  const [newDueDate, setNewDueDate] = useState('');

  const loadInstallments = async () => {
    if (!client) return;
    try {
      const all = await getInstallments();
      const filtered = all.filter(i => i.clientId === client.id);
      setInstallments(filtered);
    } catch (e) {
      console.error('Failed to load client installments', e);
    }
  };

  const handleDownloadImage = async () => {
    if (!viewingImage) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo access to save this image.');
        return;
      }
      
      let localUri = viewingImage;
      if (viewingImage.startsWith('data:image')) {
        localUri = FileSystem.documentDirectory + 'download_' + Date.now() + '.jpg';
        const base64Data = viewingImage.split(',')[1];
        await FileSystem.writeAsStringAsync(localUri, base64Data, { encoding: 'base64' });
      }

      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Success', 'Image saved to your gallery!');
    } catch (e) {
      console.error('Download error', e);
      Alert.alert('Error', 'Failed to save image.');
    }
  };

  const handleDeleteImage = () => {
    if (!viewingImage || !client) return;
    Alert.alert('Confirm Delete', 'Are you sure you want to permanently delete this media? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const updated = { ...client };
          if (updated.profileImage === viewingImage) {
            updated.profileImage = undefined;
          }
          await updateClient(updated);
          setViewingImage(null);
          navigation.goBack();
          setTimeout(() => {
            navigation.navigate('ClientDetailScreen', { client: updated });
          }, 100);
        } catch (e) {
          Alert.alert('Error', 'Failed to delete image');
        }
      }}
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      loadInstallments();
    }, [client])
  );

  const handleSaveDueDate = async () => {
    if (!editingDueDatePlan || !newDueDate) return;
    try {
      const updatedPlan = { ...editingDueDatePlan, nextDueDate: newDueDate };
      await updateInstallment(updatedPlan);
      setEditingDueDatePlan(null);
      loadInstallments();
      Alert.alert('Success', 'Next due date updated successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to update due date.');
    }
  };

  if (!client) {
    return (
      <View style={CommonStyles.screen}>
        <Header title="Error" showBack />
        <View style={CommonStyles.center}>
          <Text style={{ fontFamily: Fonts.medium, color: Colors.danger }}>Client data missing.</Text>
        </View>
      </View>
    );
  }

  const activeAndOverdue = installments.filter(i => i.status !== InstallmentStatus.COMPLETED);
  const totalMonthly = activeAndOverdue.reduce((sum, i) => sum + i.monthlyAmount, 0);
  const totalPending = activeAndOverdue.reduce((sum, i) => sum + i.remainingAmount, 0);
  const overdueInstallments = installments.filter(i => i.status === InstallmentStatus.OVERDUE);
  const totalOverdue = overdueInstallments.reduce((sum, i) => sum + i.remainingAmount, 0);

  return (
    <View style={CommonStyles.screen}>
      <Header title="Client Details" showBack />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('AddClientScreen', { client })}
          >
            <MaterialCommunityIcons name="account-edit" size={20} color={Colors.surface} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.avatar} 
            activeOpacity={0.8}
            onPress={() => client.profileImage && setViewingImage(client.profileImage)}
          >
            {client.profileImage ? (
              <Image source={{ uri: client.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{client.name}</Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ ...styles.detailItem, marginBottom: 0 }}><MaterialCommunityIcons name="phone" /> {client.phone}</Text>
            <TouchableOpacity 
              onPress={() => {
                let phoneStr = client.phone.replace(/[^0-9+]/g, '');
                if (phoneStr.startsWith('0')) {
                  phoneStr = '+92' + phoneStr.substring(1);
                } else if (!phoneStr.startsWith('+')) {
                  phoneStr = '+' + phoneStr;
                }
                const url = `whatsapp://send?phone=${phoneStr}`;
                Linking.canOpenURL(url).then(supported => {
                  if (supported) {
                    Linking.openURL(url);
                  } else {
                    Linking.openURL(`https://wa.me/${phoneStr.replace('+', '')}`).catch(() => {
                      Alert.alert('Error', 'Could not open WhatsApp');
                    });
                  }
                });
              }}
              style={{ backgroundColor: '#25D366', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}
            >
              <MaterialCommunityIcons name="whatsapp" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 10, marginLeft: 4, fontFamily: Fonts.bold }}>WA Chat</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.detailItem}><MaterialCommunityIcons name="card-account-details" /> {client.cnic}</Text>
          <Text style={styles.detailItem}><MaterialCommunityIcons name="map-marker" /> {client.address}, {client.city}</Text>

          <View style={styles.documentButtonsRow}>
            {client.cnicFront && (
              <TouchableOpacity 
                style={styles.docBtn} 
                onPress={() => setViewingImage(client.cnicFront!)}
              >
                <MaterialCommunityIcons name="file-image-outline" size={16} color={Colors.accent} />
                <Text style={styles.docBtnText}>CNIC Front</Text>
              </TouchableOpacity>
            )}
            {client.cnicBack && (
              <TouchableOpacity 
                style={styles.docBtn} 
                onPress={() => setViewingImage(client.cnicBack!)}
              >
                <MaterialCommunityIcons name="file-image-outline" size={16} color={Colors.accent} />
                <Text style={styles.docBtnText}>CNIC Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Monthly</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>Rs {totalMonthly.toLocaleString()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Overdue</Text>
            <Text style={[styles.statValue, { color: Colors.danger }]}>Rs {totalOverdue.toLocaleString()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Pending</Text>
            <Text style={[styles.statValue, { color: Colors.textPrimary }]}>Rs {totalPending.toLocaleString()}</Text>
          </View>
        </View>

        <View style={[CommonStyles.rowBetween, { marginTop: Spacing.xl, marginBottom: Spacing.md }]}>
          <Text style={CommonStyles.sectionTitle}>Active Plans</Text>
          <View style={{ flexDirection: 'row' }}>
            {activeAndOverdue.length > 0 && (
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: Colors.success, marginRight: Spacing.sm }]}
                onPress={() => navigation.navigate('ClientPaymentScreen', { client })}
              >
                <MaterialCommunityIcons name="cash-multiple" size={16} color={Colors.surface} />
                <Text style={[styles.addButtonText, { color: Colors.surface }]}>Collect All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('NewInstallmentScreen', { client })}
            >
              <MaterialCommunityIcons name="plus" size={16} color={Colors.surface} />
              <Text style={styles.addButtonText}>New Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {installments.length > 0 ? (
          installments.map(inst => (
            <InstallmentCard 
              key={inst.id} 
              installment={inst} 
              onPress={(installment) => {
                navigation.navigate('InstallmentDetailScreen', { installment });
              }} 
              onEditDueDate={(installment) => {
                setEditingDueDatePlan(installment);
                setNewDueDate(installment.nextDueDate);
              }}
              onCollectPayment={(installment) => {
                navigation.navigate('RecordPaymentScreen', { installment });
              }}
              onViewAgreement={(installment) => {
                generateAgreementPDF(installment, client);
              }}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No installments active for this client.</Text>
          </View>
        )}

      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!viewingImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={{ marginRight: 15, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 25 }} onPress={handleDownloadImage}>
               <MaterialCommunityIcons name="download" size={24} color={Colors.surface} />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginRight: 15, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 25 }} onPress={handleDeleteImage}>
               <MaterialCommunityIcons name="delete" size={24} color={Colors.danger} />
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 25 }} onPress={() => setViewingImage(null)}>
               <MaterialCommunityIcons name="close" size={24} color={Colors.surface} />
            </TouchableOpacity>
          </View>
          
          {viewingImage && (
            <Image 
              source={{ uri: viewingImage }} 
              style={styles.fullImage} 
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Edit Due Date Modal */}
      <Modal
        visible={!!editingDueDatePlan}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingDueDatePlan(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editDateModalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="calendar-edit" size={24} color={Colors.accent} />
              <Text style={styles.editDateModalTitle}>Edit Next Due Date</Text>
            </View>
            
            <Text style={styles.inputLabelSmall}>ENTER DATE (YYYY-MM-DD)</Text>
            <View style={styles.premiumInputContainer}>
              <TextInput 
                style={styles.premiumInput}
                value={newDueDate}
                onChangeText={setNewDueDate}
                placeholder="2024-05-24"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="default"
              />
            </View>

            <View style={styles.editDateModalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setEditingDueDatePlan(null)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSave]} 
                onPress={handleSaveDueDate}
              >
                <Text style={styles.modalBtnTextSave}>Update Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  profileCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.surface,
    marginBottom: Spacing.sm,
  },
  detailItem: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.accentLight,
    marginBottom: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
  },
  addButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginLeft: 4,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  statRow: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  emptyContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  documentButtonsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  docBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.surface,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullImage: {
    width: '95%',
    height: '80%',
  },
  editProfileBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Radius.full,
    zIndex: 5,
  },
  editDateModalContent: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    width: '90%',
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  editDateModalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.accent,
    marginLeft: 10,
  },
  inputLabelSmall: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.accentLight,
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  premiumInputContainer: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.accent + '60',
    paddingHorizontal: Spacing.base,
    paddingVertical: 4,
    marginBottom: Spacing.lg,
  },
  premiumInput: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.surface,
    height: 50,
  },
  editDateModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalBtnSave: {
    backgroundColor: Colors.accent,
  },
  modalBtnTextCancel: {
    fontFamily: Fonts.semiBold,
    color: Colors.surface,
    fontSize: FontSizes.sm,
  },
  modalBtnTextSave: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
    fontSize: FontSizes.sm,
  },
});
