import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, CommonStyles } from '../theme';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import FilterPills from '../components/FilterPills';
import InstallmentCard from '../components/InstallmentCard';
import EmptyState from '../components/EmptyState';
import { getInstallments, getClients, getCurrencySetting } from '../services/storage';
import { Installment, InstallmentStatus, Client } from '../types';
import { generateAgreementPDF } from '../services/pdfService';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: InstallmentStatus.ACTIVE, label: 'Active' },
  { id: InstallmentStatus.OVERDUE, label: 'Overdue' },
  { id: InstallmentStatus.COMPLETED, label: 'Completed' },
];

export default function InstallmentsScreen() {
  const navigation = useNavigation<any>();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [filteredInstallments, setFilteredInstallments] = useState<Installment[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
    await loadData();
    setRefreshing(false);
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
