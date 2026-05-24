import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, CommonStyles } from '../theme';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import ClientCard from '../components/ClientCard';
import EmptyState from '../components/EmptyState';
import { getClients, deleteClient, syncFromCloud } from '../services/storage';
import { Client } from '../types';

export default function ClientsScreen() {
  const navigation = useNavigation<any>();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadClients = async () => {
    try {
      const data = await getClients();
      // Sort alphabetically by name
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
          (c: Client) => c.name.toLowerCase().includes(lower) || 
               c.phone.includes(searchQuery) ||
               c.cnic.includes(searchQuery)
        )
      );
    } else {
      setFilteredClients(clients);
    }
  }, [searchQuery, clients]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromCloud();
    await loadClients();
    setRefreshing(false);
  };

  const handleLongPress = (client: Client) => {
    Alert.alert(
      client.name,
      'Choose an action for this client',
      [
        {
          text: 'Edit Details',
          onPress: () => navigation.navigate('AddClientScreen', { client })
        },
        {
          text: 'Delete Client',
          style: 'destructive',
          onPress: () => confirmDelete(client)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const confirmDelete = (client: Client) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${client.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClient(client.id);
              await loadClients();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete client');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={CommonStyles.screen}>
      <Header 
        title="Clients" 
        rightIcon="account-plus"
        onRightPress={() => navigation.navigate('AddClientScreen' as never)}
      />
      
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <SearchBar 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, phone, or CNIC..."
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
                navigation.navigate('ClientDetailScreen', { client });
              }}
              onLongPress={(client) => handleLongPress(client)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="account-search-outline"
              title="No Clients Found"
              message={searchQuery ? "Try adjusting your search criteria." : "You haven't added any clients yet. Tap the + icon to add one."}
            />
          }
        />

        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('AddClientScreen' as never)}
        >
          <MaterialCommunityIcons name="plus" size={30} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 100, // Space for FAB
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xxl,
    right: Spacing.base,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
