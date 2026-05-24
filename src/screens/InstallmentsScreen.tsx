import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Spacing, CommonStyles } from '../theme';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import FilterPills from '../components/FilterPills';
import InstallmentCard from '../components/InstallmentCard';
import EmptyState from '../components/EmptyState';
import { getInstallments, getClients, getCurrencySetting, deleteInstallment, syncFromCloud } from '../services/storage';
import { Installment, InstallmentStatus, Client } from '../types';
import { generateAgreementPDF } from '../services/pdfService';
import AdComponent from '../components/AdComponent';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: InstallmentStatus.ACTIVE, label: 'Active' },
  { id: InstallmentStatus.OVERDUE, label: 'Overdue' },
  { id: InstallmentStatus.COMPLETED, label: 'Completed' },
];

export default function InstallmentsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { initialFilter?: string } }, 'params'>>();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [filteredInstallments, setFilteredInstallments] = useState<Installment[]>([]);
  const [filter, setFilter] = useState(route.params?.initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (route.params?.initialFilter) {
      setFilter(route.params.initialFilter);
    }
  }, [route.params?.initialFilter]);
  const [clientPhones, setClientPhones] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState('PKR (₨)');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [instData, clients, currentCurrency] = await Promise.all([
        getInstallments(),
        getClients(),
        getCurrencySetting()
      ]);
      setCurrency(currentCurrency);
      
      const phoneMap: Record<string, string> = {};
      clients.forEach(c => {
        phoneMap[c.id] = c.phone;
      });
      setClientPhones(phoneMap);
      
      setInstallments(instData);
      applyFilter(instData, filter, searchQuery, phoneMap);
    } catch (error) {
      console.error('Failed to load installments', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const applyFilter = (data: Installment[], filterValue: string, query: string, phones?: Record<string, string>) => {
    const activePhones = phones || clientPhones;
    let result = data;

    // 1. Status Filter
    if (filterValue !== 'all') {
      result = result.filter(inst => inst.status === filterValue);
    }

    // 2. Search Query
    if (query.trim()) {
      const lower = query.toLowerCase();
      result = result.filter(inst => {
        const clientPhone = activePhones[inst.clientId] || '';
        return (
          inst.clientName.toLowerCase().includes(lower) ||
          inst.productName.toLowerCase().includes(lower) ||
          clientPhone.includes(query) ||
          (inst.guarantor1Phone && inst.guarantor1Phone.includes(query)) ||
          (inst.guarantor2Phone && inst.guarantor2Phone.includes(query))
        );
      });
    }

    setFilteredInstallments(result);
  };

  useEffect(() => {
    applyFilter(installments, filter, searchQuery);
  }, [filter, searchQuery, installments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromCloud();
    await loadData();
    setRefreshing(false);
  };

  const handleLongPress = (item: Installment) => {
    Alert.alert(
      'Installment Plan Action',
      `Choose an action for ${item.productName} (${item.clientName})`,
      [
        {
          text: 'Edit Plan Details',
          onPress: () => navigation.navigate('NewInstallmentScreen', { 
            client: { id: item.clientId, name: item.clientName } as Client,
            planToEdit: item 
          })
        },
        {
          text: 'Delete Plan',
          style: 'destructive',
          onPress: () => confirmDeleteInstallment(item)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const confirmDeleteInstallment = (item: Installment) => {
    Alert.alert(
      'Confirm Delete Plan',
      'Are you sure you want to delete this installment plan and all its payment history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInstallment(item.id);
              await loadData();
              Alert.alert('Success', 'Installment plan and all related records deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete installment plan.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={CommonStyles.screen}>
      <Header title="Installments" />
      
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <SearchBar 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name, product, or phone..."
          />
        </View>
        <View style={styles.filterContainer}>
          <FilterPills 
            options={FILTER_OPTIONS}
            selectedValue={filter}
            onSelect={setFilter}
          />
        </View>

        <FlatList
          data={filteredInstallments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <InstallmentCard
              installment={item}
              showClientName={true}
              currency={currency}
              onPress={(installment) => {
                 navigation.navigate('InstallmentDetailScreen', { installment });
              }}
              onLongPress={handleLongPress}
              onCollectPayment={(installment) => {
                 navigation.navigate('RecordPaymentScreen', { installment });
              }}
              onViewAgreement={(installment) => {
                 generateAgreementPDF(installment);
              }}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="file-document-remove-outline"
              title={searchQuery ? "No Results" : "No Installments"}
              message={
                searchQuery 
                  ? "Try adjusting your search or filters." 
                  : (filter === 'all' ? "There are no installments recorded yet." : `No installments found for status '${filter}'.`)
              }
            />
          }
        />
        
        <AdComponent />
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
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.background,
  },
  filterContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
});
