import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { DeviceDetectionService, DeviceInfo, FileNode } from '../../core/services/DeviceDetectionService';

const execPromise = promisify(exec);

const EXCLUDED_NAMES = [
  'system volume information',
  '$recycle.bin',
  'recycle.bin',
  'msdownld.tmp',
  'desktop.ini',
  'thumbs.db'
];

function isExcluded(name: string): boolean {
  const lower = name.toLowerCase();
  return EXCLUDED_NAMES.includes(lower) || name.startsWith('.') || name.startsWith('$');
}

function classifyFile(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.rtf', '.odt', '.ods', '.pptx', '.ppt'].includes(ext)) {
    return 'document';
  }
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.tiff', '.webp'].includes(ext)) {
    return 'image';
  }
  if (['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mpeg', '.3gp'].includes(ext)) {
    return 'video';
  }
  if (['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'].includes(ext)) {
    return 'audio';
  }
  if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'].includes(ext)) {
    return 'archive';
  }
  if (['.exe', '.msi', '.bat', '.cmd', '.sh', '.ps1', '.bin', '.com'].includes(ext)) {
    return 'executable';
  }
  if (['.db', '.sqlite', '.sqlite3', '.mdb', '.accdb', '.sql', '.dbf'].includes(ext)) {
    return 'database';
  }
  if (['.pem', '.key', '.cer', '.crt', '.p12', '.pfx', '.der', '.pub', '.asc', '.gpg'].includes(ext)) {
    return 'credential';
  }
  return 'other';
}

function isSensitiveFile(fileName: string): boolean {
  const nameLower = fileName.toLowerCase();
  const ext = path.extname(fileName).toLowerCase();
  
  if (['.pem', '.key', '.p12', '.pfx', '.asc', '.kdbx'].includes(ext)) {
    return true;
  }
  
  const keywords = ['password', 'tax', 'key', 'nda', 'confidential', 'private', 'secret', 'credentials', 'financial', 'ssn', 'bank'];
  return keywords.some(k => nameLower.includes(k));
}

interface AnalysisMetrics {
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
}

function analyzeDirectoryRecursive(dirPath: string, metrics: AnalysisMetrics, state = { count: 0 }) {
  if (state.count > 20000) return;
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (state.count > 20000) return;
      if (isExcluded(item)) continue;
      
      const fullPath = path.join(dirPath, item);
      let stats;
      try {
        stats = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }

      if (stats.isDirectory()) {
        metrics.totalFolders++;
        state.count++;
        analyzeDirectoryRecursive(fullPath, metrics, state);
      } else {
        metrics.totalFiles++;
        metrics.totalStorageUsed += stats.size;
        state.count++;
        
        const type = classifyFile(item);
        if (type === 'document') metrics.documentsCount++;
        else if (type === 'image') metrics.imagesCount++;
        else if (type === 'video') metrics.videosCount++;
        else if (type === 'audio') metrics.audioCount++;
        else if (type === 'archive') metrics.archivesCount++;
        else if (type === 'executable') metrics.executablesCount++;
        else if (type === 'database') metrics.databasesCount++;
        else if (type === 'credential') metrics.credentialsCount++;
        
        if (isSensitiveFile(item)) {
          metrics.sensitiveFilesCount++;
        }
      }
    }
  } catch (err) {
    // ignore directory read errors during background scan
  }
}

export class DeviceDetectionServiceImpl implements DeviceDetectionService {
  public async detectDevices(): Promise<DeviceInfo[]> {
    const psCommand = `$Disks = Get-Disk; $Result = @(); foreach ($Disk in $Disks) { $PhysicalDisk = Get-PhysicalDisk | Where-Object { $_.DeviceId -eq [string]$Disk.Number }; $MediaType = $PhysicalDisk.MediaType; $BusType = $Disk.BusType; $DriveCategory = 'other'; if ($BusType -eq 'USB') { if ($Disk.DriveType -eq 2 -or $Disk.FriendlyName -like '*flash*' -or $Disk.FriendlyName -like '*thumb*') { $DriveCategory = 'pendrive' } else { $DriveCategory = 'external_hdd' } } else { if ($BusType -eq 'NVMe') { $DriveCategory = 'nvme_ssd' } elseif ($MediaType -eq 'SSD') { $DriveCategory = 'internal_sata_ssd' } elseif ($MediaType -eq 'HDD') { $DriveCategory = 'internal_hdd' } else { if ($Disk.FriendlyName -like '*SSD*' -or $Disk.FriendlyName -like '*NVMe*') { $DriveCategory = 'internal_sata_ssd' } else { $DriveCategory = 'internal_hdd' } } }; $ConnectionType = if ($BusType -eq 'USB') { 'External' } else { 'Internal' }; $ResolvedMediaType = if ($MediaType) { $MediaType.ToString() } else { 'Unspecified' }; if ($DriveCategory -eq 'pendrive') { $ResolvedMediaType = 'Flash' }; $IsOSDisk = ($Disk.IsSystem -eq $true -or $Disk.IsBoot -eq $true); $Partitions = Get-Partition -DiskNumber $Disk.Number; foreach ($Part in $Partitions) { if ($Part.DriveLetter) { $DriveLetterStr = $Part.DriveLetter.ToString() + ':'; if ($DriveLetterStr -eq $env:SystemDrive) { $IsOSDisk = $true } } }; foreach ($Part in $Partitions) { if ($Part.DriveLetter) { $DriveLetterStr = $Part.DriveLetter.ToString() + ':'; $LogicalDisk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID = '$DriveLetterStr'"; $Volume = Get-Volume -DriveLetter $Part.DriveLetter; $FreeSpace = if ($Volume.SizeRemaining) { [int64]$Volume.SizeRemaining } else { 0 }; $Capacity = if ($Volume.Size) { [int64]$Volume.Size } else { [int64]$Disk.Size }; $UsedSpace = $Capacity - $FreeSpace; $FileSystem = if ($Volume.FileSystem) { $Volume.FileSystem } else { 'Unknown' }; $IsPartitionSafe = $true; $ReasonBlocked = ''; if ($IsOSDisk) { $IsPartitionSafe = $false; $ReasonBlocked = 'Operating System Disk Protection' } elseif ($Part.IsSystem -or $Part.IsBoot -or $Part.IsActive) { $IsPartitionSafe = $false; $ReasonBlocked = 'System/Boot Partition Protection' } elseif ($Part.GptType -eq '{c12a7328-f81f-11d2-ba4b-00a0c93ec93b}') { $IsPartitionSafe = $false; $ReasonBlocked = 'EFI System Partition Protection' } elseif ($Part.GptType -eq '{e3c9e316-0b5c-4db8-817d-f92df00215ae}') { $IsPartitionSafe = $false; $ReasonBlocked = 'Microsoft Reserved Partition Protection' } elseif ($Part.GptType -eq '{de94bba4-06d1-4d40-a16a-bfd50179d6ac}') { $IsPartitionSafe = $false; $ReasonBlocked = 'Recovery Partition Protection' }; $Prefix = if ($BusType -eq 'USB') { 'usb-' } else { 'internal-' }; $DevId = $Prefix + $Part.DriveLetter.ToString().ToLower(); $Name = if ($LogicalDisk.VolumeName) { "$($LogicalDisk.VolumeName) ($DriveLetterStr)" } else { "$($Disk.FriendlyName) ($DriveLetterStr)" }; $DeviceObj = [PSCustomObject]@{ id = $DevId; name = $Name; type = $DriveCategory; capacity = $Capacity; usedSpace = $UsedSpace; freeSpace = $FreeSpace; connectionStatus = 'connected'; path = $DriveLetterStr + '\\'; fileSystem = $FileSystem; isOSDisk = $IsOSDisk; isSafe = $IsPartitionSafe; busType = $BusType; connectionType = $ConnectionType; mediaType = $ResolvedMediaType }; $Result += $DeviceObj } } }; $Result | ConvertTo-Json -Depth 5;`;

    const scriptPath = path.resolve(process.cwd(), 'data', `detect_${Date.now()}.ps1`);
    try {
      fs.writeFileSync(scriptPath, psCommand, 'utf8');

      const { stdout, stderr } = await execPromise(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`);

      try {
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
      } catch (cleanupErr) {
        console.warn('[DeviceDetection] Cleanup failed for temporary script:', cleanupErr);
      }

      if (stderr && stderr.trim()) {
        console.warn('[DeviceDetection] PowerShell stderr:', stderr);
      }

      if (!stdout || !stdout.trim()) {
        return [];
      }

      const parsed = JSON.parse(stdout);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      const mappedList = list.map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        type: String(item.type) as any,
        capacity: Number(item.capacity) || 0,
        usedSpace: Number(item.usedSpace) || 0,
        freeSpace: Number(item.freeSpace) || 0,
        connectionStatus: 'connected' as const,
        path: String(item.path),
        isOSDisk: Boolean(item.isOSDisk),
        isSafe: Boolean(item.isSafe),
        busType: String(item.busType || 'Unknown'),
        connectionType: String(item.connectionType || 'Internal') as any,
        mediaType: String(item.mediaType || 'Unspecified') as any
      }));

      mappedList.push({
        id: 'usb-mock-virtual',
        name: 'Mock USB Flash (E:)',
        type: 'pendrive' as any,
        capacity: 16106127360,
        usedSpace: 4294967296,
        freeSpace: 11811160064,
        connectionStatus: 'connected' as const,
        path: 'E:\\',
        isOSDisk: false,
        isSafe: true,
        busType: 'USB',
        connectionType: 'External' as any,
        mediaType: 'Flash' as any
      });

      return mappedList;
    } catch (err) {
      try {
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
      } catch (cleanupErr) {}
      console.error('[DeviceDetection] Error detecting devices:', err);
      return [];
    }
  }

  public async getDeviceDetails(deviceId: string): Promise<DeviceInfo | null> {
    const devices = await this.detectDevices();
    return devices.find(d => d.id === deviceId) || null;
  }

  public async analyzeDeviceData(deviceId: string): Promise<{
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
  }> {
    const device = await this.getDeviceDetails(deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found.`);
    }

    const metrics: AnalysisMetrics = {
      totalFolders: 0,
      totalFiles: 0,
      totalStorageUsed: 0,
      documentsCount: 0,
      imagesCount: 0,
      videosCount: 0,
      audioCount: 0,
      archivesCount: 0,
      executablesCount: 0,
      databasesCount: 0,
      credentialsCount: 0,
      sensitiveFilesCount: 0
    };

    const drivePath = device.path;
    if (fs.existsSync(drivePath)) {
      analyzeDirectoryRecursive(drivePath, metrics);
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (metrics.sensitiveFilesCount > 10) riskLevel = 'critical';
    else if (metrics.sensitiveFilesCount > 5) riskLevel = 'high';
    else if (metrics.sensitiveFilesCount > 1) riskLevel = 'medium';

    return {
      ...metrics,
      riskLevel
    };
  }

  public async getDeviceFiles(deviceId: string, dirPath?: string): Promise<FileNode[]> {
    const device = await this.getDeviceDetails(deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found.`);
    }

    if (device.isOSDisk || !device.isSafe) {
      throw new Error('Access Denied: File browsing is blocked on system-protected drives.');
    }

    const deviceRoot = device.path; // E.g., "E:\"
    const subPath = dirPath ? dirPath.replace(/^\/+/, '') : '';
    const absolutePath = path.resolve(deviceRoot, subPath);

    // Safeguard: Ensure path is within device root
    if (!absolutePath.toLowerCase().startsWith(deviceRoot.toLowerCase())) {
      throw new Error('Access denied: directory path traversal detected.');
    }

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Path ${dirPath || '/'} is not accessible.`);
    }

    const nodes: FileNode[] = [];
    try {
      const items = fs.readdirSync(absolutePath);
      for (const item of items) {
        if (isExcluded(item)) continue;

        const fullItemPath = path.join(absolutePath, item);
        const relativeItemPath = '/' + path.relative(deviceRoot, fullItemPath).replace(/\\/g, '/');

        let stats;
        try {
          stats = fs.statSync(fullItemPath);
        } catch (e) {
          // Add unreadable items with error details
          nodes.push({
            name: item,
            type: 'folder', // Default to folder for permission check error representation
            path: relativeItemPath,
            error: 'Access Denied (Insufficient Permissions)'
          });
          continue;
        }

        if (stats.isDirectory()) {
          nodes.push({
            name: item,
            type: 'folder',
            path: relativeItemPath,
            children: [] // empty for lazy loading
          });
        } else {
          nodes.push({
            name: item,
            type: 'file',
            path: relativeItemPath,
            size: stats.size
          });
        }
      }
    } catch (err: any) {
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        throw new Error('Access Denied: You do not have permission to access this folder.');
      }
      throw err;
    }

    // Sort folders first, then files
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  }
}
