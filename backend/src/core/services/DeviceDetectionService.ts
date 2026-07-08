export interface DeviceInfo {
  id: string;
  name: string;
  type: 'pendrive' | 'external_hdd' | 'internal_hdd' | 'internal_sata_ssd' | 'nvme_ssd' | 'ssd' | 'other';
  capacity: number; // in bytes
  usedSpace: number; // in bytes
  freeSpace: number; // in bytes
  connectionStatus: 'connected' | 'disconnected';
  path: string; // OS mount point/drive letter
  isOSDisk?: boolean;
  isSafe?: boolean;
  busType?: string;
  connectionType?: 'Internal' | 'External';
  mediaType?: 'HDD' | 'SSD' | 'Flash' | 'Unspecified';
}

export interface FileNode {
  name: string;
  type: 'folder' | 'file';
  path: string; // relative to device root (e.g. /Folder/file.txt)
  size?: number; // bytes, for files
  children?: FileNode[];
  error?: string; // friendly permission/access error message
}

export interface DeviceDetectionService {
  detectDevices(): Promise<DeviceInfo[]>;
  getDeviceDetails(deviceId: string): Promise<DeviceInfo | null>;
  analyzeDeviceData(deviceId: string): Promise<{
    totalFolders: number;
    totalFiles: number;
    totalStorageUsed: number;
    documentsCount: number;
    imagesCount: number;
    videosCount: number;
    audioCount: number;
    archivesCount: number;
    executablesCount: number;
    databasesCount: number;
    credentialsCount: number;
    sensitiveFilesCount: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  getDeviceFiles(deviceId: string, dirPath?: string): Promise<FileNode[]>;
}
