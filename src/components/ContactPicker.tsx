import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, ActivityIndicator, TextInput, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { Colors, Fonts, FontSizes, Spacing, Radius, CommonStyles } from '../theme';

interface ContactPickerProps {
  onSelect: (name: string, phoneNumber: string) => void;
}

export default function ContactPicker({ onSelect }: ContactPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contacts.Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const openPicker = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      setModalVisible(true);
      setLoading(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
      // Sort alphabetically
      const sortedData = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setContacts(sortedData);
      setFilteredContacts(sortedData);
      setLoading(false);
    } else {
      alert('Permission to access contacts is required!');
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text) {
      setFilteredContacts(contacts.filter(c => c.name?.toLowerCase().includes(text.toLowerCase()) || 
        c.phoneNumbers?.some(p => p.number?.includes(text))));
    } else {
      setFilteredContacts(contacts);
    }
  };

  const handleSelect = (contact: Contacts.Contact) => {
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const pn = contact.phoneNumbers[0].number || '';
      onSelect(contact.name, pn);
      setModalVisible(false);
      setSearchQuery('');
    } else {
      alert('No phone number found for this contact.');
    }
  };

  return (
    <>
      <TouchableOpacity onPress={openPicker} style={styles.iconButton}>
        <MaterialCommunityIcons name="contacts" size={24} color={Colors.primary} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.surface} />
            </TouchableOpacity>
            <Text style={styles.title}>Select Contact</Text>
          </View>

          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item, index) => (item as any).id || index.toString()}
              contentContainerStyle={{ padding: Spacing.base }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.contactItem} onPress={() => handleSelect(item)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
                  </View>
                  <View>
                    <Text style={styles.contactName}>{item.name}</Text>
                    {item.phoneNumbers && item.phoneNumbers.length > 0 && (
                      <Text style={styles.contactPhone}>{item.phoneNumbers[0].number}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              initialNumToRender={20}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', padding: Spacing.xl }}>
                  <Text style={{ fontFamily: Fonts.regular, color: Colors.textMuted }}>No contacts found.</Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
  },
  closeBtn: {
    marginRight: Spacing.md,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.base,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontFamily: Fonts.medium,
    color: Colors.textPrimary,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  contactName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  contactPhone: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
