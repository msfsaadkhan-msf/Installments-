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
    
    // Load logo as base64
    let logoBase64 = '';
    if (business?.logo) {
      try {
        const base64 = await FileSystem.readAsStringAsync(business.logo, { encoding: 'base64' });
        logoBase64 = `data:image/png;base64,${base64}`;
      } catch (e) {
        console.warn('Could not load logo for PDF', e);
      }
    }

    // Calculate total price accurately
    const totalSalePrice = installment.totalAmount;
    const remainingBalance = totalSalePrice - installment.downPayment;

    const todayStr = formatDateSlash(installment.startDate);
    const invoiceNum = installment.invoiceNo || `INV-${installment.id.substring(0,6).toUpperCase()}`;
    const placeVal = installment.placeOfAgreement || business?.address?.split(',').pop()?.trim() || 'Charsadda';
    const currencyLabel = currency.split(' ')[0];

    const variantsHtml = (installment.variants && installment.variants.length > 0) 
      ? installment.variants.map(v => `
        <tr>
          <td style="padding:4px 8px; font-weight:bold; font-size:12px; width:30%; border-bottom:1px dashed #ccc;">${v.label}:</td>
          <td style="padding:4px 8px; font-size:12px; border-bottom:1px dashed #ccc;">${v.value}</td>
        </tr>`).join('') 
      : `
        <tr>
          <td style="padding:4px 8px; font-weight:bold; font-size:12px; width:30%; border-bottom:1px dashed #ccc;">Model/Color:</td>
          <td style="padding:4px 8px; font-size:12px; border-bottom:1px dashed #ccc;">${installment.productModel || ''}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px; font-weight:bold; font-size:12px; width:30%; border-bottom:1px dashed #ccc;">Serial/IMEI:</td>
          <td style="padding:4px 8px; font-size:12px; border-bottom:1px dashed #ccc;">${installment.productSerial || ''}</td>
        </tr>
      `;

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page { margin: 15mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #1B2A4A;
              font-size: 12px;
              line-height: 1.5;
              margin: 0;
              padding: 10px;
            }
            h1 { font-size: 26px; margin: 0; text-align:center; text-transform: uppercase; letter-spacing: 3px; color: #1B2A4A; }
            h3 { font-size: 14px; margin: 0 0 2px 0; text-align:center; }
            .section-heading {
              font-size: 13px;
              font-weight: bold;
              text-transform: uppercase;
              border-bottom: 2px solid #1B2A4A;
              padding-bottom: 3px;
              margin-top: 18px;
              margin-bottom: 8px;
            }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
            .info-table td { padding: 3px 6px; font-size: 12px; vertical-align: bottom; }
            .info-label { font-weight: bold; white-space: nowrap; width: 1%; padding-right: 4px; }
            .info-value { border-bottom: 1px dashed #888; }
            .hr { border: none; border-top: 2px solid #1B2A4A; margin: 8px 0 12px 0; }
          </style>
        </head>
        <body>
          <div style="text-align:center">
            ${logoBase64 ? `<img src="${logoBase64}" style="height: 60px; margin-bottom: 5px;" />` : ''}
            <h1 style="font-size: 20px; font-weight: bold;">${business?.name || 'FILZA CARE'}</h1>
            <p style="font-weight:bold; font-size:13px; text-transform:uppercase; margin:4px 0;">CUSTOMER &amp; GUARANTOR INVOICE / RECEIPT</p>
          </div>
          <hr class="hr" />

          <table style="width:100%; margin-bottom:12px;">
            <tr>
              <td style="text-align:left; font-weight:bold; font-size:11px;">Invoice No: ${invoiceNum}</td>
              <td style="text-align:center; font-weight:bold; font-size:11px;">Issue Date: ${todayStr}</td>
              <td style="text-align:right; font-weight:bold; font-size:11px;">Place of Agreement: ${placeVal}</td>
            </tr>
          </table>

          <div class="section-heading">1) Customer Information</div>
          <table class="info-table">
            <tr>
              <td class="info-label">Customer Name:</td>
              <td class="info-value">${client.name || ''}</td>
              <td class="info-label" style="padding-left:15px;">Father's Name:</td>
              <td class="info-value">${client.fatherName || ''}</td>
            </tr>
          </table>
          <table class="info-table">
            <tr>
              <td class="info-label">CNIC No:</td>
              <td class="info-value">${client.cnic || ''}</td>
              <td class="info-label" style="padding-left:15px;">Mobile No:</td>
              <td class="info-value">${client.phone || ''}</td>
            </tr>
          </table>
          <table class="info-table">
            <tr>
              <td class="info-label">Address:</td>
              <td class="info-value" colspan="3">${client.address || ''}</td>
            </tr>
          </table>

          <div class="section-heading">2) Product Details</div>
          <table class="info-table">
            <tr>
              <td class="info-label">Product Name:</td>
              <td class="info-value" colspan="3">${installment.productName || ''}</td>
            </tr>
          </table>
          <table class="info-table">${variantsHtml}</table>

          <div class="section-heading">3) Payment Summary</div>
          <table class="info-table">
            <tr>
              <td class="info-label">Sale Price:</td>
              <td class="info-value">${formatCurrency(totalSalePrice, currency)}</td>
              <td class="info-label" style="padding-left:15px;">Down Payment:</td>
              <td class="info-value">${formatCurrency(installment.downPayment, currency)}</td>
            </tr>
          </table>
          <table class="info-table">
            <tr>
              <td class="info-label">Remaining Balance:</td>
              <td class="info-value">${formatCurrency(remainingBalance, currency)}</td>
              <td class="info-label" style="padding-left:15px;">Inst. Plan:</td>
              <td class="info-value">${installment.tenure} Months</td>
            </tr>
          </table>
          <table class="info-table">
            <tr>
              <td class="info-label">Plan Start Date:</td>
              <td class="info-value">${installment.startDate ? formatDateSlash(installment.startDate) : ''}</td>
              <td class="info-label" style="padding-left:15px;">Plan End Date:</td>
              <td class="info-value">${installment.installmentEndDate ? formatDateSlash(installment.installmentEndDate) : ''}</td>
            </tr>
          </table>

          <div class="section-heading">4) Guarantors</div>
          <table class="info-table">
            <tr>
              <td class="info-label">Guarantor 1:</td>
              <td class="info-value">${installment.guarantor1Name || ''}</td>
              <td class="info-label" style="padding-left:15px;">Father's Name:</td>
              <td class="info-value">${installment.guarantor1FatherName || ''}</td>
            </tr>
          </table>
          <table class="info-table">
            <tr>
              <td class="info-label">CNIC:</td>
              <td class="info-value">${installment.guarantor1Cnic || ''}</td>
              <td class="info-label" style="padding-left:15px;">Phone:</td>
              <td class="info-value">${installment.guarantor1Phone || ''}</td>
            </tr>
          </table>
          <table class="info-table">
            <tr>
              <td class="info-label">Address:</td>
              <td class="info-value" colspan="3">${installment.guarantor1Address || ''}</td>
            </tr>
          </table>
          <div style="height:8px;"></div>
          <table class="info-table">
            <tr>
              <td class="info-label">Guarantor 2:</td>
              <td class="info-value">${installment.guarantor2Name || ''}</td>
              <td class="info-label" style="padding-left:15px;">Father's Name:</td>
              <td class="info-value">${installment.guarantor2FatherName || ''}</td>
            </tr>
          </table>
          <table class="info-table">
            <tr>
              <td class="info-label">CNIC:</td>
              <td class="info-value">${installment.guarantor2Cnic || ''}</td>
              <td class="info-label" style="padding-left:15px;">Phone:</td>
              <td class="info-value">${installment.guarantor2Phone || ''}</td>
            </tr>
          </table>
          <table class="info-table">
            <tr>
              <td class="info-label">Address:</td>
              <td class="info-value" colspan="3">${installment.guarantor2Address || ''}</td>
            </tr>
          </table>

          <div class="section-heading">5) Declaration / Agreement</div>
          <div style="font-size:11px; text-align:justify; line-height:1.6; margin-top:6px;">${(terms || '')
            .replace(/\*{1,2}(.+?)\*{1,2}/g, '<b style="font-size:12px; display:block; margin-top:10px;">$1</b>')
            .replace(/<b>(.+?)<\/b>/gi, '<b style="font-size:12px; display:block; margin-top:10px;">$1</b>')
            .replace(/\n/g, '<br/>')}
          </div>

          <!-- SIGNATURES & THUMBPRINTS SECTION -->
          <div style="page-break-inside: avoid; margin-top:30px;">
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="width:25%; text-align:center; padding:2px;">
                  <table style="margin:0 auto; border:2px solid #1B2A4A; width:75px; height:45px;">
                    <tr><td style="width:75px; height:45px;">&nbsp;</td></tr>
                  </table>
                  <p style="font-size:9px; font-weight:bold; text-transform:uppercase; margin:6px 0 0 0;">Guarantor 1 Thumb</p>
                </td>
                <td style="width:25%; text-align:center; padding:2px;">
                  <table style="margin:0 auto; border:2px solid #1B2A4A; width:75px; height:45px;">
                    <tr><td style="width:75px; height:45px;">&nbsp;</td></tr>
                  </table>
                  <p style="font-size:9px; font-weight:bold; text-transform:uppercase; margin:6px 0 0 0;">Guarantor 2 Thumb</p>
                </td>
                <td style="width:25%; text-align:center; padding:2px;">
                  <table style="margin:0 auto; border:2px solid #1B2A4A; width:75px; height:45px;">
                    <tr><td style="width:75px; height:45px;">&nbsp;</td></tr>
                  </table>
                  <p style="font-size:9px; font-weight:bold; text-transform:uppercase; margin:6px 0 0 0; border-top:2px solid #1B2A4A; padding-top:4px;">Customer Sig &amp; Thumb</p>
                </td>
                <td style="width:25%; text-align:center; padding:2px;">
                  <table style="margin:0 auto; width:100px; height:45px;">
                    <tr><td style="width:100px; height:45px;">&nbsp;</td></tr>
                  </table>
                  <p style="font-size:9px; font-weight:bold; text-transform:uppercase; margin:6px 0 0 0; border-top:2px solid #1B2A4A; padding-top:4px;">Company Stamp &amp; Sig</p>
                </td>
              </tr>
            </table>
          </div>

          <div style="margin-top:25px; padding-top:8px; border-top:1px solid #ccc; text-align:center; font-size:11px;">
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
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    if (error?.message?.includes('LoadBundleFromServerRequestError')) {
      Alert.alert('Connection Error', 'Failed to communicate with the development server. Please check your Wi-Fi or restart the Expo server.');
    } else {
      Alert.alert('PDF Error', 'An unexpected error occurred while generating the agreement.');
    }
    throw error;
  } finally {
    isGenerating = false;
  }
}
