// ─── Enums ────────────────────────────────────────────
export enum InstallmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

export enum PaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'Bank Transfer',
  JAZZCASH = 'JazzCash',
  EASYPAISA = 'Easypaisa',
}

// ─── Interfaces ───────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'collector';
  avatar?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  cnic: string;
  address: string;
  city: string;
  fatherName?: string;
  permanentAddress?: string;
  createdAt: string;
  profileImage?: string;
  cnicFront?: string;
  cnicBack?: string;
}

export interface Installment {
  id: string;
  clientId: string;
  clientName: string;
  productName: string;
  productPrice?: number;
  productPercentage?: number;
  totalAmount: number;
  downPayment: number;
  financedAmount: number;
  monthlyAmount: number;
  tenure: number; // months
  startDate: string;
  nextDueDate: string;
  status: InstallmentStatus;
  paidAmount: number;
  paidInstallments: number;
  remainingAmount: number;

  // Extended Details
  guarantor1Name?: string;
  guarantor1Cnic?: string;
  guarantor1Phone?: string;
  guarantor1Address?: string;
  guarantor2Name?: string;
  guarantor2Cnic?: string;
  guarantor2Phone?: string;
  guarantor2Address?: string;
  productModel?: string;
  productSerial?: string;
  color?: string;
  imei1?: string;
  imei2?: string;
  variants?: { label: string, value: string }[];
  productPhotos?: string[];
  totalSalePrice?: number;
  installmentEndDate?: string;
  placeOfAgreement?: string;
  productImage?: string;
  guarantor1CnicFront?: string;
  guarantor1CnicBack?: string;
  guarantor2CnicFront?: string;
  guarantor2CnicBack?: string;
  
  // Private Business Details (Secure)
  buyPrice?: number;
  privateNotes?: string;
  privatePhotos?: string[];
  invoiceNo?: string;
}

export interface Payment {
  id: string;
  installmentId: string;
  clientName: string;
  productName: string;
  amount: number;
  date: string;
  receiptNo: string;
  method: PaymentMethod;
  notes?: string;
  remainingBalance?: number;
}

export interface DashboardStats {
  totalClients: number;
  activeInstallments: number;
  totalCollected: number;
  totalPending: number;
  overdueCount: number;
  monthlyTarget: number;
  monthlyCollected: number;
  thisMonthTarget: number;
  thisMonthCollected: number;
  thisMonthOverdue: number;
}

export interface BusinessProfile {
  name: string;
  logo?: string;
  address: string;
  phone: string;
  email: string;
}

export interface AgreementTerms {
  content: string;
}

// ─── Navigation Types ─────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Clients: undefined;
  Installments: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type DrawerParamList = {
  HomeTabs: undefined;
  Profile: undefined;
};
