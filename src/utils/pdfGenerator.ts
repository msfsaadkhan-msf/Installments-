import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getBusinessProfile, getAgreementTerms, getCurrencySetting } from '../services/storage';
import { formatCurrency } from '../theme';

export interface AgreementData {
  clientName: string;
  fatherName?: string;
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
  invoiceNo?: string;
  place?: string;
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
  const businessAddress = business?.address || '';
  const businessPhone = business?.phone || '';
  const businessEmail = business?.email || '';

  let logoBase64 = '';
  if (business?.logo) {
    try {
      const base64 = await FileSystem.readAsStringAsync(business.logo, { encoding: 'base64' });
      logoBase64 = `data:image/png;base64,${base64}`;
    } catch (e) {
      console.warn('Could not load logo for PDF', e);
    }
  }
  
  const currencyLabel = currency.split(' ')[0];
  const today = new Date().toLocaleDateString('en-GB');

  const invoiceNum = data.invoiceNo || ('INV-' + today.replace(/\//g, '') + Math.floor(Math.random()*1000));
  const placeVal = data.place || businessAddress.split(',').pop()?.trim() || '';

  const variantsHtml = (data.variants && data.variants.length > 0) 
    ? data.variants.map(v => `
      <tr>
        <td style="padding:4px 8px; font-weight:bold; font-size:12px; width:30%; border-bottom:1px dashed #ccc;">${v.label}:</td>
        <td style="padding:4px 8px; font-size:12px; border-bottom:1px dashed #ccc;">${v.value}</td>
      </tr>`).join('') 
    : '';

  const html = `
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
          h1 { font-size: 26px; margin: 0; text-transform: uppercase; letter-spacing: 3px; color: #1B2A4A; }
          h3 { font-size: 14px; margin: 0 0 2px 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .underline { text-decoration: underline; }
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

          .sig-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .sig-table td { padding: 10px; text-align: center; vertical-align: bottom; width: 50%; }
          .thumb-box-area {
            width: 110px;
            height: 65px;
            border: 2px solid #1B2A4A;
            margin: 0 auto 6px auto;
          }
          .sig-line {
            border-top: 1.5px solid #1B2A4A;
            padding-top: 6px;
            margin-top: 30px;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
          }
          .footer-section {
            margin-top: 25px;
            padding-top: 8px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 11px;
          }
          .hr { border: none; border-top: 2px solid #1B2A4A; margin: 8px 0 12px 0; }
        </style>
      </head>
      <body>

        <!-- ═══════ HEADER ═══════ -->
        <div class="center">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 60px; margin-bottom: 10px;" />` : `<h1>${businessName}</h1>`}
          <p class="bold" style="font-size:13px; text-transform:uppercase; margin:4px 0;">CUSTOMER &amp; GUARANTOR INVOICE / RECEIPT</p>
        </div>
        <hr class="hr" />

        <!-- ═══════ META ROW ═══════ -->
        <table style="width:100%; margin-bottom:12px;">
          <tr>
            <td style="text-align:left; font-weight:bold; font-size:11px;">Invoice No: ${invoiceNum}</td>
            <td style="text-align:center; font-weight:bold; font-size:11px;">Issue Date: ${today}</td>
            <td style="text-align:right; font-weight:bold; font-size:11px;">Place of Agreement: ${placeVal}</td>
          </tr>
        </table>

        <!-- ═══════ 1) CUSTOMER INFORMATION ═══════ -->
        <div class="section-heading">1) Customer Information</div>
        <table class="info-table">
          <tr>
            <td class="info-label">Customer Name:</td>
            <td class="info-value">${data.clientName || ''}</td>
            <td class="info-label" style="padding-left:15px;">Father's Name:</td>
            <td class="info-value">${data.fatherName || ''}</td>
          </tr>
        </table>
        <table class="info-table">
          <tr>
            <td class="info-label">CNIC No:</td>
            <td class="info-value">${data.clientCnic || ''}</td>
            <td class="info-label" style="padding-left:15px;">Mobile No:</td>
            <td class="info-value">${data.clientPhone || ''}</td>
          </tr>
        </table>
        <table class="info-table">
          <tr>
            <td class="info-label">Address:</td>
            <td class="info-value" colspan="3">${data.clientAddress || ''}</td>
          </tr>
        </table>

        <!-- ═══════ 2) PRODUCT DETAILS ═══════ -->
        <div class="section-heading">2) Product Details</div>
        <table class="info-table">
          <tr>
            <td class="info-label">Product Name:</td>
            <td class="info-value">${data.productName || ''}</td>
            <td class="info-label" style="padding-left:15px;">Model:</td>
            <td class="info-value">${data.productModel || ''}</td>
          </tr>
        </table>
        <table class="info-table">
          <tr>
            <td class="info-label">Serial / Engine:</td>
            <td class="info-value" colspan="3">${data.productSerial || ''}</td>
          </tr>
        </table>
        ${variantsHtml ? `<table class="info-table" style="margin-top:4px;">${variantsHtml}</table>` : ''}

        <!-- ═══════ 3) PAYMENT SUMMARY ═══════ -->
        <div class="section-heading">3) Payment Summary</div>
        <table class="info-table">
          <tr>
            <td class="info-label">Sale Price:</td>
            <td class="info-value">${currencyLabel} ${data.totalPrice || '0'}</td>
            <td class="info-label" style="padding-left:15px;">Down Payment:</td>
            <td class="info-value">${currencyLabel} ${data.advancePayment || '0'}</td>
          </tr>
        </table>
        <table class="info-table">
          <tr>
            <td class="info-label">Remaining Balance:</td>
            <td class="info-value">${currencyLabel} ${data.remainingBalance || '0'}</td>
            <td class="info-label" style="padding-left:15px;">Inst. Plan:</td>
            <td class="info-value">${data.installmentDuration || '0'} Months</td>
          </tr>
        </table>
        <table class="info-table">
          <tr>
            <td class="info-label">Monthly Installment:</td>
            <td class="info-value">${currencyLabel} ${data.monthlyInstallment || '0'}</td>
            <td colspan="2"></td>
          </tr>
        </table>

        <!-- ═══════ 4) GUARANTORS ═══════ -->
        <div class="section-heading">4) Guarantors</div>
        <table class="info-table">
          <tr>
            <td class="info-label">Guarantor 1:</td>
            <td class="info-value">${data.guarantor1Name || ''}</td>
            <td class="info-label" style="padding-left:15px;">CNIC:</td>
            <td class="info-value">${data.guarantor1Cnic || ''}</td>
          </tr>
        </table>
        <table class="info-table">
          <tr>
            <td class="info-label">Address 1:</td>
            <td class="info-value">${data.guarantor1Address || ''}</td>
            <td class="info-label" style="padding-left:15px;">Phone:</td>
            <td class="info-value">${data.guarantor1Phone || ''}</td>
          </tr>
        </table>
        <div style="height:8px;"></div>
        <table class="info-table">
          <tr>
            <td class="info-label">Guarantor 2:</td>
            <td class="info-value">${data.guarantor2Name || ''}</td>
            <td class="info-label" style="padding-left:15px;">CNIC:</td>
            <td class="info-value">${data.guarantor2Cnic || ''}</td>
          </tr>
        </table>
        <table class="info-table">
          <tr>
            <td class="info-label">Address 2:</td>
            <td class="info-value">${data.guarantor2Address || ''}</td>
            <td class="info-label" style="padding-left:15px;">Phone:</td>
            <td class="info-value">${data.guarantor2Phone || ''}</td>
          </tr>
        </table>

        <!-- ═══════ 5) DECLARATION / AGREEMENT ═══════ -->
        <div class="section-heading">5) Customer &amp; Guarantor Declaration / Agreement</div>
        <div style="font-size:11px; text-align:justify; line-height:1.6; margin-top:6px;">
          ${terms}
        </div>

        <!-- ═══════ SIGNATURES & THUMBPRINTS SECTION ═══════ -->
        <div style="page-break-inside: avoid;">
          <!-- ═══════ GUARANTOR THUMBPRINTS ═══════ -->
          <table style="width:100%; border-collapse:collapse; margin-top:40px;">
            <tr>
              <td style="width:50%; text-align:center; padding:10px;">
                <table style="margin:0 auto; border:2px solid #1B2A4A; width:120px; height:70px;">
                  <tr><td style="width:120px; height:70px;">&nbsp;</td></tr>
                </table>
                <p style="font-size:11px; font-weight:bold; text-transform:uppercase; margin:8px 0 0 0;">Guarantor 1 Thumb</p>
              </td>
              <td style="width:50%; text-align:center; padding:10px;">
                <table style="margin:0 auto; border:2px solid #1B2A4A; width:120px; height:70px;">
                  <tr><td style="width:120px; height:70px;">&nbsp;</td></tr>
                </table>
                <p style="font-size:11px; font-weight:bold; text-transform:uppercase; margin:8px 0 0 0;">Guarantor 2 Thumb</p>
              </td>
            </tr>
          </table>

          <!-- ═══════ CUSTOMER & COMPANY SIGNATURE ═══════ -->
          <table style="width:100%; border-collapse:collapse; margin-top:30px;">
            <tr>
              <td style="width:50%; text-align:center; padding:10px;">
                <table style="margin:0 auto; border:2px solid #1B2A4A; width:120px; height:70px;">
                  <tr><td style="width:120px; height:70px;">&nbsp;</td></tr>
                </table>
                <p style="font-size:11px; font-weight:bold; text-transform:uppercase; margin:8px 0 0 0; border-top:2px solid #1B2A4A; padding-top:6px;">Customer Signature &amp; Thumb</p>
              </td>
              <td style="width:50%; text-align:center; padding:10px;">
                <table style="margin:0 auto; width:120px; height:70px;">
                  <tr><td style="width:120px; height:70px;">&nbsp;</td></tr>
                </table>
                <p style="font-size:11px; font-weight:bold; text-transform:uppercase; margin:8px 0 0 0; border-top:2px solid #1B2A4A; padding-top:6px;">Company Stamp &amp; Signature</p>
              </td>
            </tr>
          </table>
        </div>

        <!-- ═══════ FOOTER ═══════ -->
        <div class="footer-section">
          ${businessEmail ? `<p style="margin:2px 0;">Email: ${businessEmail}${businessPhone ? ' | Phone: ' + businessPhone : ''}</p>` : (businessPhone ? `<p style="margin:2px 0;">Phone: ${businessPhone}</p>` : '')}
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
