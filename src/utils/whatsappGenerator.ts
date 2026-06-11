import { Linking, Alert } from 'react-native';
import { Installment, Payment } from '../types';
import { getBusinessProfile, getCurrencySetting } from '../services/storage';
// @ts-ignore
import { formatCurrency } from '../theme';

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
  if (!clientPhone) return;

  const [profile, currency] = await Promise.all([
    getBusinessProfile(),
    getCurrencySetting()
  ]);
  
  const businessName = profile?.name || "INSTALLMENT SERVICES";
  let messageLines: string[] = [];

  installments.forEach((inst, index) => {
    // Filter and sort history
    const instPayments = payments
      .filter(p => p.installmentId === inst.id)
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
  Linking.canOpenURL(url).then(supported => {
    if (supported) {
      Linking.openURL(url);
    } else {
      Linking.openURL(`https://wa.me/${phoneStr.replace('+', '')}?text=${encodeURIComponent(message)}`).catch(() => {
        Alert.alert('Error', 'Could not open WhatsApp');
      });
    }
  });
};
