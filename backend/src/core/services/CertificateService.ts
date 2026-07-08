import { VerificationStatus } from '../entities/Enums';

export interface CertificateDetails {
  id: string;
  jobId: string;
  certificateId: string;
  userName: string;
  deviceName: string;
  deviceType: string;
  algorithmUsed: string;
  wipeDate: Date;
  verificationStatus: VerificationStatus;
  confidenceScore: number;
  qrCodeData?: string;
  selectedFilesCount?: number;
  driveLetter: string;
  deviceCapacity: number;
  totalFilesSelected: number;
  totalFilesSuccessfullyWiped: number;
  totalFilesFailed: number;
  successPercentage: number;
  verificationResult: string;
}

export interface CertificateService {
  generateCertificate(details: CertificateDetails): Promise<Buffer>;
  generateQRCode(text: string): Promise<string>;
}
