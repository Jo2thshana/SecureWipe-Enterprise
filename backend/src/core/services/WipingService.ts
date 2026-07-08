export type WipeAlgorithm = 'single_pass' | 'double_pass' | 'dod_3pass' | 'schneier_7pass';

export interface WipeProgress {
  jobId: string;
  stage: 'scanning' | 'erasing' | 'verifying' | 'completed' | 'failed';
  percent: number;
  currentPass: number;
  totalPasses: number;
  bytesWritten: number;
  totalBytes: number;
  currentBlockIndex: number;
  totalBlocks: number;
  activeHexBlock: string; // hex representation of current block
  error?: string | null; // error details if stage is 'failed'
  totalFiles?: number;
  filesProcessed?: number;
  message?: string;
}

export interface WipingService {
  startFullWipe(deviceId: string, devicePath: string, algorithm: WipeAlgorithm, isSimulation: boolean): Promise<string>;
  startSelectiveWipe(deviceId: string, filePaths: string[], algorithm: WipeAlgorithm, isSimulation: boolean): Promise<string>;
  getWipeProgress(jobId: string): Promise<WipeProgress | null>;
  cancelWipe(jobId: string): Promise<boolean>;
}
