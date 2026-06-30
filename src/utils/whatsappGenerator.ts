import { Linking, Alert } from 'react-native';
import { Installment, Payment } from '../types';
import { getBusinessProfile, getCurrencySetting } from '../services/storage';
import { formatCurrency } from './currency';

function formatDateReadable(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export const generateWhatsAppReceipt = async (
  installments: Installment[],
  payments: Payment[],
  clientPhone: string
) => {
  if (!clientPhone) {
    Alert.alert('Error', 'Client phone number is missing.');
    return;
  }

  try {
    const [profile, currency] = await Promise.all([
      getBusinessProfile(),
      getCurrencySetting()
    ]);
    
    const businessName = profile?.name || "INSTALLMENT SERVICES";
    let messageLines: string[] = [];

    installments.forEach((inst, index) => {
      // Filter and sort history
      const instPayments = payments
        .filter(p => p.installmentId === inst.id && p.receiptNo !== 'Down Payment')
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      messageLines.push(businessName.toUpperCase());
      messageLines.push("📋 Installment Payment Record\n");
      messageLines.push(`Customer: ${inst.clientName}`);
      messageLines.push(`Product: ${inst.productName}`);
      messageLines.push(`💰 Total Price: ${formatCurrency(inst.totalAmount, currency)}`);
      
      const advanceDateFormatted = formatDateReadable(inst.startDate); 
      messageLines.push(`💵 Advance Paid (${advanceDateFormatted}): ${formatCurrency(inst.downPayment, currency)} ✅`);
      messageLines.push(`📆 Monthly Installment: ${formatCurrency(inst.monthlyAmount, currency)}\n`);

      instPayments.forEach(p => {
        const pDate = formatDateReadable(p.date.split('T')[0]);
        messageLines.push(`📌 ${pDate}: ${formatCurrency(p.amount, currency)} ✅`);
      });

      messageLines.push('\n📊 Installments Paid: ' + inst.paidInstallments);
      messageLines.push(`💰 Total Paid: ${formatCurrency(inst.paidAmount + inst.downPayment, currency)}`);
      messageLines.push(`📉 Remaining Balance: ${formatCurrency(inst.remainingAmount, currency)}`);
      
      if (inst.remainingAmount > 0) {
        const nextDate = formatDateReadable(inst.nextDueDate);
        messageLines.push(`⏭️ Next Due: ${nextDate} – ${formatCurrency(inst.monthlyAmount, currency)}`);
      } else {
        messageLines.push('🎉 Congratulations! Plan Completed.');
      }

      if (index < installments.length - 1) {
        messageLines.push('\n\n');
      }
    });

    const message = messageLines.join('\n');

    let phoneStr = clientPhone.replace(/[^0-9+]/g, '');
    if (phoneStr.startsWith('0')) {
      phoneStr = '+92' + phoneStr.substring(1);
    } else if (!phoneStr.startsWith('+')) {
      phoneStr = '+' + phoneStr;
    }

    const url = `whatsapp://send?phone=${phoneStr}&text=${encodeURIComponent(message)}`;
    
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      const webUrl = `https://wa.me/${phoneStr.replace('+', '')}?text=${encodeURIComponent(message)}`;
      await Linking.openURL(webUrl).catch((err) => {
        Alert.alert('Error', 'Could not open WhatsApp. Please make sure WhatsApp is installed.');
        console.error('WhatsApp deep link failed:', err);
      });
    }
  } catch (error: any) {
    Alert.alert('Error', 'Failed to generate receipt message: ' + (error.message || 'Unknown error'));
    console.error('WhatsApp Generator Error:', error);
  }
};

export const shareCalculatorDetails = async (
  details: {
    price: number;
    markupPercent: number;
    markupAmount: number;
    totalValue: number;
    tenure: number;
    downPayment: number;
    installment: number;
  },
  clientPhone?: string
) => {
  try {
    const [profile, currency] = await Promise.all([
      getBusinessProfile(),
      getCurrencySetting()
    ]);
    
    const businessName = profile?.name || "INSTALLMENT SERVICES";
    const cur = currency.split(' ')[0];

    const message = `*${businessName.toUpperCase()} - INSTALLMENTS*

Product Price: ${cur} ${details.price.toLocaleString()}
Markup (${details.markupPercent}%): ${cur} ${details.markupAmount.toLocaleString()}
-------------------------------
*Total Value: ${cur} ${details.totalValue.toLocaleString()}*

Down Payment: ${cur} ${details.downPayment.toLocaleString()}
Remaining Balance: ${cur} ${(details.totalValue - details.downPayment).toLocaleString()}
Plan Tenure: ${details.tenure} Months

*👉 Monthly Installment: ${cur} ${details.installment.toLocaleString()}*

_Note: This is an estimated installment for information purposes._`;

    let url = '';
    if (clientPhone) {
      let phoneStr = clientPhone.replace(/[^0-9+]/g, '');
      if (phoneStr.startsWith('0')) {
        phoneStr = '+92' + phoneStr.substring(1);
      } else if (!phoneStr.startsWith('+')) {
        phoneStr = '+' + phoneStr;
      }
      url = `whatsapp://send?phone=${phoneStr}&text=${encodeURIComponent(message)}`;
    } else {
      url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    }
    
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      const waUrl = clientPhone 
        ? `https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      await Linking.openURL(waUrl).catch((err) => {
        Alert.alert('Error', 'Could not open WhatsApp.');
        console.error('WhatsApp open failed:', err);
      });
    }
  } catch (error: any) {
    Alert.alert('Error', 'Failed to share details: ' + (error.message || 'Unknown error'));
  }
};
