export class Device {
  public id: string;
  public name: string;
  public type: 'pendrive' | 'external_hdd' | 'internal_hdd' | 'internal_sata_ssd' | 'nvme_ssd' | 'ssd' | 'other';
  public capacity: number; // Bytes
  public usedSpace: number; // Bytes
  public freeSpace: number; // Bytes
  public connectionStatus: 'connected' | 'disconnected';
  public path: string; // Mount path
  public risk_level: 'low' | 'medium' | 'high' | 'critical';
  public isOSDisk: boolean;
  public isSafe: boolean;
  public busType: string;
  public connectionType: 'Internal' | 'External';
  public mediaType: 'HDD' | 'SSD' | 'Flash' | 'Unspecified';
  public created_at: Date;
  public updated_at: Date;

  constructor(data: {
    id: string;
    name: string;
    type: 'pendrive' | 'external_hdd' | 'internal_hdd' | 'internal_sata_ssd' | 'nvme_ssd' | 'ssd' | 'other';
    capacity: number;
    usedSpace: number;
    freeSpace: number;
    connectionStatus: 'connected' | 'disconnected';
    path: string;
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
    isOSDisk?: boolean;
    isSafe?: boolean;
    busType?: string;
    connectionType?: 'Internal' | 'External';
    mediaType?: 'HDD' | 'SSD' | 'Flash' | 'Unspecified';
    created_at?: Date;
    updated_at?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.capacity = data.capacity;
    this.usedSpace = data.usedSpace;
    this.freeSpace = data.freeSpace;
    this.connectionStatus = data.connectionStatus;
    this.path = data.path;
    this.risk_level = data.risk_level || 'low';
    this.isOSDisk = data.isOSDisk || false;
    this.isSafe = data.isSafe !== undefined ? data.isSafe : true;
    this.busType = data.busType || 'Unknown';
    this.connectionType = data.connectionType || 'Internal';
    this.mediaType = data.mediaType || 'Unspecified';
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }
}
