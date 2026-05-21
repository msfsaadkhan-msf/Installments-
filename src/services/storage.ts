import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Installment, Payment, User, BusinessProfile, AgreementTerms } from '../types';

const KEYS = {
  USER: '@ims_user',
  USERS: '@ims_users',
  CLIENTS: '@ims_clients',
  INSTALLMENTS: '@ims_installments',
  PAYMENTS: '@ims_payments',
  BUSINESS: '@ims_business',
  TERMS: '@ims_terms',
  CURRENCY: '@ims_currency',
  NOTIFICATIONS: '@ims_notifications',
  BIOMETRIC: '@ims_biometric',
  LAST_USER: '@ims_last_user',
};

// ─── Generic Helpers ──────────────────────────────────
async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ─── Auth ─────────────────────────────────────────────
export async function saveCurrentUser(user: User): Promise<void> {
  await setJSON(KEYS.USER, user);
}

export async function updateCurrentUser(data: Partial<User>): Promise<User | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  const updated = { ...current, ...data };
  await saveCurrentUser(updated);
  
  // Also update in USERS list if exists
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === current.id);
  if (idx !== -1) {
    users[idx] = updated;
    await saveUsers(users);
  }
  
  return updated;
}

export async function getCurrentUser(): Promise<User | null> {
  return getJSON<User>(KEYS.USER);
}

export async function clearCurrentUser(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.USER);
}

export async function getUsers(): Promise<User[]> {
  return (await getJSON<User[]>(KEYS.USERS)) || [];
}

export async function saveUsers(users: User[]): Promise<void> {
  await setJSON(KEYS.USERS, users);
}

// ─── Clients ──────────────────────────────────────────
export async function getClients(): Promise<Client[]> {
  return (await getJSON<Client[]>(KEYS.CLIENTS)) || [];
}

export async function saveClients(clients: Client[]): Promise<void> {
  await setJSON(KEYS.CLIENTS, clients);
}

export async function addClient(client: Client): Promise<void> {
  const clients = await getClients();
  clients.unshift(client);
  await saveClients(clients);
}

export async function updateClient(updated: Client): Promise<void> {
  const clients = await getClients();
  const idx = clients.findIndex(c => c.id === updated.id);
  if (idx !== -1) {
    clients[idx] = updated;
    await saveClients(clients);
  }
}

export async function deleteClient(id: string): Promise<void> {
  const clients = await getClients();
  await saveClients(clients.filter(c => c.id !== id));
}

// ─── Installments ─────────────────────────────────────
export async function getInstallments(): Promise<Installment[]> {
  const all = (await getJSON<Installment[]>(KEYS.INSTALLMENTS)) || [];
  let needsSave = false;
  const today = new Date().toISOString().split('T')[0];

  all.forEach(inst => {
    if (inst.status === 'active' && inst.nextDueDate < today) {
      inst.status = 'overdue' as any;
      needsSave = true;
    }
  });

  if (needsSave) {
    await setJSON(KEYS.INSTALLMENTS, all);
  }

  return all;
}

export async function saveInstallments(installments: Installment[]): Promise<void> {
  await setJSON(KEYS.INSTALLMENTS, installments);
}

export async function addInstallment(inst: Installment): Promise<void> {
  const all = await getInstallments();
  all.unshift(inst);
  await saveInstallments(all);
}

export async function updateInstallment(updated: Installment): Promise<void> {
  const all = await getInstallments();
  const idx = all.findIndex(i => i.id === updated.id);
  if (idx !== -1) {
    all[idx] = updated;
    await saveInstallments(all);
  }
}

// ─── Payments ─────────────────────────────────────────
export async function getPayments(): Promise<Payment[]> {
  return (await getJSON<Payment[]>(KEYS.PAYMENTS)) || [];
}

export async function savePayments(payments: Payment[]): Promise<void> {
  await setJSON(KEYS.PAYMENTS, payments);
}

export async function addPayment(payment: Payment): Promise<void> {
  const all = await getPayments();
  all.unshift(payment);
  await savePayments(all);
}

// ─── Settings / Profile ───────────────────────────────
export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  return await getJSON<BusinessProfile>(KEYS.BUSINESS);
}

export async function saveBusinessProfile(profile: BusinessProfile): Promise<void> {
  await setJSON(KEYS.BUSINESS, profile);
}

export async function getAgreementTerms(): Promise<string> {
  const terms = await getJSON<AgreementTerms>(KEYS.TERMS);
  return terms?.content || 'By signing this agreement, the client agrees to pay the monthly installments on or before the due date. Failure to pay may result in legal action or immediate retrieval of the product. The guarantors accept full and equal responsibility for the remaining balance if the client defaults. Both parties agree that the product remains the property of the company until full payment is received.';
}

export async function saveAgreementTerms(content: string): Promise<void> {
  await setJSON(KEYS.TERMS, { content });
}

export async function getCurrencySetting(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.CURRENCY)) || 'PKR (₨)';
}

export async function saveCurrencySetting(currency: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.CURRENCY, currency);
}

export interface NotificationSettings {
  realTime: boolean;
  dailyOverdue: boolean;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const settings = await getJSON<NotificationSettings>(KEYS.NOTIFICATIONS);
  return settings || { realTime: true, dailyOverdue: true };
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  await setJSON(KEYS.NOTIFICATIONS, settings);
}

export async function isBiometricEnabled(): Promise<boolean> {
  const enabled = await AsyncStorage.getItem(KEYS.BIOMETRIC);
  return enabled === 'true';
}

export async function saveBiometricSetting(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.BIOMETRIC, enabled ? 'true' : 'false');
}

export async function getLastUser(): Promise<User | null> {
  return await getJSON<User>(KEYS.LAST_USER);
}

export async function saveLastUser(user: User): Promise<void> {
  await setJSON(KEYS.LAST_USER, user);
}

// ─── Seed Demo Data ───────────────────────────────────
export async function seedDemoData(): Promise<void> {
  const existingClients = await getClients();
  if (existingClients.length > 0) return; // Already seeded

  const demoClients: Client[] = [
    {
      id: 'c1',
      name: 'Ahmed Khan',
      phone: '0301-2345678',
      cnic: '35201-1234567-1',
      address: 'House 45, Street 12, G-11',
      city: 'Islamabad',
      createdAt: '2026-01-15',
    },
    {
      id: 'c2',
      name: 'Fatima Bibi',
      phone: '0321-9876543',
      cnic: '35202-7654321-2',
      address: 'Flat 8, Al-Noor Apartments, Gulshan',
      city: 'Karachi',
      createdAt: '2026-02-10',
    },
    {
      id: 'c3',
      name: 'Muhammad Usman',
      phone: '0333-5551234',
      cnic: '35101-5556789-3',
      address: '22-B, Model Town',
      city: 'Lahore',
      createdAt: '2026-03-05',
    },
    {
      id: 'c4',
      name: 'Ayesha Siddiqui',
      phone: '0345-7778899',
      cnic: '37201-9998877-4',
      address: '10, Satellite Town',
      city: 'Rawalpindi',
      createdAt: '2026-03-20',
    },
    {
      id: 'c5',
      name: 'Hassan Ali',
      phone: '0312-1112233',
      cnic: '34201-3332211-5',
      address: '5, Jinnah Colony',
      city: 'Faisalabad',
      createdAt: '2026-04-01',
    },
  ];

  const demoInstallments: Installment[] = [
    {
      id: 'i1',
      clientId: 'c1',
      clientName: 'Ahmed Khan',
      productName: 'Samsung Galaxy S24',
      totalAmount: 250000,
      downPayment: 50000,
      financedAmount: 200000,
      monthlyAmount: 16667,
      tenure: 12,
      startDate: '2026-02-01',
      nextDueDate: '2026-06-01',
      status: 'active' as any,
      paidAmount: 66668,
      paidInstallments: 4,
      remainingAmount: 133332,
    },
    {
      id: 'i2',
      clientId: 'c2',
      clientName: 'Fatima Bibi',
      productName: 'Honda CD-70',
      totalAmount: 180000,
      downPayment: 30000,
      financedAmount: 150000,
      monthlyAmount: 12500,
      tenure: 12,
      startDate: '2026-03-01',
      nextDueDate: '2026-06-01',
      status: 'active' as any,
      paidAmount: 37500,
      paidInstallments: 3,
      remainingAmount: 112500,
    },
    {
      id: 'i3',
      clientId: 'c3',
      clientName: 'Muhammad Usman',
      productName: 'Haier Refrigerator',
      totalAmount: 95000,
      downPayment: 15000,
      financedAmount: 80000,
      monthlyAmount: 13334,
      tenure: 6,
      startDate: '2025-12-01',
      nextDueDate: '2026-05-10',
      status: 'overdue' as any,
      paidAmount: 53336,
      paidInstallments: 4,
      remainingAmount: 26664,
    },
    {
      id: 'i4',
      clientId: 'c4',
      clientName: 'Ayesha Siddiqui',
      productName: 'Dell Laptop Inspiron 15',
      totalAmount: 145000,
      downPayment: 25000,
      financedAmount: 120000,
      monthlyAmount: 20000,
      tenure: 6,
      startDate: '2025-11-01',
      nextDueDate: '2026-04-01',
      status: 'completed' as any,
      paidAmount: 120000,
      paidInstallments: 6,
      remainingAmount: 0,
    },
    {
      id: 'i5',
      clientId: 'c5',
      clientName: 'Hassan Ali',
      productName: 'Orient AC 1.5 Ton',
      totalAmount: 115000,
      downPayment: 20000,
      financedAmount: 95000,
      monthlyAmount: 9500,
      tenure: 10,
      startDate: '2026-04-01',
      nextDueDate: '2026-06-01',
      status: 'active' as any,
      paidAmount: 19000,
      paidInstallments: 2,
      remainingAmount: 76000,
    },
  ];

  const demoPayments: Payment[] = [
    {
      id: 'p1',
      installmentId: 'i1',
      clientName: 'Ahmed Khan',
      productName: 'Samsung Galaxy S24',
      amount: 16667,
      date: '2026-05-01',
      receiptNo: 'REC-001',
      method: 'Cash' as any,
    },
    {
      id: 'p2',
      installmentId: 'i2',
      clientName: 'Fatima Bibi',
      productName: 'Honda CD-70',
      amount: 12500,
      date: '2026-05-01',
      receiptNo: 'REC-002',
      method: 'JazzCash' as any,
    },
    {
      id: 'p3',
      installmentId: 'i5',
      clientName: 'Hassan Ali',
      productName: 'Orient AC 1.5 Ton',
      amount: 9500,
      date: '2026-05-01',
      receiptNo: 'REC-003',
      method: 'Bank Transfer' as any,
    },
    {
      id: 'p4',
      installmentId: 'i1',
      clientName: 'Ahmed Khan',
      productName: 'Samsung Galaxy S24',
      amount: 16667,
      date: '2026-04-01',
      receiptNo: 'REC-004',
      method: 'Easypaisa' as any,
    },
    {
      id: 'p5',
      installmentId: 'i3',
      clientName: 'Muhammad Usman',
      productName: 'Haier Refrigerator',
      amount: 13334,
      date: '2026-04-15',
      receiptNo: 'REC-005',
      method: 'Cash' as any,
    },
  ];

  await saveClients(demoClients);
  await saveInstallments(demoInstallments);
  await savePayments(demoPayments);
}

export async function exportBackup(): Promise<string> {
  const allKeys = Object.entries(KEYS);
  const backupData: Record<string, any> = {};
  for (const [name, key] of allKeys) {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      try {
        backupData[name] = JSON.parse(value);
      } catch {
        backupData[name] = value;
      }
    } else {
      backupData[name] = null;
    }
  }
  return JSON.stringify({
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    data: backupData
  });
}

export async function importBackup(jsonString: string): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || parsed.version !== '1.0.0' || !parsed.data) {
      return { success: false, error: 'Invalid backup file format.' };
    }
    const data = parsed.data;
    const allKeys = Object.entries(KEYS);
    for (const [name, key] of allKeys) {
      if (data[name] !== undefined) {
        if (data[name] === null) {
          await AsyncStorage.removeItem(key);
        } else {
          const val = data[name];
          const stringVal = typeof val === 'string' ? val : JSON.stringify(val);
          await AsyncStorage.setItem(key, stringVal);
        }
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to parse backup.' };
  }
}

