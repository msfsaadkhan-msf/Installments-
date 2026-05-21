import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getBusinessProfile, getAgreementTerms, getCurrencySetting } from '../services/storage';
import { formatCurrency } from '../theme';

export interface AgreementData {
  clientName: string;
  clientCnic: string;
  clientPhone: string;
  clientAddress: string;
  guarantor1Name: string;
  guarantor1Cnic: string;
  guarantor1Phone: string;
  guarantor1Address: string;
  guarantor2Name: string;
  guarantor2Cnic: string;
  guarantor2Phone: string;
  guarantor2Address: string;
  productName: string;
  productModel: string;
  productSerial: string;
  totalPrice: string;
  advancePayment: string;
  remainingBalance: string;
  installmentDuration: string;
  monthlyInstallment: string;
  clientPhoto?: string;
  clientCnicFront?: string;
  clientCnicBack?: string;
  guarantor1CnicFront?: string;
  guarantor1CnicBack?: string;
  guarantor2CnicFront?: string;
  guarantor2CnicBack?: string;
  productPhoto?: string;
  variants?: { label: string, value: string }[];
}

export const generateAndShareAgreementPDF = async (data: AgreementData) => {
  const [business, terms, currency] = await Promise.all([
    getBusinessProfile(),
    getAgreementTerms(),
    getCurrencySetting()
  ]);
  
  const businessName = business?.name || 'INSTALLMENT SERVICES';
  const businessLogo = business?.logo;
  const businessAddress = business?.address || 'Pakistan';
  const businessPhone = business?.phone || '';
  
  const currencyLabel = currency.split(' ')[0]; // e.g. "PKR" from "PKR (Rs)"

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
          .header-box { text-align: center; border-bottom: 2px solid #1a2a3a; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { width: 80px; height: 80px; margin-bottom: 10px; border-radius: 40px; }
          h1 { color: #1a2a3a; margin: 0; text-transform: uppercase; letter-spacing: 1.5px; font-size: 22px; }
          .biz-info { color: #666; font-size: 12px; margin-top: 5px; }
          h2 { font-size: 16px; background-color: #f4f4f4; padding: 8px; margin-top: 25px; border-left: 4px solid #d4af37; color: #1a2a3a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f9f9f9; width: 35%; font-weight: bold; color: #555; }
          td { font-weight: 500; }
          .signature-section { margin-top: 70px; display: flex; justify-content: space-between; }
          .signature-box { width: 30%; text-align: center; border-top: 1px solid #000; padding-top: 10px; margin-top: 40px; font-weight: bold; font-size: 14px; color: #666; }
          .date-row { text-align: right; font-weight: bold; margin-bottom: -10px; color: #555; }
        </style>
      </head>
      <body>
        <div class="header-box">
          ${businessLogo ? `<img src="${businessLogo}" class="logo" />` : ''}
          <h1>${businessName}</h1>
          <div class="biz-info">${businessAddress}${businessPhone ? ` | ${businessPhone}` : ''}</div>
        </div>
        
        <div class="date-row">Date: ${new Date().toLocaleDateString('en-GB')}</div>
        
        <h2>Client Details</h2>
        <table>
          <tr><th>Full Name</th><td>${data.clientName || 'N/A'}</td></tr>
          <tr><th>CNIC</th><td>${data.clientCnic || 'N/A'}</td></tr>
          <tr><th>Phone Number</th><td>${data.clientPhone || 'N/A'}</td></tr>
          <tr><th>Address</th><td>${data.clientAddress || 'N/A'}</td></tr>
        </table>

        <h2>Guarantor 1 Details</h2>
        <table>
          <tr><th>Name</th><td>${data.guarantor1Name || 'N/A'}</td></tr>
          <tr><th>CNIC</th><td>${data.guarantor1Cnic || 'N/A'}</td></tr>
          <tr><th>Phone Number</th><td>${data.guarantor1Phone || 'N/A'}</td></tr>
          <tr><th>Address</th><td>${data.guarantor1Address || 'N/A'}</td></tr>
        </table>

        <h2>Guarantor 2 Details</h2>
        <table>
          <tr><th>Name</th><td>${data.guarantor2Name || 'N/A'}</td></tr>
          <tr><th>CNIC</th><td>${data.guarantor2Cnic || 'N/A'}</td></tr>
          <tr><th>Phone Number</th><td>${data.guarantor2Phone || 'N/A'}</td></tr>
          <tr><th>Address</th><td>${data.guarantor2Address || 'N/A'}</td></tr>
        </table>

        <h2>Product Details</h2>
        <table>
          <tr><th>Product Name / Title</th><td>${data.productName || 'N/A'}</td></tr>
          <tr><th>Model</th><td>${data.productModel || 'N/A'}</td></tr>
          <tr><th>Serial / Engine Number</th><td>${data.productSerial || 'N/A'}</td></tr>
          ${data.variants?.map(v => `<tr><th>${v.label}</th><td>${v.value}</td></tr>`).join('') || ''}
        </table>

        <h2>Financial Details</h2>
        <table>
          <tr><th>Total Price (${currencyLabel})</th><td>${data.totalPrice || '0'}</td></tr>
          <tr><th>Advance Payment (${currencyLabel})</th><td>${data.advancePayment || '0'}</td></tr>
          <tr><th>Remaining Balance (${currencyLabel})</th><td>${data.remainingBalance || '0'}</td></tr>
          <tr><th>Installment Duration</th><td>${data.installmentDuration || '0'} Months</td></tr>
          <tr><th>Monthly Installment (${currencyLabel})</th><td>${data.monthlyInstallment || '0'}</td></tr>
        </table>

        <div style="margin-top: 40px; font-size: 13px; line-height: 1.6; color: #555;">
          <strong>Terms and Conditions:</strong> ${terms}
        </div>

        <div class="signature-section">
          <div class="signature-box">Client Signature</div>
          <div class="signature-box">Guarantor 1 Signature</div>
          <div class="signature-box">Authorized Signatory</div>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Agreement PDF' });
    } else {
      console.log('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error generating or sharing PDF', error);
  }
};
