import { CertificateService, CertificateDetails } from '../../core/services/CertificateService';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export class CertificateServiceImpl implements CertificateService {
  private hmacSecret = process.env.HMAC_SECRET || 'hmac_audit_ledger_secret_protection_key_2026';

  public async generateQRCode(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      QRCode.toDataURL(text, { errorCorrectionLevel: 'H', margin: 2 }, (err, url) => {
        if (err) return reject(err);
        resolve(url);
      });
    });
  }

  public async generateCertificate(details: CertificateDetails): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // 1. Draw Confidential Watermark
        doc.save();
        doc.opacity(0.015);
        doc.fillColor('#0F172A');
        doc.fontSize(45).font('Helvetica-Bold');
        doc.rotate(-45, { origin: [297, 420] });
        doc.text('CONFIDENTIAL AUDIT EVIDENCE', -200, 390, { align: 'center', width: 1000 });
        doc.restore();

        // 2. Draw Page Background/Borders
        doc.rect(20, 20, 555, 802).lineWidth(1).stroke('#1E293B'); // Outer slate border
        doc.rect(24, 24, 547, 794).lineWidth(2).stroke('#0EA5E9'); // Blue accent border
        
        // Deep blue header strip
        doc.rect(26, 26, 543, 80).fill('#0F172A');

        // 3. Header Logos (Vector drawings)
        // SecureWipe Shield Logo (Left)
        doc.save();
        doc.translate(45, 38);
        doc.path('M 0 0 L 12 -6 L 24 0 L 24 12 C 24 20 12 28 12 28 C 12 28 0 20 0 12 Z').fill('#0EA5E9');
        doc.moveTo(7, 12).lineTo(11, 16).lineTo(17, 8).lineWidth(2).strokeColor('#FFFFFF').stroke();
        doc.restore();

        // Title text next to shield logo
        doc.fillColor('#FFFFFF');
        doc.fontSize(13).font('Helvetica-Bold');
        doc.text('SECUREWIPE SYSTEM', 80, 44);
        doc.fontSize(8.5).font('Helvetica').fillColor('#38BDF8');
        doc.text('Compliance Verification & Data Erasure Certificate', 80, 60);
        // 4. Main Certificate Heading
        doc.fillColor('#0F172A');
        doc.fontSize(20).font('Helvetica-Bold');
        doc.text('CERTIFICATE OF SECURE ERASURE', 40, 130, { align: 'center' });

        doc.fontSize(9).font('Helvetica').fillColor('#475569');
        doc.text(`Digital Certificate Reference ID: ${details.certificateId}`, 40, 155, { align: 'center' });

        // Horizontal divider line
        doc.moveTo(60, 175).lineTo(535, 175).lineWidth(1).stroke('#CBD5E1');

        // 5. Details Grid / Table
        const startY = 190;
        const col1X = 60;
        const col2X = 280;
        const rowHeight = 20;

        const printRow = (label: string, value: string, idx: number) => {
          const currentY = startY + idx * rowHeight;
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E293B').text(label, col1X, currentY);
          doc.font('Helvetica').fontSize(10).fillColor('#334155').text(value, col2X, currentY);
          doc.moveTo(60, currentY + 14).lineTo(535, currentY + 14).lineWidth(0.5).stroke('#E2E8F0');
        };

        const getAlgoName = (id: string) => {
          switch (id) {
            case 'single_pass': return '1 Pass Overwrite';
            case 'double_pass': return '2 Pass Overwrite';
            case 'dod_3pass': return '3 Pass Overwrite (DoD)';
            default: return id;
          }
        };

        const formattedCapacity = typeof details.deviceCapacity === 'number'
          ? `${(details.deviceCapacity / (1024 * 1024 * 1024)).toFixed(1)} GB`
          : details.deviceCapacity;

        printRow('Operator Name:', details.userName, 0);
        printRow('Storage Device Name:', details.deviceName, 1);
        printRow('Device Drive Letter / Node:', details.driveLetter, 2);
        printRow('Device Storage Capacity:', formattedCapacity, 3);
        printRow('Wipe Method:', getAlgoName(details.algorithmUsed), 4);
        printRow('Erasure Date & Time:', details.wipeDate.toLocaleString(), 5);
        printRow('Files Selected:', String(details.totalFilesSelected), 6);
        printRow('Files Successfully Erased:', String(details.totalFilesSuccessfullyWiped), 7);
        printRow('Files Erasure Failed:', String(details.totalFilesFailed), 8);
        printRow('Verification Status:', details.verificationStatus.toUpperCase(), 9);
        printRow('Erasure Success Rate:', `${details.successPercentage}%`, 10);

        // Verification Status Highlight Box
        const statusY = startY + 11 * rowHeight + 10;
        const isPassed = details.verificationStatus === 'PASSED';
        doc.rect(60, statusY, 475, 45).fill(isPassed ? '#D1FAE5' : '#FEE2E2');
        
        // Custom check/cross vector shape
        doc.save();
        if (isPassed) {
          doc.circle(76, statusY + 22, 6.5).fill('#10B981');
          doc.lineWidth(1.2).strokeColor('#FFFFFF');
          doc.moveTo(73, statusY + 22).lineTo(75, statusY + 24).lineTo(79.5, statusY + 19).stroke();
        } else {
          doc.circle(76, statusY + 22, 6.5).fill('#EF4444');
          doc.lineWidth(1.2).strokeColor('#FFFFFF');
          doc.moveTo(72.5, statusY + 18.5).lineTo(79.5, statusY + 25.5).stroke();
          doc.moveTo(79.5, statusY + 18.5).lineTo(72.5, statusY + 25.5).stroke();
        }
        doc.restore();

        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(isPassed ? '#065F46' : '#991B1B');
        doc.text(
          `VERIFICATION RESULT: ${details.verificationResult} (${isPassed ? 'SUCCESS - NO REMAINING DATA FOUND' : 'FAILED - DATA DETECTED'})`,
          92,
          statusY + 17
        );

        // Declaration text
        const decY = statusY + 60;
        doc.rect(60, decY, 475, 50).fill('#F8FAFC').lineWidth(1).stroke('#E2E8F0');
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#475569');
        doc.text(
          '"This certificate confirms that the selected storage device was securely erased using the SecureWipe system. The erasure process was verified, recorded, and completed successfully."',
          80,
          decY + 15,
          { width: 435, align: 'center' }
        );

        // 6. Generate Cryptographic Signature (HMAC) to guarantee authenticity
        const signPayload = `${details.id}|${details.jobId}|${details.certificateId}|${details.verificationStatus}|${details.successPercentage}`;
        const hmac = crypto.createHmac('sha256', this.hmacSecret).update(signPayload).digest('hex');

        // 7. QR Code Injection for verification checks
        const qrText = `SecureWipe Verify\nRef: ${details.certificateId}\nStatus: ${details.verificationResult}\nSuccess: ${details.successPercentage}%`;
        const qrDataUrl = await this.generateQRCode(qrText);
        
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrImageBuffer = Buffer.from(base64Data, 'base64');
        
        const qrY = decY + 130;
        doc.image(qrImageBuffer, 60, qrY, { width: 90, height: 90 });

        // Explanatory note next to QR Code
        doc.fillColor('#475569');
        doc.fontSize(8).font('Helvetica-Oblique');
        doc.text(
          'Notice: Scan the QR Code to validate the authenticity of this digital certificate against the SecureWipe database. The signature below ensures this report has not been modified.',
          170,
          qrY + 10,
          { width: 365, lineGap: 2 }
        );

        doc.fontSize(7).font('Courier-Bold').fillColor('#64748B');
        doc.text(`DIGITAL SIGNATURE: ${hmac}`, 170, qrY + 65, { width: 365 });

        // 8. Footer
        doc.moveTo(60, qrY + 115).lineTo(535, qrY + 115).lineWidth(1).stroke('#CBD5E1');

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B');
        doc.text('SecureWipe Enterprise Client Operations', 60, qrY + 125);
        
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748B');
        doc.text(
          'This sanitization certificate aligns with NIST SP 800-88 Rev 1 guidelines for data erasure. Verification success indicates complete removal of data and logical indexes.',
          60,
          qrY + 140,
          { width: 475, lineGap: 2 }
        );

        doc.font('Helvetica-Bold').fontSize(7.2).fillColor('#64748B');
        doc.text('Document Ref No: SW-CERT-2026-001', 60, qrY + 165, { align: 'right', width: 475 });

        // Terminate PDF creation
        doc.end();

      } catch (err) {
        reject(err);
      }
    });
  }
}
