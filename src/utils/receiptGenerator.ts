import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { getBusinessProfile, getCurrencySetting, getClients, getPayments } from '../services/storage';
import { formatCurrency } from '../utils/currency';
import { Payment, Installment } from '../types';
import { formatDateSlash } from './date';

export const generateAndPrintReceipt = async (
  clientName: string,
  payments: Payment[],
  installments: Installment[]
) => {
  const [business, currency, clients, allStoredPayments] = await Promise.all([
    getBusinessProfile(),
    getCurrencySetting(),
    getClients(),
    getPayments()
  ]);

  const businessName = business?.name || 'INSTALLMENT SERVICES';
  let businessLogo = '';
  
  if (business?.logo) {
    try {
      if (business.logo.startsWith('file://')) {
        const base64 = await FileSystem.readAsStringAsync(business.logo, { encoding: 'base64' });
        businessLogo = `data:image/png;base64,${base64}`;
      } else {
        businessLogo = business.logo;
      }
    } catch (e) {
      console.warn("Failed to load receipt logo as base64", e);
    }
  }

  const businessAddress = business?.address || '';
  const businessPhone = business?.phone || '';

  const payment = payments[0];
  if (!payment) return;

  const inst = installments.find(i => i.id === payment.installmentId);
  if (!inst) return;

  const clientInfo = clients.find(c => c.id === inst.clientId);

  // Fetch all payments for this specific installment
  const historyPayments = allStoredPayments
    .filter(p => p.installmentId === inst.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  // If the current payment isn't in storage yet, append it for display
  if (!historyPayments.find(p => p.id === payment.id)) {
      historyPayments.push(payment);
  }
  
  historyPayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalProductValue = inst.totalAmount;
  const advance = inst.downPayment;
  const currentPayment = payment.amount;
  const totalPaid = inst.paidAmount || historyPayments.reduce((sum, p) => sum + p.amount, 0) + advance;
  const remaining = inst.remainingAmount;
  const nextDue = inst.nextDueDate;
  const monthly = inst.monthlyAmount;

  const cur = currency.split(' ')[0];

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
          }
          /* Standard 80mm thermal paper width settings */
          @page {
            margin: 0;
            size: 80mm auto; 
          }
          .ticket {
            width: 76mm;
            margin: 0 auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            line-height: 1.4;
            padding: 2mm;
            box-sizing: border-box;
          }
          .centered { text-align: center; }
          .bold { font-weight: bold; }
          .logo { max-width: 40mm; max-height: 40mm; display: block; margin: 0 auto 5px auto; }
          .title { font-size: 18px; margin: 5px 0; text-transform: uppercase; text-align: center; font-weight: bold; }
          .border-top { border-top: 1px dashed black; }
          .border-bottom { border-bottom: 1px dashed black; }
          .section { margin: 10px 0; padding: 5px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          td { padding: 3px 0; }
          .right { text-align: right; }
          
          .history-list { font-size: 12px; margin-top: 10px; }
          .history-item { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dotted #ccc; }
          
          .box { 
            border: 1px solid black; 
            border-radius: 8px; 
            padding: 15px 10px; 
            margin-top: 25px; 
            text-align: center; 
          }
          .sig-line {
            margin-top: 40px; 
            border-top: 1px dashed black; 
            display: inline-block; 
            padding-top: 5px;
            font-size: 11px;
          }
          .footer {
            margin-top: 20px;
            font-size: 11px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="centered">
            ${businessLogo ? `<img src="${businessLogo}" class="logo" />` : ''}
            <div class="title">${businessName}</div>
            ${businessAddress ? `<div>${businessAddress}</div>` : ''}
            ${businessPhone ? `<div>Phone: ${businessPhone}</div>` : ''}
            
            <div class="bold" style="margin-top: 15px; font-size: 15px;">PAYMENT RECORD</div>
            <div style="margin-top: 5px;">Date: ${payment.date || new Date().toLocaleDateString('en-GB')}</div>
            <div>Receipt No: ${payment.receiptNo || inst.invoiceNo || 'N/A'}</div>
          </div>
          
          <div class="section border-top">
            <div class="bold" style="margin-bottom: 3px;">CLIENT DETAILS</div>
            <div>Customer: ${clientName}</div>
            ${clientInfo?.phone ? `<div>Phone: ${clientInfo.phone}</div>` : ''}
          </div>

          <div class="section">
            <div class="bold" style="margin-bottom: 3px;">PRODUCT & PLAN</div>
            <div>Product: ${inst.productName}</div>
            <div>Total Price: ${formatCurrency(totalProductValue, cur)}</div>
            <div>Advance Paid: ${formatCurrency(advance, cur)}</div>
            <div>Monthly Inst: ${formatCurrency(monthly, cur)}</div>
          </div>

          <div class="section border-top">
            <div class="bold">PAYMENT LEDGER</div>
            <div class="history-list">
              <div class="history-item bold">
                 <span>Date</span>
                 <span>Amount</span>
              </div>
              <div class="history-item">
                 <span>${formatDateSlash(inst.startDate)}</span>
                 <span>${formatCurrency(advance, cur)} (Adv)</span>
              </div>
              ${historyPayments.map(p => `
                <div class="history-item ${p.id === payment.id ? 'bold' : ''}">
                  <span>${formatDateSlash(p.date)}</span>
                  <span>${formatCurrency(p.amount, cur)} ${p.id === payment.id ? '(Now)' : ''}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="section border-top border-bottom" style="padding: 10px 0;">
            <table>
              <tr>
                <td>Instills Paid:</td>
                <td class="right">${historyPayments.length}</td>
              </tr>
              <tr>
                <td>Total Paid:</td>
                <td class="right">${formatCurrency(totalPaid, cur)}</td>
              </tr>
              <tr class="bold">
                <td>Remaining Bal:</td>
                <td class="right">${formatCurrency(remaining, cur)}</td>
              </tr>
              ${remaining > 0 ? `
              <tr>
                <td>Next Due Date:</td>
                <td class="right">${formatDateSlash(nextDue)}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div class="box">
            <div class="bold" style="font-size: 16px; margin-bottom: 10px;">Verified Receipt</div>
            <div class="sig-line">Authorized Signature / Stamp</div>
          </div>

          <div class="footer">
            <div class="bold" style="font-size: 13px;">Thank you for choosing ${businessName}!</div>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await Print.printAsync({ 
      html, 
      width: 227 
    });
  } catch (error) {
    console.error('Error printing receipt', error);
  }
};

