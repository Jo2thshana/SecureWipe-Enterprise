import { WipeMode, WipeType, VerificationStatus } from './Enums';

export class WipeJob {
  public id: string;
  public deviceId: string;
  public userId: string;
  public mode: WipeMode;
  public type: WipeType;
  public algorithm_used: string;
  public status: VerificationStatus;
  public confidence_score: number; // e.g. 99.8
  public bytesWiped: number;
  public totalBytes: number;
  public totalFiles: number | null;
  public succeededFiles: number | null;
  public failedFiles: number | null;
  public successRate: number | null;
  public error: string | null;
  public created_at: Date;
  public updated_at: Date;

  constructor(data: {
    id: string;
    deviceId: string;
    userId: string;
    mode: WipeMode;
    type: WipeType;
    algorithm_used: string;
    status?: VerificationStatus;
    confidence_score?: number;
    bytesWiped?: number;
    totalBytes?: number;
    totalFiles?: number | null;
    succeededFiles?: number | null;
    failedFiles?: number | null;
    successRate?: number | null;
    error?: string | null;
    created_at?: Date;
    updated_at?: Date;
  }) {
    this.id = data.id;
    this.deviceId = data.deviceId;
    this.userId = data.userId;
    this.mode = data.mode;
    this.type = data.type;
    this.algorithm_used = data.algorithm_used;
    this.status = data.status || VerificationStatus.PENDING;
    this.confidence_score = data.confidence_score || 0;
    this.bytesWiped = data.bytesWiped || 0;
    this.totalBytes = data.totalBytes || 0;
    this.totalFiles = data.totalFiles !== undefined ? data.totalFiles : null;
    this.succeededFiles = data.succeededFiles !== undefined ? data.succeededFiles : null;
    this.failedFiles = data.failedFiles !== undefined ? data.failedFiles : null;
    this.successRate = data.successRate !== undefined ? data.successRate : null;
    this.error = data.error || null;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }
}
