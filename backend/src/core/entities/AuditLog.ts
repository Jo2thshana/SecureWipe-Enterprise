export class AuditLog {
  public id: string;
  public userId: string | null; // null for system/anonymous operations
  public action: string;
  public details: string;
  public signature: string; // HMAC SHA256 signature
  public created_at: Date;
  public updated_at: Date;

  constructor(data: {
    id: string;
    userId: string | null;
    action: string;
    details: string;
    signature: string;
    created_at?: Date;
    updated_at?: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.action = data.action;
    this.details = data.details;
    this.signature = data.signature;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }
}
