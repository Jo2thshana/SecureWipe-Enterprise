export interface VerificationReport {
  jobId: string;
  recoverableFiles: number;
  confidenceScore: number; // e.g., 99.8
  status: 'passed' | 'failed';
  verifiedAt: Date;
  details: string;
  totalFiles: number;
  succeededFiles: number;
  failedFiles: number;
  successRate: number; // e.g., 100.00
}

export interface VerificationService {
  verifyDeviceWipe(jobId: string, devicePath: string, isSimulation: boolean): Promise<VerificationReport>;
  verifyFilesWipe(jobId: string, filePaths: string[], isSimulation: boolean): Promise<VerificationReport>;
}
