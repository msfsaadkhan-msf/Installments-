import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, CommonStyles, Fonts, FontSizes, Radius } from '../theme';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import ClientCard from '../components/ClientCard';
import EmptyState from '../components/EmptyState';
import { getClients } from '../services/storage';
import { Client } from '../types';

export default function CollectPaymentSelectionScreen() {
  const navigation = useNavigation<any>();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadClients = async () => {
    try {
      const data = await getClients();
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setClients(sorted);
      setFilteredClients(sorted);
    } catch (error) {
      console.error('Failed to load clients', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [])
  );

  useEffect(() => {
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      setFilteredClients(
        clients.filter(
          c => c.name.toLowerCase().includes(lower) || 
               c.phone.includes(searchQuery)
        )
      );
    } else {
      setFilteredClients(clients);
    }
  }, [searchQuery, clients]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  };

  return (
    <View style={CommonStyles.screen}>
      <Header title="Collect Payment" showBack />
      
      <View style={styles.container}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Select a client to record a payment for their installments.</Text>
        </View>

        <View style={styles.searchContainer}>
          <SearchBar 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or phone..."
          />
        </View>

        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onPress={(client) => {
                navigation.navigate('ClientPaymentScreen', { client });
              }}
              onLongPress={() => {}}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="account-search-outline"
              title="No Clients Found"
              message="Please add a client first to collect payments."
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBox: {
    padding: Spacing.base,
    backgroundColor: Colors.primary,
  },
  infoText: {
    color: Colors.accentLight,
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  searchContainer: {
    padding: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 40,
    flexGrow: 1,
  },
});
