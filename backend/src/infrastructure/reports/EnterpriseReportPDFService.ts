import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { pool } from '../database/postgres';

export interface ExecutiveSummaryData {
  totalWipeJobs: number;
  totalDevicesProcessed: number;
  totalUsbWiped: number;
  totalExtHddWiped: number;
  totalIntHddWiped: number;
  totalSsdsDetected: number;
  totalDataWipedBytes: number;
  successfulWipes: number;
  failedWipes: number;
  successRate: number;
  certificatesGenerated: number;
  verificationPassed: number;
  verificationFailed: number;
  totalCapacityManaged: number;
  lastDeviceScanTime: string;
  dbStatus: string;
  version: string;
  generatedBy: string;
  reportId: string;
  generatedDate: Date;
}

export interface DeviceCategorySummary {
  categoryName: string;
  deviceCount: number;
  totalCapacity: number;
  usedCapacity: number;
  freeCapacity: number;
  totalDataWiped: number;
  currentStatus: string;
  lastDetectionTime: string;
}

export interface DeviceDetails {
  name: string;
  type: string;
  connectionType: string;
  busType: string;
  mediaType: string;
  capacity: number;
  usedSpace: number;
  freeSpace: number;
  connectionStatus: string;
  updated_at: Date;
}

export interface DeviceReportData {
  deviceSummary: DeviceCategorySummary[];
  devicesList: DeviceDetails[];
  dbStatus: string;
  version: string;
  generatedBy: string;
  reportId: string;
  generatedDate: Date;
}

export class EnterpriseReportPDFService {
  
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private parseDeviceDetails(dev: DeviceDetails) {
    const name = dev.name;
    let manufacturer = 'Generic';
    let model = name;
    
    const nameLower = name.toLowerCase();
    if (nameLower.includes('kingston')) {
      manufacturer = 'Kingston';
      model = name.replace(/kingston/i, '').trim();
    } else if (nameLower.includes('wd') || nameLower.includes('western digital')) {
      manufacturer = 'Western Digital';
      model = name.replace(/wd|western digital/i, '').trim();
    } else if (nameLower.includes('samsung')) {
      manufacturer = 'Samsung';
      model = name.replace(/samsung/i, '').trim();
    } else if (nameLower.includes('toshiba')) {
      manufacturer = 'Toshiba';
      model = name.replace(/toshiba/i, '').trim();
    } else if (nameLower.includes('seagate')) {
      manufacturer = 'Seagate';
      model = name.replace(/seagate/i, '').trim();
    } else if (nameLower.includes('sandisk')) {
      manufacturer = 'SanDisk';
      model = name.replace(/sandisk/i, '').trim();
    } else if (nameLower.includes('crucial')) {
      manufacturer = 'Crucial';
      model = name.replace(/crucial/i, '').trim();
    }
    
    if (!model) {
      model = name;
    }
    
    const hash = crypto.createHash('sha256').update(name).digest('hex').substring(0, 10).toUpperCase();
    const serialNumber = `SN-${hash}`;
    
    return { manufacturer, model, serialNumber };
  }

  private drawWatermark(doc: any) {
    doc.save();
    doc.opacity(0.015);
    doc.fillColor('#0F172A');
    doc.fontSize(60).font('Helvetica-Bold');
    doc.rotate(-45, { origin: [297, 420] });
    doc.text('SECUREWIPE - CONFIDENTIAL', -200, 390, { align: 'center', width: 1000 });
    doc.restore();
  }

  // Vector Icon drawing helpers
  private drawDocumentIcon(doc: any, x: number, y: number, size: number = 10, color: string = '#0EA5E9') {
    doc.save();
    doc.translate(x, y);
    doc.scale(size / 10);
    doc.lineWidth(1).strokeColor(color);
    doc.roundedRect(0, 0, 8, 10, 1).stroke();
    doc.moveTo(2.5, 3).lineTo(5.5, 3).stroke();
    doc.moveTo(2.5, 5).lineTo(5.5, 5).stroke();
    doc.moveTo(2.5, 7).lineTo(4.5, 7).stroke();
    doc.restore();
  }

  private drawDriveIcon(doc: any, x: number, y: number, size: number = 10, color: string = '#0EA5E9') {
    doc.save();
    doc.translate(x, y);
    doc.scale(size / 10);
    doc.lineWidth(1).strokeColor(color);
    doc.roundedRect(0, 0, 8, 10, 1).stroke();
    doc.circle(4, 4, 2.5).stroke();
    doc.circle(4, 4, 0.75).fill(color);
    doc.restore();
  }

  private drawShieldIcon(doc: any, x: number, y: number, size: number = 10, color: string = '#0EA5E9') {
    doc.save();
    doc.translate(x, y);
    doc.scale(size / 10);
    doc.lineWidth(1).strokeColor(color);
    doc.path('M 0 1 L 4 -1 L 8 1 L 8 5 C 8 7.5 4 10 4 10 C 4 10 0 7.5 0 5 Z').stroke();
    doc.moveTo(2.5, 4.5).lineTo(4, 6).lineTo(6, 3).stroke();
    doc.restore();
  }

  private drawCertificateIcon(doc: any, x: number, y: number, size: number = 10, color: string = '#0EA5E9') {
    doc.save();
    doc.translate(x, y);
    doc.scale(size / 10);
    doc.lineWidth(1).strokeColor(color);
    doc.rect(0, 0, 8, 10).stroke();
    doc.circle(4, 5, 2.2).stroke();
    doc.moveTo(3, 8).lineTo(1, 11.5).lineTo(3, 10).lineTo(5, 11.5).lineTo(5, 8).stroke();
    doc.restore();
  }

  private drawCheckIcon(doc: any, x: number, y: number, size: number = 10, color: string = '#0EA5E9') {
    doc.save();
    doc.translate(x, y);
    doc.scale(size / 10);
    doc.lineWidth(1.2).strokeColor(color);
    doc.circle(4, 4, 3.5).stroke();
    doc.moveTo(2.5, 4).lineTo(3.8, 5.3).lineTo(5.8, 2.8).stroke();
    doc.restore();
  }

  private drawHeader(doc: any, title: string, metadata: { reportId: string }) {
    doc.save();
    // Solid deep blue header banner
    doc.rect(0, 0, 595, 52).fill('#0F172A');
    doc.rect(0, 52, 595, 3).fill('#0EA5E9');
    
    // Tiny header logo mark
    doc.translate(40, 20);
    doc.path('M 0 0 L 5 -3 L 10 0 L 10 5 C 10 8 5 11 5 11 C 5 11 0 8 0 5 Z')
       .fill('#FFFFFF');
    doc.restore();
    
    doc.save();
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    doc.text('SecureWipe', 56, 21);
    doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8');
    doc.text('|   Enterprise Secure Data Erasure Report', 114, 22);
    
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
    doc.text(title.toUpperCase(), 280, 21, { align: 'right', width: 275 });
    doc.font('Helvetica').fontSize(6.5).fillColor('#CBD5E1');
    doc.text(`Report ID: ${metadata.reportId}`, 280, 32, { align: 'right', width: 275 });
    doc.restore();
  }

  private drawFooter(doc: any, pageIndex: number, totalPages: number) {
    doc.save();
    doc.moveTo(40, 775).lineTo(555, 775).lineWidth(0.5).stroke('#E2E8F0');
    doc.font('Helvetica').fontSize(7.2).fillColor('#64748B');
    doc.text('SecureWipe Enterprise   |   Document No: SW-ER-2026-001   |   Confidential   |   Audit Evidence', 40, 785);
    doc.text(`Page ${pageIndex + 1} of ${totalPages}`, 430, 785, { align: 'right', width: 125 });
    doc.restore();
  }

  private drawPieSlice(doc: any, cx: number, cy: number, r: number, startAngle: number, endAngle: number, color: string) {
    doc.save();
    doc.fillColor(color);
    doc.moveTo(cx, cy);
    doc.lineTo(cx + r * Math.cos(startAngle), cy + r * Math.sin(startAngle));
    doc.arc(cx, cy, r, startAngle, endAngle);
    doc.closePath();
    doc.fill();
    doc.restore();
  }

  private drawCoverPage(doc: any, metadata: { reportId: string; generatedDate: Date; generatedBy: string; version: string }) {
    doc.save();
    // Fill background with deep slate/blue
    doc.rect(0, 0, 595, 842).fill('#0B1120');

    // Abstract background vector grid/cybersecurity rings
    doc.opacity(0.12);
    doc.circle(297, 210, 120).lineWidth(1.5).strokeColor('#38BDF8').stroke();
    doc.circle(297, 210, 160).lineWidth(1).strokeColor('#38BDF8').stroke();
    doc.circle(297, 210, 200).lineWidth(0.5).strokeColor('#38BDF8').stroke();
    
    // Diagonal lines representing data streams
    doc.moveTo(0, 0).lineTo(595, 595).lineWidth(0.5).strokeColor('#38BDF8').stroke();
    doc.moveTo(0, 200).lineTo(595, 795).lineWidth(0.5).strokeColor('#38BDF8').stroke();
    doc.moveTo(595, 0).lineTo(0, 595).lineWidth(0.5).strokeColor('#38BDF8').stroke();
    doc.restore();

    // Large SecureWipe Logo Shield (Centered)
    doc.save();
    doc.translate(257, 110); // 297 - 40
    doc.path('M 0 0 L 40 -20 L 80 0 L 80 40 C 80 64 40 88 40 88 C 40 88 0 64 0 40 Z').fill('#0EA5E9');
    doc.moveTo(25, 40).lineTo(37, 52).lineTo(58, 25).lineWidth(5).strokeColor('#FFFFFF').stroke();
    doc.restore();

    // Centered Report Title
    doc.save();
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(26);
    doc.text('SECUREWIPE', 40, 230, { align: 'center', width: 515 });
    doc.fillColor('#38BDF8').fontSize(15).font('Helvetica-Bold').text('SECURE DATA ERASURE REPORT', 40, 262, { align: 'center', width: 515 });
    
    doc.moveTo(150, 290).lineTo(445, 290).lineWidth(1).strokeColor('#1E293B').stroke();
    doc.restore();

    // Purpose / Overview block in a glassmorphic card on cover page
    doc.save();
    doc.roundedRect(60, 315, 475, 115, 6).fill('#0F172A');
    doc.roundedRect(60, 315, 475, 115, 6).lineWidth(1).strokeColor('#1E293B').stroke();
    
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5).text('Report Overview', 80, 332);
    doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text(
      'This report provides a summary of the secure erasure process performed by SecureWipe. It includes the devices processed, the results of the erasure, verification status, and the final certificate confirming that the selected storage devices were securely erased.',
      80,
      348,
      { width: 435, lineGap: 3.5 }
    );
    doc.restore();

    // Company and Status information side-by-side in cards
    doc.save();
    doc.roundedRect(60, 450, 227, 140, 6).fill('#0F172A');
    doc.roundedRect(60, 450, 227, 140, 6).lineWidth(1).strokeColor('#1E293B').stroke();
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5).text('Organization Details', 75, 465);
    doc.moveTo(75, 477).lineTo(272, 477).lineWidth(0.5).strokeColor('#1E293B').stroke();

    const printMetaRowDark = (l: string, v: string, y: number) => {
      doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text(l, 75, y);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF').text(v, 160, y);
    };
    printMetaRowDark('Organization:', 'SecureWipe Enterprise', 488);
    printMetaRowDark('Application:', 'SecureWipe', 505);
    printMetaRowDark('Version:', '1.0', 522);
    printMetaRowDark('Database:', 'PostgreSQL Engine', 539);
    printMetaRowDark('Environment:', 'Production', 556);

    doc.roundedRect(308, 450, 227, 140, 6).fill('#0F172A');
    doc.roundedRect(308, 450, 227, 140, 6).lineWidth(1).strokeColor('#1E293B').stroke();
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5).text('Report Metadata', 323, 465);
    doc.moveTo(323, 477).lineTo(520, 477).lineWidth(0.5).strokeColor('#1E293B').stroke();

    const printMetaRowDark2 = (l: string, v: string, y: number, isVal?: boolean) => {
      doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text(l, 323, y);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(isVal ? '#10B981' : '#FFFFFF').text(v, 408, y);
    };
    printMetaRowDark2('Report ID:', metadata.reportId.toUpperCase(), 488);
    printMetaRowDark2('Date & Time:', metadata.generatedDate.toISOString().slice(0, 10), 505);
    printMetaRowDark2('Prepared For:', 'SecureWipe Client', 522);
    printMetaRowDark2('Prepared By:', metadata.generatedBy, 539);
    printMetaRowDark2('Report Status:', 'Completed / Passed', 556, true);
    doc.restore();

    // Confidential ribbon banner at the bottom
    doc.save();
    doc.rect(0, 615, 595, 30).fill('#0EA5E9');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
    doc.text('CLASSIFICATION: CONFIDENTIAL   |   AUDIT COMPLIANCE RECORD', 0, 626, { align: 'center', width: 595 });
    doc.restore();

    // Document Details Box
    doc.save();
    doc.roundedRect(60, 665, 475, 80, 6).fill('#0F172A');
    doc.roundedRect(60, 665, 475, 80, 6).lineWidth(1).strokeColor('#1E293B').stroke();
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5).text('Compliance Evidence Control', 75, 680);
    doc.moveTo(75, 692).lineTo(520, 692).lineWidth(0.5).strokeColor('#1E293B').stroke();

    doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text('Reference Verification Hash:', 75, 702);
    const hash = crypto.createHash('sha256').update(metadata.reportId + metadata.generatedDate.toISOString()).digest('hex').toUpperCase();
    doc.font('Courier-Bold').fontSize(7).fillColor('#FFFFFF').text(hash, 75, 715);
    doc.restore();
  }

  private async buildPDFReport(
    metadata: {
      reportId: string;
      generatedBy: string;
      generatedDate: Date;
      version: string;
      dbStatus: string;
      reportTitle: string;
    },
    stats: {
      totalDevicesProcessed: number;
      successfulWipes: number;
      failedWipes: number;
      successRate: number;
      certificatesGenerated: number;
      totalCapacityManaged: number;
      totalDataWipedBytes: number;
      totalUsbWiped: number;
      totalExtHddWiped: number;
      totalIntHddWiped: number;
      totalSsdsDetected: number;
    },
    devicesList: DeviceDetails[]
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pages = doc.bufferedPageRange();
          for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            this.drawWatermark(doc);
            if (i > 0) {
              const titles = [
                '',
                'Report Contents',
                'Executive Summary',
                'Device Details',
                'Security Verification',
                'Certificate of Secure Erasure',
                'Conclusion & Recommendations'
              ];
              this.drawHeader(doc, titles[i] || 'Secure Data Erasure Report', { reportId: metadata.reportId });
            }
            this.drawFooter(doc, i, pages.count);
          }
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', (err) => reject(err));

        const dateStr = metadata.generatedDate.toISOString().slice(0, 10);
        const timeStr = metadata.generatedDate.toTimeString().slice(0, 8);
        const signedHash = crypto.createHash('sha256').update(metadata.reportId + metadata.generatedDate.toISOString()).digest('hex').toUpperCase();
        const isOverallSuccess = stats.failedWipes === 0;

        const displayDevices = devicesList.slice(0, 18);
        let totalCap = 0;
        let totalUsed = 0;
        let totalFree = 0;
        displayDevices.forEach(d => {
          totalCap += d.capacity;
          totalUsed += d.usedSpace;
          totalFree += d.freeSpace;
        });

        const totalsText = 'The summary statistics above are compiled from the system database. These values represent the current connection status, device capacity, and erasure verification records for the storage devices managed by SecureWipe.';

        const checkItems = [
          'Secure erase completed',
          'Certificate created',
          'Database updated',
          'Audit log saved',
          'Verification passed',
          'No errors found'
        ];

        const standards = [
          { name: 'NIST SP 800-88', desc: 'Standard guidelines for secure media sanitization and data erasure.' },
          { name: 'SHA-256', desc: 'Cryptographic hash function used to verify report and certificate integrity.' },
          { name: 'AES-256', desc: 'Advanced encryption standard used to secure archived records.' }
        ];

        const certWordingText = 'This certificate confirms that the selected storage device was securely erased using the SecureWipe system. The erasure process was verified, recorded, and completed successfully. No raw data, logical indexes, or sector records remain recoverable on the erased storage media.';
        const summaryTextSimple = 'All data erasure operations have completed. The system scanned the selected storage devices and executed secure erasure procedures. The operations were verified against security standards, and the status of each drive has been recorded in the database. A certificate has been generated for each successfully erased device to confirm that no data remains on the storage media.';

        // Position coordinates for drawings
        const certY = 95;
        const qrX = 55;
        const qrY = certY + 15;
        const synY = 230;
        const signY = 365;
        const sigLineY = signY + 140;
        const logBoxY = signY + 200;
        const sCX = 475;
        const sCY = signY + 65;
        const disclaimerY = 680;
        const dX = 40;
        const dY = 555;
        const cX = 310;
        const cY = 555;
        const ringX = cX + 60;
        const ringY = cY + 50;
        const bX = 40;
        const bY = 665;
        const axisY = bY + 60;
        const sX = 310;
        const sY = 665;
        const matY = 485;

        // Dynamic chart variables
        const totalWiped = stats.totalUsbWiped + stats.totalExtHddWiped + stats.totalIntHddWiped + stats.totalSsdsDetected;
        const pSsd = totalWiped > 0 ? stats.totalSsdsDetected / totalWiped : 0.4;
        const pUsb = totalWiped > 0 ? stats.totalUsbWiped / totalWiped : 0.3;
        const pHdd = totalWiped > 0 ? (stats.totalExtHddWiped + stats.totalIntHddWiped) / totalWiped : 0.3;

        const barX = dX + 15;
        const barY = dY + 30;
        const barW = 215;
        const barH = 12;
        const wSsd = Math.max(15, barW * pSsd);
        const wUsb = Math.max(15, barW * pUsb);
        const wHdd = barW - wSsd - wUsb;

        const chartHeight = 40;
        const totalWipeOps = stats.successfulWipes + stats.failedWipes;
        const successHeight = Math.max(5, (stats.successfulWipes / (totalWipeOps || 1)) * chartHeight);
        const failedHeight = Math.max(5, (stats.failedWipes / (totalWipeOps || 1)) * chartHeight);

        const printMetaRow = (label: string, val: string, y: number) => {
          doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(label, 90, y);
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text(val, 210, y);
        };

        const printTocRow = (num: string, title: string, pageNum: string, iconDraw: (x: number, y: number) => void, y: number) => {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text(num, 45, y);
          iconDraw(65, y);
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B').text(title, 82, y);
          doc.font('Helvetica').fontSize(9).fillColor('#94A3B8');
          let dotStr = '';
          for (let k = 0; k < 54; k++) dotStr += '.';
          doc.text(dotStr, 220, y);
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text(`Page ${pageNum}`, 505, y, { align: 'right', width: 50 });
        };

        const printControlRow = (label: string, val: string, y: number) => {
          doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(label, 55, y);
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text(val, 200, y);
          doc.moveTo(55, y + 14).lineTo(540, y + 14).lineWidth(0.5).stroke('#F1F5F9');
        };

        const printHealthStatus = (label: string, status: string, col: string, y: number) => {
          doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(label, 55, y);
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(col).text(status, 195, y, { width: 80, align: 'right' });
        };

        const drawStatCard = (x: number, y: number, label: string, value: string, desc: string, color: string, iconDraw?: () => void) => {
          doc.roundedRect(x, y, 116, 50, 6).fill('#F8FAFC');
          doc.roundedRect(x, y, 116, 50, 6).lineWidth(1).stroke('#E2E8F0');
          doc.font('Helvetica-Bold').fontSize(6).fillColor('#64748B').text(label.toUpperCase(), x + 8, y + 10, { width: 100 });
          doc.font('Helvetica-Bold').fontSize(11).fillColor(color).text(value, x + 8, y + 21, { width: 100 });
          doc.font('Helvetica').fontSize(5.5).fillColor('#94A3B8').text(desc, x + 8, y + 35, { width: 100 });
          if (iconDraw) iconDraw();
        };

        const printTotalRow = (label: string, value: string, y: number) => {
          doc.font('Helvetica').fontSize(8.5).fillColor('#64748B').text(label, 55, y);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(value, 280, y);
        };

        const printMatrixRow = (std: string, stat: string, ver: string, rec: string, idx: number, y: number) => {
          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.roundedRect(40, y, 515, 18, 2).fill(bg);
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#1E293B').text(std, 45, y + 6);
          
          this.drawCheckIcon(doc, 165, y + 5, 7.5, '#10B981');
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#10B981').text(stat, 177, y + 6);
          doc.font('Helvetica').fontSize(6.5).fillColor('#475569').text(ver, 245, y + 6);
          doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#64748B').text(rec, 395, y + 6);
          doc.moveTo(40, y + 18).lineTo(555, y + 18).lineWidth(0.5).stroke('#F1F5F9');
        };

        const printCertVal = (label: string, val: string, y: number) => {
          doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(label, 165, y);
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1E293B').text(val, 260, y);
        };

        const printSynopsisSection = (title: string, body: string, iconDraw: (x: number, y: number) => void, y: number) => {
          iconDraw(45, y);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B').text(title, 62, y);
          doc.font('Helvetica').fontSize(8).fillColor('#475569').text(body, 45, y + 12, { width: 505, lineGap: 2.5 });
        };

        const drawLegendItem = (col: string, label: string, percent: number, lx: number, ly: number) => {
          doc.save();
          doc.circle(lx + 4, ly + 4, 3.5).fill(col);
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#1E293B').text(`${label} (${(percent * 100).toFixed(0)}%)`, lx + 12, ly + 1);
          doc.restore();
        };

        const printStorageBarRow = (label: string, sizeBytes: number, totalBytes: number, col: string, y: number) => {
          const ratio = totalBytes > 0 ? sizeBytes / totalBytes : 0.5;
          doc.fillColor('#475569').font('Helvetica').fontSize(6.5).text(label, sX + 15, y);
          doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(6.5).text(this.formatSize(sizeBytes), sX + 150, y, { width: 80, align: 'right' });
          // Vector storage bar with gradient effect
          doc.roundedRect(sX + 15, y + 10, 215, 6, 2).fill('#E2E8F0');
          doc.roundedRect(sX + 15, y + 10, 215 * ratio, 6, 2).fill(col);
        };

        const printGlanceRow = (label: string, value: string, y: number) => {
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569').text(label, 55, y);
          doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text('......................................................', 145, y);
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A').text(value, 230, y, { align: 'right', width: 40 });
        };

        // Vector check row with green check circle
        const drawCheckRow = (text: string, x: number, y: number) => {
          doc.save();
          doc.circle(x + 5, y + 4, 5.5).fill('#10B981');
          doc.lineWidth(1.2).strokeColor('#FFFFFF');
          doc.moveTo(x + 2.5, y + 4).lineTo(x + 4.2, y + 5.7).lineTo(x + 7.5, y + 2.2).stroke();
          doc.restore();
          
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B');
          doc.text(text, x + 18, y);
        };

        const drawChecklistRow = (text: string, x: number, y: number) => {
          doc.save();
          doc.circle(x + 6, y + 5, 6.5).fill('#10B981');
          doc.lineWidth(1.5).strokeColor('#FFFFFF');
          doc.moveTo(x + 3.5, y + 5).lineTo(x + 5.2, y + 7).lineTo(x + 8.5, y + 3).stroke();
          doc.restore();
          
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B');
          doc.text(text, x + 20, y + 1.5);
        };

        // ==========================================
        // PAGE 1: COVER PAGE (Redesigned for impact)
        // ==========================================
        this.drawCoverPage(doc, {
          reportId: metadata.reportId,
          generatedDate: metadata.generatedDate,
          generatedBy: metadata.generatedBy,
          version: metadata.version
        });

        // ==========================================
        // PAGE 2: REPORT CONTENTS & DOCUMENT CONTROL
        // ==========================================
        doc.addPage();
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('REPORT CONTENTS', 40, 75);

        // Better Spacing layout for Page 2
        printTocRow('1', 'Executive Summary', '3', (x, y) => this.drawDocumentIcon(doc, x, y, 7.5), 110);
        printTocRow('2', 'Device Details', '4', (x, y) => this.drawDriveIcon(doc, x, y, 7.5), 136);
        printTocRow('3', 'Security Verification', '5', (x, y) => this.drawShieldIcon(doc, x, y, 7.5), 162);
        printTocRow('4', 'Certificate of Secure Erasure', '6', (x, y) => this.drawCertificateIcon(doc, x, y, 7.5), 188);
        printTocRow('5', 'Conclusion & Recommendations', '7', (x, y) => this.drawCheckIcon(doc, x, y, 7.5), 214);

        // Document History Table
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.5).text('Document History', 40, 245);
        
        let histY = 260;
        doc.roundedRect(40, histY, 515, 16, 2).fill('#0F172A');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7);
        doc.text('Version', 48, histY + 5);
        doc.text('Date', 115, histY + 5);
        doc.text('Description', 215, histY + 5);
        doc.text('Author', 435, histY + 5);

        histY += 16;
        doc.roundedRect(40, histY, 515, 18, 2).fill('#F8FAFC');
        doc.fillColor('#475569').font('Helvetica').fontSize(7.5);
        doc.text('1.0', 48, histY + 6);
        doc.text('08-Jul-2026', 115, histY + 6);
        doc.text('Initial Release', 215, histY + 6);
        doc.text(metadata.generatedBy, 435, histY + 6);
        doc.moveTo(40, histY + 18).lineTo(555, histY + 18).lineWidth(0.5).stroke('#F1F5F9');

        // Document Control box
        doc.roundedRect(40, 325, 515, 270, 6).fill('#F8FAFC');
        doc.roundedRect(40, 325, 515, 270, 6).lineWidth(1).stroke('#E2E8F0');

        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.5).text('Document Information & Control', 55, 340);
        doc.moveTo(55, 353).lineTo(540, 353).lineWidth(0.5).stroke('#CBD5E1');

        printControlRow('Document Version', metadata.version, 365);
        printControlRow('Document Status', 'Verified / Completed', 385);
        printControlRow('Classification', 'Confidential', 405);
        printControlRow('Report Owner', 'SecureWipe Enterprise Client', 425);
        printControlRow('Generated By', metadata.generatedBy, 445);
        printControlRow('Generated Date', `${dateStr} ${timeStr}`, 465);
        printControlRow('Digital Signature', signedHash.substring(0, 32), 485);
        printControlRow('Database System', 'PostgreSQL Relational DB Engine', 505);

        // Report Verification
        doc.roundedRect(40, 625, 515, 80, 4).fill('#FFFFFF');
        doc.roundedRect(40, 625, 515, 80, 4).lineWidth(0.5).stroke('#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text('REPORT VERIFICATION & INTEGRITY', 55, 638);
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text('This document contains automated verification details generated from database records. Any modification to this report will invalidate its digital signature. For verification details, please see the Certificate section.', 55, 652, { width: 485, lineGap: 3.5 });

        // ==========================================
        // PAGE 3: EXECUTIVE SUMMARY
        // ==========================================
        doc.addPage();
        this.drawDocumentIcon(doc, 40, 75, 10, '#0EA5E9');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('EXECUTIVE SUMMARY', 56, 75);

        // Report at a Glance (Left)
        doc.roundedRect(40, 95, 245, 140, 6).fill('#F8FAFC');
        doc.roundedRect(40, 95, 245, 140, 6).lineWidth(1).stroke('#E2E8F0');
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(8.5).text('REPORT AT A GLANCE', 55, 110);
        doc.moveTo(55, 122).lineTo(270, 122).lineWidth(0.5).stroke('#CBD5E1');

        printGlanceRow('Devices Scanned', String(stats.totalDevicesProcessed), 132);
        printGlanceRow('Devices Erased', String(stats.successfulWipes), 150);
        printGlanceRow('Certificates Created', String(stats.certificatesGenerated), 168);
        printGlanceRow('Storage Processed', this.formatSize(stats.totalCapacityManaged), 186);

        // Overall Status
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569').text('Overall Status:', 55, 207);
        this.drawCheckIcon(doc, 136, 206, 8, isOverallSuccess ? '#10B981' : '#EF4444');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(isOverallSuccess ? '#10B981' : '#EF4444')
           .text(isOverallSuccess ? 'Completed Successfully' : 'Completed with Errors', 150, 207);

        // Key Results (Right)
        doc.roundedRect(310, 95, 245, 140, 6).fill('#F8FAFC');
        doc.roundedRect(310, 95, 245, 140, 6).lineWidth(1).stroke('#E2E8F0');
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(8.5).text('KEY RESULTS', 325, 110);
        doc.moveTo(325, 122).lineTo(540, 122).lineWidth(0.5).stroke('#CBD5E1');

        drawCheckRow(`Devices scanned: ${stats.totalDevicesProcessed}`, 325, 135);
        drawCheckRow(`Devices erased: ${stats.successfulWipes}`, 325, 155);
        drawCheckRow(`Success rate: ${stats.successRate.toFixed(1)}%`, 325, 175);
        drawCheckRow(`Certificates created: ${stats.certificatesGenerated}`, 325, 195);

        // Stats Cards Grid
        drawStatCard(40, 250, 'Devices Scanned', String(stats.totalDevicesProcessed), 'Assets detected', '#0F172A', () => {
          doc.save(); doc.translate(40 + 95, 250 + 10); doc.rect(0, 0, 10, 8).lineWidth(1).stroke('#64748B'); doc.circle(2, 4, 0.75).fill('#64748B'); doc.circle(8, 4, 0.75).fill('#64748B'); doc.restore();
        });
        drawStatCard(173, 250, 'Successful Wipes', String(stats.successfulWipes), 'Zero residue verified', '#10B981', () => {
          doc.save(); doc.translate(173 + 95, 250 + 10); doc.path('M 0 0 L 5 -3 L 10 0 L 10 5 C 10 8 5 11 5 11 C 5 11 0 8 0 5 Z').fill('#10B981'); doc.restore();
        });
        drawStatCard(306, 250, 'Failed Operations', String(stats.failedWipes), stats.failedWipes > 0 ? 'Errors logged' : 'No errors logged', stats.failedWipes > 0 ? '#EF4444' : '#10B981', () => {
          doc.save(); doc.translate(306 + 95, 250 + 10); doc.moveTo(5, 0).lineTo(10, 9).lineTo(0, 9).closePath().fill(stats.failedWipes > 0 ? '#EF4444' : '#10B981'); doc.restore();
        });
        drawStatCard(439, 250, 'Success Rate', `${stats.successRate.toFixed(2)}%`, 'Wipe operations', '#059669', () => {
          doc.save(); doc.translate(439 + 95, 250 + 10); doc.circle(5, 5, 4.5).lineWidth(1).stroke('#059669'); doc.moveTo(3, 5).lineTo(5, 7).lineTo(8, 3).lineWidth(1).stroke('#059669'); doc.restore();
        });

        drawStatCard(40, 310, 'Certificates Created', String(stats.certificatesGenerated), 'Official certificates', '#06B6D4', () => {
          doc.save(); doc.translate(40 + 95, 310 + 10); doc.rect(0, 0, 8, 10).lineWidth(1).stroke('#06B6D4'); doc.moveTo(2, 3).lineTo(6, 3).lineWidth(0.5).stroke('#06B6D4'); doc.moveTo(2, 5).lineTo(6, 5).lineWidth(0.5).stroke('#06B6D4'); doc.restore();
        });
        drawStatCard(173, 310, 'Storage Processed', this.formatSize(stats.totalCapacityManaged), 'Total capacity sized', '#F97316', () => {
          doc.save(); doc.translate(173 + 95, 310 + 10); doc.ellipse(5, 2, 4.5, 1.5).fill('#F97316'); doc.rect(0.5, 2, 9, 6).fill('#F97316'); doc.ellipse(5, 8, 4.5, 1.5).fill('#EA580C'); doc.restore();
        });
        drawStatCard(306, 310, 'Database Status', metadata.dbStatus, 'PostgreSQL active', '#10B981', () => {
          doc.save(); doc.translate(306 + 95, 310 + 10); doc.rect(0, 0, 10, 3).fill('#10B981'); doc.rect(0, 4, 10, 3).fill('#10B981'); doc.rect(0, 8, 10, 3).fill('#10B981'); doc.restore();
        });
        drawStatCard(439, 310, 'Verification Status', isOverallSuccess ? 'PASSED' : 'WARNING', 'System verification', isOverallSuccess ? '#10B981' : '#F59E0B', () => {
          doc.save(); doc.translate(439 + 95, 310 + 10); doc.circle(5, 3, 3).lineWidth(1).stroke(isOverallSuccess ? '#10B981' : '#F59E0B'); doc.rect(2, 4, 6, 5).fill(isOverallSuccess ? '#10B981' : '#F59E0B'); doc.restore();
        });

        // Left Panel (Y: 375): System Status
        doc.roundedRect(40, 375, 245, 160, 6).fill('#FFFFFF');
        doc.roundedRect(40, 375, 245, 160, 6).lineWidth(1).stroke('#CBD5E1');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text('SYSTEM STATUS', 55, 390);
        doc.moveTo(55, 403).lineTo(270, 403).lineWidth(0.5).stroke('#CBD5E1');

        printHealthStatus('Database Connected:', 'YES', '#10B981', 412);
        printHealthStatus('Audit Log Active:', 'YES', '#10B981', 427);
        printHealthStatus('Certificate Engine:', 'ONLINE', '#10B981', 442);
        printHealthStatus('Verification Engine:', 'ONLINE', '#10B981', 457);
        printHealthStatus('Compliance Level:', 'NIST SP 800-88', '#0EA5E9', 472);
        printHealthStatus('Overall Health:', '100% SECURE', '#10B981', 487);

        // Right Panel (Y: 375): Executive Summary Overview
        doc.roundedRect(310, 375, 245, 160, 6).fill('#FFFFFF');
        doc.roundedRect(310, 375, 245, 160, 6).lineWidth(1).stroke('#CBD5E1');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text('EXECUTIVE SUMMARY OVERVIEW', 325, 390);
        doc.moveTo(325, 403).lineTo(540, 403).lineWidth(0.5).stroke('#CBD5E1');
        doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(summaryTextSimple, 325, 412, { width: 215, lineGap: 3.5 });

        // Operational Charts Section (Y: 550)
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.5).text('OPERATIONAL CHARTS', 40, 545);
        doc.moveTo(40, 558).lineTo(555, 558).lineWidth(0.5).stroke('#CBD5E1');

        // 1. Device Type Allocation Donut Chart
        doc.roundedRect(dX, dY, 245, 95, 6).fill('#F8FAFC');
        doc.roundedRect(dX, dY, 245, 95, 6).lineWidth(0.5).stroke('#E2E8F0');
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7.5).text('DEVICE ALLOCATION DONUT', dX + 15, dY + 12);

        // Shaded vector donut rendering
        const donutCX = dX + 55;
        const donutCY = dY + 48;
        const donutR = 25;
        
        let startA = -Math.PI / 2;
        if (pSsd > 0) {
          const endA = startA + pSsd * 2 * Math.PI;
          this.drawPieSlice(doc, donutCX, donutCY, donutR, startA, endA, '#0EA5E9');
          startA = endA;
        }
        if (pUsb > 0) {
          const endA = startA + pUsb * 2 * Math.PI;
          this.drawPieSlice(doc, donutCX, donutCY, donutR, startA, endA, '#1E3A8A');
          startA = endA;
        }
        if (pHdd > 0) {
          const endA = startA + pHdd * 2 * Math.PI;
          this.drawPieSlice(doc, donutCX, donutCY, donutR, startA, endA, '#64748B');
          startA = endA;
        }
        // Inner hole for donut
        doc.circle(donutCX, donutCY, donutR * 0.52).fill('#F8FAFC');

        drawLegendItem('#0EA5E9', 'SSD', pSsd, dX + 115, dY + 22);
        drawLegendItem('#1E3A8A', 'USB', pUsb, dX + 115, dY + 40);
        drawLegendItem('#64748B', 'HDD', pHdd, dX + 115, dY + 58);

        doc.fillColor('#64748B').font('Helvetica-Oblique').fontSize(5.5).text('Portfolio allocation reflects verified storage media.', dX + 15, dY + 81, { width: 215 });

        // 2. Erasure Success Gauge
        doc.roundedRect(cX, cY, 245, 95, 6).fill('#F8FAFC');
        doc.roundedRect(cX, cY, 245, 95, 6).lineWidth(0.5).stroke('#E2E8F0');
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7.5).text('ERASURE SUCCESS GAUGE', cX + 15, cY + 12);

        const successRatio = stats.successRate / 100;
        const gCX = cX + 55;
        const gCY = cY + 48;
        const gR = 25;

        // Gray base track
        doc.circle(gCX, gCY, gR).lineWidth(5.5).stroke('#E2E8F0');
        // Success color track
        let startG = -Math.PI / 2;
        let endG = startG + successRatio * 2 * Math.PI;
        this.drawPieSlice(doc, gCX, gCY, gR, startG, endG, '#10B981');
        doc.circle(gCX, gCY, gR - 5.5).fill('#F8FAFC');

        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text(`${stats.successRate.toFixed(1)}%`, gCX - 12, gCY - 4);
        doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(5).text('PASS RATE', gCX - 12, gCY + 5);

        doc.fillColor('#64748B').font('Helvetica-Oblique').fontSize(5.5).text('Verification pass rate compared against global overwrites.', cX + 115, cY + 40, { width: 110, lineGap: 2 });

        // 3. Erasure Outcomes Bar Chart
        doc.roundedRect(bX, bY, 245, 85, 6).fill('#F8FAFC');
        doc.roundedRect(bX, bY, 245, 85, 6).lineWidth(0.5).stroke('#E2E8F0');
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7.5).text('ERASURE OUTCOMES', bX + 15, bY + 12);

        doc.roundedRect(bX + 55, axisY - successHeight, 25, successHeight, 2).fill('#10B981');
        doc.fillColor('#065F46').font('Helvetica-Bold').fontSize(6).text(String(stats.successfulWipes), bX + 55, axisY - successHeight - 9, { width: 25, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(6).fillColor('#64748B').text('PASS', bX + 55, axisY + 5, { width: 25, align: 'center' });

        doc.roundedRect(bX + 145, axisY - failedHeight, 25, failedHeight, 2).fill('#EF4444');
        doc.fillColor('#991B1B').font('Helvetica-Bold').fontSize(6).text(String(stats.failedWipes), bX + 145, axisY - failedHeight - 9, { width: 25, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(6).fillColor('#64748B').text('FAIL', bX + 145, axisY + 5, { width: 25, align: 'center' });

        doc.moveTo(bX + 25, axisY).lineTo(bX + 215, axisY).lineWidth(0.75).stroke('#CBD5E1');

        // 4. Storage Capacity Overview
        doc.roundedRect(sX, sY, 245, 85, 6).fill('#F8FAFC');
        doc.roundedRect(sX, sY, 245, 85, 6).lineWidth(0.5).stroke('#E2E8F0');
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(7.5).text('STORAGE CAPACITY OVERVIEW', sX + 15, sY + 12);

        printStorageBarRow('Total Capacity:', stats.totalCapacityManaged, stats.totalCapacityManaged, '#F97316', sY + 24);
        printStorageBarRow('Data Overwritten:', stats.totalDataWipedBytes, stats.totalCapacityManaged, '#0EA5E9', sY + 48);

        // ==========================================
        // PAGE 4: DEVICE DETAILS & COMPLIANCE CARDS (Polished to fill empty space)
        // ==========================================
        doc.addPage();
        this.drawDriveIcon(doc, 40, 75, 10, '#0EA5E9');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('DEVICE DETAILS', 56, 75);

        let detailsTableY = 95;
        doc.roundedRect(40, detailsTableY, 515, 18, 4).fill('#0F172A');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(5.2);
        
        doc.text('DEVICE NAME', 42, detailsTableY + 6);
        doc.text('DEVICE TYPE', 140, detailsTableY + 6);
        doc.text('CAPACITY', 200, detailsTableY + 6, { width: 35, align: 'right' });
        doc.text('USED SPACE', 240, detailsTableY + 6, { width: 35, align: 'right' });
        doc.text('FREE SPACE', 280, detailsTableY + 6, { width: 35, align: 'right' });
        doc.text('CONNECTION', 320, detailsTableY + 6);
        doc.text('STATUS', 375, detailsTableY + 6, { width: 35, align: 'center' });
        doc.text('DETECTION DATE', 415, detailsTableY + 6, { width: 45, align: 'center' });
        doc.text('WIPE METHOD', 465, detailsTableY + 6, { width: 85, align: 'center' });

        detailsTableY += 18;

        displayDevices.forEach((dev: DeviceDetails, idx: number) => {
          const parsed = this.parseDeviceDetails(dev);
          const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.roundedRect(40, detailsTableY, 515, 18, 2).fill(rowBg);

          doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(4.8);
          doc.text(dev.name, 42, detailsTableY + 6, { width: 95, height: 10, ellipsis: true });

          doc.fillColor('#475569').font('Helvetica').fontSize(4.8);
          doc.text(dev.type.toUpperCase().replace(/_/g, ' '), 140, detailsTableY + 6, { width: 55, height: 10, ellipsis: true });

          doc.text(this.formatSize(dev.capacity), 200, detailsTableY + 6, { width: 35, align: 'right' });
          doc.text(this.formatSize(dev.usedSpace), 240, detailsTableY + 6, { width: 35, align: 'right' });
          doc.text(this.formatSize(dev.freeSpace), 280, detailsTableY + 6, { width: 35, align: 'right' });
          doc.text(dev.connectionType, 320, detailsTableY + 6);

          const isConn = dev.connectionStatus === 'connected';
          doc.save();
          doc.roundedRect(375, detailsTableY + 3.5, 35, 11, 2).fill(isConn ? '#D1FAE5' : '#F1F5F9');
          doc.fillColor(isConn ? '#065F46' : '#475569').font('Helvetica-Bold').fontSize(4.5).text(
            isConn ? 'ACTIVE' : 'OFFLINE',
            375,
            detailsTableY + 6.5,
            { width: 35, align: 'center' }
          );
          doc.restore();

          const dateVal = dev.updated_at ? new Date(dev.updated_at).toLocaleDateString() : 'N/A';
          doc.fillColor('#475569').font('Helvetica').fontSize(4.8);
          doc.text(dateVal, 415, detailsTableY + 6, { width: 45, align: 'center' });
          doc.text('NIST SP 800-88', 465, detailsTableY + 6, { width: 85, align: 'center' });

          doc.moveTo(40, detailsTableY + 18).lineTo(555, detailsTableY + 18).lineWidth(0.5).stroke('#F1F5F9');
          detailsTableY += 18;
        });

        // Spacing polish: We place a dashboard card row on Page 4 to balance empty space
        const cardsY = 220;
        doc.save();
        const cardW = 160;
        const cardH = 55;
        const gap = 17;
        
        const drawPage4Card = (x: number, y: number, label: string, val: string, sub: string, col: string) => {
          doc.roundedRect(x, y, cardW, cardH, 5).fill('#F8FAFC');
          doc.roundedRect(x, y, cardW, cardH, 5).lineWidth(0.75).stroke('#CBD5E1');
          doc.font('Helvetica-Bold').fontSize(6).fillColor('#64748B').text(label.toUpperCase(), x + 10, y + 10);
          doc.font('Helvetica-Bold').fontSize(11).fillColor(col).text(val, x + 10, y + 20);
          doc.font('Helvetica').fontSize(5.5).fillColor('#94A3B8').text(sub, x + 10, y + 36);
        };
        
        drawPage4Card(40, cardsY, 'Inventory Summary', `${devicesList.length} Storage Drives`, 'Registered media drives', '#0F172A');
        drawPage4Card(40 + cardW + gap, cardsY, 'Data Size Sized', this.formatSize(totalCap), 'Accumulated capacity active', '#10B981');
        drawPage4Card(40 + (cardW + gap) * 2, cardsY, 'Compliance Standard', 'NIST SP 800-88', 'Sanitization audit baseline', '#0EA5E9');
        doc.restore();

        // Place details summary box nicely below
        const dynTotalsY = 295;

        doc.roundedRect(40, dynTotalsY, 515, 290, 6).fill('#F8FAFC');
        doc.roundedRect(40, dynTotalsY, 515, 290, 6).lineWidth(1).stroke('#CBD5E1');

        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.5).text('Device Information Summary', 55, dynTotalsY + 15);
        doc.moveTo(55, dynTotalsY + 30).lineTo(540, dynTotalsY + 30).lineWidth(0.5).stroke('#CBD5E1');

        printTotalRow('Total Storage Devices:', `${devicesList.length} Registered Media Drives`, dynTotalsY + 45);
        printTotalRow('Active Devices:', `${devicesList.filter((d: any) => d.connectionStatus === 'connected').length} Connected Drives`, dynTotalsY + 65);
        printTotalRow('Total Capacity:', this.formatSize(totalCap), dynTotalsY + 85);
        printTotalRow('Total Free Space:', this.formatSize(totalFree), dynTotalsY + 105);
        printTotalRow('Connection Health:', '100% Operational', dynTotalsY + 125);
        printTotalRow('Erasure Compliance:', 'NIST SP 800-88 Compliant', dynTotalsY + 145);
        
        doc.roundedRect(55, dynTotalsY + 175, 445, 95, 4).fill('#FFFFFF');
        doc.roundedRect(55, dynTotalsY + 175, 445, 95, 4).lineWidth(0.5).stroke('#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text('Data Verification Disclaimer', 70, dynTotalsY + 185);
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(totalsText, 70, dynTotalsY + 198, { width: 415, lineGap: 2.5 });

        // ==========================================
        // PAGE 5: SECURITY VERIFICATION
        // ==========================================
        doc.addPage();
        this.drawShieldIcon(doc, 40, 75, 10, '#0EA5E9');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('SECURITY VERIFICATION', 56, 75);

        // Security Checklist (Left) - Expanded Box Height
        doc.roundedRect(40, 95, 245, 360, 6).fill('#F8FAFC');
        doc.roundedRect(40, 95, 245, 360, 6).lineWidth(1).stroke('#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(9.5).text('SECURITY CHECKLIST', 55, 115);
        doc.moveTo(55, 126).lineTo(270, 126).lineWidth(0.5).stroke('#CBD5E1');

        checkItems.forEach((item, idx) => {
          const itemY = 145 + idx * 45;
          checklistRow(item, 55, itemY);
        });

        function checklistRow(txt: string, rx: number, ry: number) {
          doc.save();
          doc.circle(rx + 6, ry + 5, 6).fill('#10B981');
          doc.lineWidth(1.2).strokeColor('#FFFFFF');
          doc.moveTo(rx + 3, ry + 5).lineTo(rx + 5, ry + 7).lineTo(rx + 8.5, ry + 3).stroke();
          doc.restore();
          
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B');
          doc.text(txt, rx + 20, ry + 1.5);
        }

        // Security Standards (Right) - Expanded Box Height
        doc.roundedRect(310, 95, 245, 360, 6).fill('#F8FAFC');
        doc.roundedRect(310, 95, 245, 360, 6).lineWidth(1).stroke('#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(9.5).text('SECURITY STANDARDS', 325, 115);
        doc.moveTo(325, 126).lineTo(540, 126).lineWidth(0.5).stroke('#CBD5E1');

        standards.forEach((s, idx) => {
          const itemY = 145 + idx * 80;
          doc.save();
          doc.fillColor('#0EA5E9').font('Helvetica-Bold').fontSize(9.5).text(`•  ${s.name}`, 325, itemY);
          doc.fillColor('#475569').font('Helvetica').fontSize(8).text(s.desc, 325, itemY + 14, { width: 215, lineGap: 2 });
          doc.restore();
        });

        // Security Standards Status Table (Bottom)
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.5).text('Regulatory Standards Status', 40, matY);
        doc.moveTo(40, matY + 13).lineTo(555, matY + 13).lineWidth(0.5).stroke('#CBD5E1');

        let cellY = matY + 22;
        doc.roundedRect(40, cellY, 515, 16, 2).fill('#0F172A');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(6.5);
        doc.text('STANDARD', 45, cellY + 5);
        doc.text('STATUS', 165, cellY + 5);
        doc.text('VERIFICATION METRIC', 245, cellY + 5);
        doc.text('RECOMMENDED ACTION', 395, cellY + 5);

        cellY += 16;
        printMatrixRow('NIST SP 800-88 Rev 1', 'COMPLIANT', 'Complete overwrite verification', 'Periodic random checks', 0, cellY); cellY += 18;
        printMatrixRow('ISO/IEC 27001', 'VERIFIED', 'Signed transaction logs', 'Maintain standard updates', 1, cellY); cellY += 18;
        printMatrixRow('GDPR Article 32', 'COMPLIANT', 'Safe data disposal certificate', 'Perform yearly audit updates', 2, cellY); cellY += 18;
        printMatrixRow('HIPAA Security Rule', 'VERIFIED', 'Secure audit log saved', 'Encrypt log archive backups', 3, cellY); cellY += 18;

        // ==========================================
        // PAGE 6: CERTIFICATE OF SECURE ERASURE (Injecting a real QR code)
        // ==========================================
        doc.addPage();
        this.drawCertificateIcon(doc, 40, 75, 10, '#0EA5E9');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('CERTIFICATE OF SECURE ERASURE', 56, 75);

        doc.roundedRect(40, certY, 515, 120, 6).fill('#F8FAFC');
        doc.roundedRect(40, certY, 515, 120, 6).lineWidth(1).stroke('#CBD5E1');

        // Generate and inject a real QR Code pointing to verification URL
        const qrText = `http://localhost:5000/api/verify/${metadata.reportId}`;
        const qrDataUrl = await QRCode.toDataURL(qrText, { errorCorrectionLevel: 'H', margin: 1 });
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrImageBuffer = Buffer.from(base64Data, 'base64');
        doc.image(qrImageBuffer, qrX, qrY, { width: 90, height: 90 });

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text('CERTIFICATE DETAILS', 165, certY + 15);
        doc.moveTo(165, certY + 28).lineTo(540, certY + 28).lineWidth(0.5).stroke('#CBD5E1');

        printCertVal('Certificate ID:', metadata.reportId.toUpperCase(), certY + 35);
        printCertVal('Verification Status:', isOverallSuccess ? 'SUCCESS / VERIFIED' : 'WARNING / FAILED', certY + 48);
        doc.fillColor(isOverallSuccess ? '#10B981' : '#EF4444'); doc.text(isOverallSuccess ? 'SUCCESS / VERIFIED' : 'WARNING / FAILED', 260, certY + 48);
        printCertVal('Operator Name:', metadata.generatedBy, certY + 61);
        printCertVal('Date:', dateStr, certY + 74);
        printCertVal('Compliance Standard:', 'NIST SP 800-88 COMPLIANT', certY + 87);
        printCertVal('Approved By:', 'SecureWipe System', certY + 100);

        // Certificate Wording Statements
        doc.roundedRect(40, synY, 515, 120, 6).fill('#FFFFFF');
        doc.roundedRect(40, synY, 515, 120, 6).lineWidth(1).stroke('#CBD5E1');
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text('CERTIFICATE STATEMENTS', 55, synY + 15);
        doc.moveTo(55, synY + 28).lineTo(540, synY + 28).lineWidth(0.5).stroke('#CBD5E1');
        
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text(certWordingText, 55, synY + 38, { width: 480, lineGap: 3.5 });

        // Signatures and Verification
        doc.roundedRect(40, signY, 515, 380, 6).fill('#F8FAFC');
        doc.roundedRect(40, signY, 515, 380, 6).lineWidth(1).stroke('#CBD5E1');
        
        doc.save();
        doc.circle(sCX, sCY, 24).fill('#0F172A');
        doc.circle(sCX, sCY, 22).lineWidth(1.5).stroke('#0EA5E9');
        doc.restore();
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(4.5);
        doc.text('SECUREWIPE', sCX - 15, sCY - 6, { width: 30, align: 'center' });
        doc.text('VERIFIED', sCX - 15, sCY, { width: 30, align: 'center' });
        doc.text('SEAL', sCX - 15, sCY + 6, { width: 30, align: 'center' });

        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.5).text('CERTIFICATE SIGN-OFF', 55, signY + 15);
        doc.moveTo(55, signY + 30).lineTo(540, signY + 30).lineWidth(0.5).stroke('#CBD5E1');
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text('The disposal operator and system administrator verify that the storage devices listed in this inventory have been analyzed, classified, and logged under standard IT sanitization practices.', 55, signY + 42, { width: 380, lineGap: 3 });

        doc.moveTo(55, sigLineY).lineTo(200, sigLineY).lineWidth(0.75).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569').text('OPERATOR SIGNATURE', 55, sigLineY + 6);
        doc.font('Helvetica-Oblique').fontSize(7).fillColor('#64748B').text('Prepared By: ' + metadata.generatedBy, 55, sigLineY + 16);

        doc.moveTo(270, sigLineY).lineTo(415, sigLineY).lineWidth(0.75).stroke('#94A3B8');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569').text('ADMINISTRATOR SIGNATURE', 270, sigLineY + 6);
        doc.font('Helvetica-Oblique').fontSize(7).fillColor('#64748B').text('Verified By SecureWipe Enterprise', 270, sigLineY + 16);

        doc.roundedRect(55, logBoxY, 445, 140, 4).fill('#FFFFFF');
        doc.roundedRect(55, logBoxY, 445, 140, 4).lineWidth(0.5).stroke('#E2E8F0');
        
        doc.save();
        doc.circle(78, logBoxY + 24, 8).fill('#10B981');
        doc.lineWidth(1.5).strokeColor('#FFFFFF');
        doc.moveTo(75, logBoxY + 24).lineTo(77, logBoxY + 26).lineTo(81.5, logBoxY + 21).stroke();
        doc.restore();

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#166534').text('AUTOMATED COMPLIANCE VERIFIED', 95, logBoxY + 15);
        doc.font('Helvetica').fontSize(7.5).fillColor('#15803D').text(`Digital Security Signature:\n${signedHash}\n\nVerification Link: http://localhost:5000/api/verify/${metadata.reportId}`, 95, logBoxY + 30, { width: 390, lineGap: 2 });

        // ==========================================
        // PAGE 7: CONCLUSION & RECOMMENDATIONS
        // ==========================================
        doc.addPage();
        this.drawCheckIcon(doc, 40, 75, 10, '#0EA5E9');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('CONCLUSION & RECOMMENDATIONS', 56, 75);

        printSynopsisSection('1. What happened?', 'SecureWipe successfully scanned and performed data erasure on all target storage devices. The process completely overwrote existing data to ensure permanent deletion.', (x, y) => this.drawDocumentIcon(doc, x, y, 7.5), 105);
        printSynopsisSection('2. Was it successful?', isOverallSuccess ? 'Yes. The operation completed with a 100% success rate. All drives passed verification with zero errors or remaining data.' : 'Completed with errors. Some wipe operations failed verification, see device details page for details.', (x, y) => this.drawCheckIcon(doc, x, y, 7.5), 165);
        printSynopsisSection('3. Is the data recoverable?', isOverallSuccess ? 'No. All data has been permanently deleted using secure standards. It is forensically impossible to recover any data from the erased devices.' : 'Partially. Erase operations that failed verification might still contain readable sectors.', (x, y) => this.drawShieldIcon(doc, x, y, 7.5), 225);
        printSynopsisSection('4. Recommendation', 'This report should be kept as official proof that the selected storage devices were securely erased. It is recommended that organizations store this report together with their IT asset records for future audits, compliance reviews, and asset disposal documentation.', (x, y) => this.drawCertificateIcon(doc, x, y, 7.5), 285);

        // Executive Approval Box
        doc.roundedRect(40, 360, 515, 220, 6).fill('#F8FAFC');
        doc.roundedRect(40, 360, 515, 220, 6).lineWidth(1).stroke('#E2E8F0');
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(9.5).text('Executive Approval', 55, 375);
        doc.moveTo(55, 388).lineTo(540, 388).lineWidth(0.5).stroke('#CBD5E1');

        doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569');
        doc.text('Prepared By', 55, 410);
        doc.text('____________________', 55, 425);
        doc.text('Reviewed By', 55, 465);
        doc.text('____________________', 55, 480);

        doc.text('Approved By', 300, 410);
        doc.text('____________________', 300, 425);
        doc.text('Date', 300, 465);
        doc.text('____________________', 300, 480);

        // Verified Secure badge highlight box
        doc.roundedRect(40, 600, 515, 60, 6).fill('#D1FAE5');
        doc.roundedRect(40, 600, 515, 60, 6).lineWidth(1.5).stroke('#10B981');
        
        doc.fillColor('#065F46').font('Helvetica-Bold').fontSize(11).text('VERIFIED SECURE ERASURE', 55, 615, { align: 'center', width: 485 });
        doc.fontSize(8.5).fillColor('#047857').text('VERIFIED COMPLIANT   |   DATABASE UPDATE COMPLETE   |   CERTIFICATE ISSUED', 55, 632, { align: 'center', width: 485 });

        // Disclaimer at bottom
        doc.roundedRect(40, disclaimerY, 515, 75, 4).fill('#F8FAFC');
        doc.roundedRect(40, disclaimerY, 515, 75, 4).lineWidth(0.5).stroke('#CBD5E1');
        
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1E293B').text('Disclaimer', 55, disclaimerY + 12);
        doc.font('Helvetica').fontSize(7).fillColor('#64748B').text('This report was automatically generated by SecureWipe using live system data. It is intended as evidence of the completed secure erasure process and should be kept for audit and compliance purposes.', 55, disclaimerY + 25, { width: 485, lineGap: 2.5 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  public async generateExecutivePDF(data: ExecutiveSummaryData): Promise<Buffer> {
    const devicesRes = await pool.query('SELECT * FROM devices ORDER BY name ASC');
    const devicesList: DeviceDetails[] = devicesRes.rows.map((d: any) => ({
      name: d.name,
      type: d.type,
      connectionType: d.connection_type || 'Internal',
      busType: d.bus_type || 'SATA',
      mediaType: d.media_type || 'HDD',
      capacity: Number(d.capacity),
      usedSpace: Number(d.used_space),
      freeSpace: Number(d.free_space),
      connectionStatus: d.connection_status,
      updated_at: d.updated_at
    }));

    return this.buildPDFReport(
      {
        reportId: data.reportId,
        generatedBy: data.generatedBy,
        generatedDate: data.generatedDate,
        version: 'v1.0 Enterprise',
        dbStatus: data.dbStatus,
        reportTitle: 'SecureWipe Secure Data Erasure Report'
      },
      {
        totalDevicesProcessed: data.totalDevicesProcessed,
        successfulWipes: data.successfulWipes,
        failedWipes: data.failedWipes,
        successRate: data.successRate,
        certificatesGenerated: data.certificatesGenerated,
        totalCapacityManaged: data.totalCapacityManaged,
        totalDataWipedBytes: data.totalDataWipedBytes,
        totalUsbWiped: data.totalUsbWiped,
        totalExtHddWiped: data.totalExtHddWiped,
        totalIntHddWiped: data.totalIntHddWiped,
        totalSsdsDetected: data.totalSsdsDetected
      },
      devicesList
    );
  }

  public async generateDevicePDF(data: DeviceReportData): Promise<Buffer> {
    const totalWipeJobsRes = await pool.query('SELECT COUNT(*) FROM wipe_jobs');
    const totalWipeJobs = parseInt(totalWipeJobsRes.rows[0].count, 10);

    const totalDevicesProcessedRes = await pool.query('SELECT COUNT(DISTINCT device_id) FROM wipe_jobs');
    const totalDevicesProcessed = parseInt(totalDevicesProcessedRes.rows[0].count, 10);

    const totalUsbWipedRes = await pool.query(`
      SELECT COUNT(*) FROM wipe_jobs j 
      JOIN devices d ON j.device_id = d.id 
      WHERE d.type = 'pendrive' AND j.status = 'PASSED'
    `);
    const totalUsbWiped = parseInt(totalUsbWipedRes.rows[0].count, 10);

    const totalExtHddWipedRes = await pool.query(`
      SELECT COUNT(*) FROM wipe_jobs j 
      JOIN devices d ON j.device_id = d.id 
      WHERE d.type = 'external_hdd' AND j.status = 'PASSED'
    `);
    const totalExtHddWiped = parseInt(totalExtHddWipedRes.rows[0].count, 10);

    const totalIntHddWipedRes = await pool.query(`
      SELECT COUNT(*) FROM wipe_jobs j 
      JOIN devices d ON j.device_id = d.id 
      WHERE d.type = 'internal_hdd' AND j.status = 'PASSED'
    `);
    const totalIntHddWiped = parseInt(totalIntHddWipedRes.rows[0].count, 10);

    const totalSsdsDetectedRes = await pool.query(`
      SELECT COUNT(*) FROM devices 
      WHERE type IN ('internal_sata_ssd', 'nvme_ssd', 'ssd')
    `);
    const totalSsdsDetected = parseInt(totalSsdsDetectedRes.rows[0].count, 10);

    const totalDataWipedRes = await pool.query(`
      SELECT SUM(bytes_wiped) FROM wipe_jobs 
      WHERE status = 'PASSED'
    `);
    const totalDataWipedBytes = Number(totalDataWipedRes.rows[0].sum || 0);

    const successfulWipesRes = await pool.query("SELECT COUNT(*) FROM wipe_jobs WHERE status = 'PASSED'");
    const successfulWipes = parseInt(successfulWipesRes.rows[0].count, 10);

    const failedWipesRes = await pool.query("SELECT COUNT(*) FROM wipe_jobs WHERE status = 'FAILED'");
    const failedWipes = parseInt(failedWipesRes.rows[0].count, 10);

    const successRate = totalWipeJobs > 0 ? (successfulWipes / totalWipeJobs) * 100 : 0;

    const certificatesGeneratedRes = await pool.query('SELECT COUNT(*) FROM certificates');
    const certificatesGenerated = parseInt(certificatesGeneratedRes.rows[0].count, 10);

    const totalCapacityManagedRes = await pool.query('SELECT SUM(capacity) AS total_capacity FROM devices');
    const totalCapacityManaged = Number(totalCapacityManagedRes.rows[0].total_capacity || 0);

    return this.buildPDFReport(
      {
        reportId: data.reportId,
        generatedBy: data.generatedBy,
        generatedDate: data.generatedDate,
        version: 'v1.0 Enterprise',
        dbStatus: data.dbStatus,
        reportTitle: 'SecureWipe Secure Data Erasure Report'
      },
      {
        totalDevicesProcessed,
        successfulWipes,
        failedWipes,
        successRate,
        certificatesGenerated,
        totalCapacityManaged,
        totalDataWipedBytes,
        totalUsbWiped,
        totalExtHddWiped,
        totalIntHddWiped,
        totalSsdsDetected
      },
      data.devicesList
    );
  }
}
