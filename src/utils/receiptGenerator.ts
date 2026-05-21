import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getBusinessProfile, getCurrencySetting } from '../services/storage';
import { formatCurrency } from '../theme';
import { Payment, Installment, BusinessProfile } from '../types';

export const generateAndPrintReceipt = async (
  clientName: string,
  payments: Payment[],
  installments: Installment[]
) => {
  const [business, currency] = await Promise.all([
    getBusinessProfile(),
    getCurrencySetting()
  ]);

  const businessName = business?.name || 'INSTALLMENT SERVICES';
  const businessLogo = business?.logo;
  const businessAddress = business?.address || 'Pakistan';
  const businessPhone = business?.phone || '';

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const currencyLabel = currency.split(' ')[0];

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          .receipt-container { border: 1px solid #eee; padding: 20px; border-radius: 8px; }
          .header { text-align: center; border-bottom: 2px solid #1a2a3a; padding-bottom: 10px; margin-bottom: 15px; }
          .logo { width: 60px; height: 60px; border-radius: 30px; margin-bottom: 5px; }
          h1 { font-size: 18px; margin: 0; color: #1a2a3a; text-transform: uppercase; }
          .biz-info { font-size: 11px; color: #666; }
          .receipt-title { text-align: center; font-size: 14px; font-weight: bold; margin: 15px 0; color: #d4af37; text-decoration: underline; }
          .meta-info { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; }
          th { color: #555; background-color: #f9f9f9; }
          .total-row { font-weight: bold; font-size: 14px; background-color: #f4f4f4; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }
          .signature { margin-top: 40px; border-top: 1px solid #ccc; width: 150px; display: inline-block; padding-top: 5px; font-size: 11px; }
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 60px; color: rgba(0,0,0,0.03); z-index: -1; pointer-events: none; }
        </style>
      </head>
      <body>
        <div class="watermark">PAID</div>
        <div class="receipt-container">
          <div class="header">
            ${businessLogo ? `<img src="${businessLogo}" class="logo" />` : ''}
            <h1>${businessName}</h1>
            <div class="biz-info">${businessAddress}</div>
            <div class="biz-info">Phone: ${businessPhone}</div>
          </div>

          <div class="receipt-title">PAYMENT RECEIPT</div>

          <div class="meta-info">
            <div>
              <strong>Client:</strong> ${clientName}<br/>
              <strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}
            </div>
            <div style="text-align: right;">
              <strong>Receipt No:</strong> ${payments[0]?.receiptNo || 'N/A'}<br/>
              <strong>Method:</strong> ${payments[0]?.method || 'N/A'}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product / Plan</th>
                <th>Paid Amount</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => {
                const inst = installments.find(i => i.id === p.installmentId);
                return `
                  <tr>
                    <td>${p.productName}</td>
                    <td>${formatCurrency(p.amount, currency)}</td>
                    <td>${inst ? formatCurrency(inst.remainingAmount, currency) : 'N/A'}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td>TOTAL PAID</td>
                <td colspan="2">${formatCurrency(totalPaid, currency)}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 20px; text-align: right;">
            <div class="signature">Collector Signature</div>
          </div>

          <div class="footer">
            Software by MSF Digital Solutions (SMC-Private) Limited<br/>
            Thank you for your business!
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    // We use printAsync which opens the native print dialog
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Error printing receipt', error);
  }
};
