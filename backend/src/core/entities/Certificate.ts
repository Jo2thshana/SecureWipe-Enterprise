import { VerificationStatus } from './Enums';

export class Certificate {
  public id: string;
  public jobId: string;
  public certificateId: string; // Public reference ID/hash
  public userName: string; // Snapshot of the operator
  public deviceName: string;
  public deviceType: string;
  public algorithm_used: string;
  public wipeDate: Date;
  public verificationStatus: VerificationStatus;
  public confidence_score: number;
  public qrCodeData: string; // QR base64/URL
  public created_at: Date;
  public updated_at: Date;

  constructor(data: {
    id: string;
    jobId: string;
    certificateId: string;
    userName: string;
    deviceName: string;
    deviceType: string;
    algorithm_used: string;
    wipeDate: Date;
    verificationStatus: VerificationStatus;
    confidence_score: number;
    qrCodeData: string;
    created_at?: Date;
    updated_at?: Date;
  }) {
    this.id = data.id;
    this.jobId = data.jobId;
    this.certificateId = data.certificateId;
    this.userName = data.userName;
    this.deviceName = data.deviceName;
    this.deviceType = data.deviceType;
    this.algorithm_used = data.algorithm_used;
    this.wipeDate = data.wipeDate;
    this.verificationStatus = data.verificationStatus;
    this.confidence_score = data.confidence_score;
    this.qrCodeData = data.qrCodeData;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }
}
