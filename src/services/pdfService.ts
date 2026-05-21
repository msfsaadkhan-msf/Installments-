import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { Installment, Client } from '../types';
import { formatCurrency } from '../theme';
import { formatDateSlash } from '../utils/date';
import { getBusinessProfile, getCurrencySetting, getAgreementTerms } from './storage';

const MAIN_FOLDER = 'IMS by MSF';
let isGenerating = false;

export async function generateAgreementPDF(installment: Installment, clientData?: Client) {
  if (isGenerating) {
    console.warn('PDF generation already in progress');
    return;
  }
  
  isGenerating = true;
  try {
    let client = clientData;
    if (!client) {
      const { getClients } = await import('./storage');
      const clients = await getClients();
      client = clients.find(c => c.id === installment.clientId);
    }

    if (!client) {
      Alert.alert('Error', 'Client data not found for this installment.');
      return;
    }

    const business = await getBusinessProfile();
    const currency = await getCurrencySetting();
    const terms = await getAgreementTerms();
    
    // Calculate total price accurately
    const totalSalePrice = installment.totalAmount;
    const remainingBalance = totalSalePrice - installment.downPayment;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #000; font-size: 11px; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #1a237e; letter-spacing: 2px; }
            .business-name { font-size: 16px; font-weight: bold; margin-top: 10px; text-transform: uppercase; }
            .form-title { font-size: 14px; font-weight: bold; margin-top: 5px; margin-bottom: 20px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 5px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #000; width: fit-content; padding-right: 10px; }
            .row { display: flex; flex-direction: row; margin-bottom: 8px; }
            .field { display: flex; flex-direction: row; flex: 1; align-items: baseline; }
            .label { font-weight: bold; margin-right: 5px; white-space: nowrap; }
            .value { border-bottom: 1px dotted #666; flex: 1; min-height: 14px; padding-left: 5px; color: #333; }
            .declaration { margin-top: 15px; line-height: 1.5; text-align: justify; }
            .signature-section { margin-top: 40px; }
            .signature-row { display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 25px; }
            .signature-box { width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-weight: bold; font-size: 10px; }
            .footer { margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">FILZA CARE</div>
            <div class="business-name">${business?.name || 'FILZA CARE INSTALLMENT SERVICES'}</div>
            <div class="form-title">CUSTOMER & GUARANTOR INVOICE / RECEIPT</div>
          </div>
          <div class="meta-row">
            <div>Invoice No: <b>INV-${installment.id.substring(0,6).toUpperCase()}</b></div>
            <div>Issue Date: <b>${formatDateSlash(installment.startDate)}</b></div>
            <div>Place: <b>${installment.placeOfAgreement || 'Main Office'}</b></div>
          </div>
          <div class="section">
            <div class="section-title">1) CUSTOMER INFORMATION</div>
            <div class="row">
              <div class="field" style="flex: 1.2;"><span class="label">Customer Name:</span><span class="value">${client.name}</span></div>
              <div class="field"><span class="label">Father's Name:</span><span class="value">${client.fatherName || ''}</span></div>
            </div>
            <div class="row">
              <div class="field"><span class="label">CNIC No:</span><span class="value">${client.cnic}</span></div>
              <div class="field"><span class="label">Mobile No:</span><span class="value">${client.phone}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">2) PRODUCT DETAILS</div>
            <div class="row">
              <div class="field"><span class="label">Product Name:</span><span class="value">${installment.productName}</span></div>
              <div class="field"><span class="label">Model:</span><span class="value">${installment.productModel || ''}</span></div>
            </div>
            ${installment.variants?.map((v, i) => {
              if (i % 2 === 0) {
                const next = installment.variants && installment.variants[i+1];
                return `
                  <div class="row">
                    <div class="field"><span class="label">${v.label}:</span><span class="value">${v.value}</span></div>
                    ${next ? `<div class="field"><span class="label">${next.label}:</span><span class="value">${next.value}</span></div>` : '<div class="field"></div>'}
                  </div>
                `;
              }
              return '';
            }).join('') || `
              <div class="row">
                <div class="field"><span class="label">Color:</span><span class="value">${installment.color || ''}</span></div>
                <div class="field"><span class="label">S/N:</span><span class="value">${installment.productSerial || ''}</span></div>
              </div>
            `}
          </div>
          <div class="section">
            <div class="section-title">3) PAYMENT SUMMARY</div>
            <div class="row">
              <div class="field"><span class="label">Sale Price:</span><span class="value">${formatCurrency(totalSalePrice, currency)}</span></div>
              <div class="field"><span class="label">Down Payment:</span><span class="value">${formatCurrency(installment.downPayment, currency)}</span></div>
            </div>
            <div class="row">
              <div class="field"><span class="label">Balance:</span><span class="value">${formatCurrency(remainingBalance, currency)}</span></div>
              <div class="field"><span class="label">Inst. Plan:</span><span class="value">${installment.tenure} Months</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">4) GUARANTORS</div>
            <div class="row">
              <div class="field"><span class="label">Guarantor 1:</span><span class="value">${installment.guarantor1Name || ''}</span></div>
              <div class="field"><span class="label">CNIC:</span><span class="value">${installment.guarantor1Cnic || ''}</span></div>
            </div>
            <div class="row">
              <div class="field"><span class="label">Address 1:</span><span class="value">${installment.guarantor1Address || ''}</span></div>
            </div>
            <div style="margin-top: 10px;"></div>
            <div class="row">
              <div class="field"><span class="label">Guarantor 2:</span><span class="value">${installment.guarantor2Name || ''}</span></div>
              <div class="field"><span class="label">CNIC:</span><span class="value">${installment.guarantor2Cnic || ''}</span></div>
            </div>
            <div class="row">
              <div class="field"><span class="label">Address 2:</span><span class="value">${installment.guarantor2Address || ''}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">5) CUSTOMER & GUARANTOR DECLARATION / AGREEMENT</div>
            <div class="declaration">
              ${terms}
            </div>
          </div>
          <div class="signature-section">
            <div class="signature-row">
              <div class="signature-box">Customer Signature</div>
              <div class="signature-box">Company Stamp</div>
            </div>
          </div>
          <div class="footer">
            Email: ${business?.email || 'carefilza@gmail.com'} | Phone: ${business?.phone || '0333-2914553'}
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    const sanitizedName = client.name.replace(/[^a-z0-9]/gi, '_').trim();
    const targetDir = `${FileSystem.documentDirectory}${MAIN_FOLDER}/${sanitizedName}/`;
    
    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }

    const finalPath = `${targetDir}agreement_${installment.id.substring(0,6)}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: finalPath });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(finalPath, { UTI: '.pdf', mimeType: 'application/pdf' });
    } else {
      Alert.alert('Success', 'PDF generated and saved.');
    }
    
    return finalPath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    isGenerating = false;
  }
}
