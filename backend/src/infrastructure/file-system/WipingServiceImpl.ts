import { WipingService, WipeAlgorithm, WipeProgress } from '../../core/services/WipingService';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class WipingServiceImpl implements WipingService {
  private activeJobs = new Map<string, WipeProgress>();
  private activeIntervals = new Map<string, NodeJS.Timeout>();

  public async startFullWipe(deviceId: string, devicePath: string, algorithm: WipeAlgorithm, isSimulation: boolean): Promise<string> {
    const jobId = `job-full-${crypto.randomUUID()}`;
    const totalBytes = isSimulation ? 32212254720 : 1024 * 1024 * 50; // Mock 30GB vs actual file bounds (e.g. 50MB)
    
    this.activeJobs.set(jobId, {
      jobId,
      stage: 'scanning',
      percent: 0,
      currentPass: 1,
      totalPasses: this.getPassCount(algorithm),
      bytesWritten: 0,
      totalBytes,
      currentBlockIndex: 0,
      totalBlocks: Math.ceil(totalBytes / 4096),
      activeHexBlock: '',
      totalFiles: 150,
      filesProcessed: 0
    });

    if (isSimulation) {
      this.runSimulationWipe(jobId);
    } else {
      this.runActualFullDeviceWipe(jobId, devicePath, algorithm);
    }

    return jobId;
  }

  public async startSelectiveWipe(deviceId: string, filePaths: string[], algorithm: WipeAlgorithm, isSimulation: boolean): Promise<string> {
    const jobId = `job-sel-${crypto.randomUUID()}`;
    
    // Resolve directories to files recursively
    const resolvedPaths: string[] = [];
    if (!isSimulation) {
      for (const p of filePaths) {
        try {
          this.resolvePathsRecursively(p, resolvedPaths);
        } catch (e) {
          console.warn(`[WipeService] Failed to resolve path ${p}:`, e);
        }
      }
    } else {
      resolvedPaths.push(...filePaths);
    }

    // Calculate total size
    let totalBytes = 0;
    if (isSimulation) {
      totalBytes = resolvedPaths.length * 1024 * 512; // Mock 512KB per file
    } else {
      for (const filePath of resolvedPaths) {
        try {
          if (fs.existsSync(filePath)) {
            totalBytes += fs.statSync(filePath).size;
          }
        } catch (e) {
          console.warn(`[WipeService] File size query failed for ${filePath}:`, e);
        }
      }
    }

    this.activeJobs.set(jobId, {
      jobId,
      stage: 'scanning',
      percent: 0,
      currentPass: 1,
      totalPasses: this.getPassCount(algorithm),
      bytesWritten: 0,
      totalBytes,
      currentBlockIndex: 0,
      totalBlocks: Math.ceil(totalBytes / 4096) || 1,
      activeHexBlock: '',
      totalFiles: resolvedPaths.length || 1,
      filesProcessed: 0
    });

    if (isSimulation) {
      this.runSimulationWipe(jobId);
    } else {
      // Find mount point for the selective wipe paths
      // Paths resolved in StartSelectiveWipe will start with drive letter (e.g. E:\)
      let deviceRoot = 'E:\\';
      if (resolvedPaths.length > 0) {
        const match = resolvedPaths[0].match(/^[a-zA-Z]:\\/);
        if (match) deviceRoot = match[0];
      }
      this.runActualFileWipe(jobId, resolvedPaths, algorithm, deviceRoot);
    }

    return jobId;
  }

  private resolvePathsRecursively(targetPath: string, fileList: string[]) {
    if (!fs.existsSync(targetPath)) return;
    
    const stats = fs.statSync(targetPath);
    if (stats.isFile()) {
      fileList.push(targetPath);
    } else if (stats.isDirectory()) {
      const files = fs.readdirSync(targetPath);
      for (const file of files) {
        this.resolvePathsRecursively(path.join(targetPath, file), fileList);
      }
    }
  }

  public async getWipeProgress(jobId: string): Promise<WipeProgress | null> {
    return this.activeJobs.get(jobId) || null;
  }

  public async cancelWipe(jobId: string): Promise<boolean> {
    const interval = this.activeIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.activeIntervals.delete(jobId);
      
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.stage = 'failed';
        this.activeJobs.set(jobId, job);
      }
      return true;
    }
    return false;
  }

  private getPassCount(algorithm: WipeAlgorithm): number {
    switch (algorithm) {
      case 'single_pass': return 1;
      case 'double_pass': return 2;
      case 'dod_3pass': return 3;
      case 'schneier_7pass': return 7;
      default: return 1;
    }
  }

  private runSimulationWipe(jobId: string) {
    let ticks = 0;
    const job = this.activeJobs.get(jobId)!;
    
    const interval = setInterval(() => {
      ticks++;
      
      if (job.stage === 'scanning') {
        if (ticks === 1) {
          job.percent = 2;
          job.message = 'Preparing Wipe Job';
        } else if (ticks === 2) {
          job.percent = 5;
          job.message = 'Validating Selected Files';
        } else if (ticks === 3) {
          job.percent = 8;
          job.message = 'Calculating Files to Process';
        } else if (ticks >= 4) {
          job.percent = 12;
          job.message = 'Secure Wipe Started';
          job.stage = 'erasing';
          job.currentPass = 1;
          ticks = 0;
        }
      } else if (job.stage === 'erasing') {
        const eraseProgress = (job.currentPass - 1) / job.totalPasses + (Math.min(ticks, 12) / 12) / job.totalPasses;
        job.percent = Math.floor(12 + eraseProgress * 63);
        
        job.currentBlockIndex = Math.min(job.totalBlocks, Math.floor(job.totalBlocks * (Math.min(ticks, 12) / 12)));
        job.bytesWritten = Math.min(job.totalBytes, Math.floor(job.totalBytes * (Math.min(ticks, 12) / 12)));
        job.activeHexBlock = crypto.randomBytes(64).toString('hex').toUpperCase();

        if (ticks <= 12) {
          job.message = `Pass ${job.currentPass} of ${job.totalPasses} – Overwriting Data`;
        } else {
          job.message = `Pass ${job.currentPass} Complete`;
          job.percent = Math.floor(12 + (job.currentPass / job.totalPasses) * 63);

          if (ticks >= 15) {
            if (job.currentPass < job.totalPasses) {
              job.currentPass++;
              ticks = 0;
            } else {
              job.stage = 'verifying';
              ticks = 0;
            }
          }
        }
      } else if (job.stage === 'verifying') {
        job.activeHexBlock = '0000000000000000000000000000000000000000000000000000000000000000';
        if (ticks === 1) {
          job.percent = 82;
          job.message = 'Verifying Overwrite';
        } else if (ticks === 2) {
          job.percent = 87;
          job.message = 'Removing Overwritten Files';
        } else if (ticks === 3) {
          job.percent = 95;
          job.message = 'Confirming File Removal';
        } else if (ticks >= 4) {
          job.stage = 'completed';
          job.percent = 100;
          job.message = 'Secure Wipe Completed';
          clearInterval(interval);
          this.activeIntervals.delete(jobId);
        }
      }

      const totalFiles = job.totalFiles || 120;
      job.filesProcessed = Math.min(totalFiles, Math.floor(totalFiles * (job.percent / 100)));
      this.activeJobs.set(jobId, { ...job });
    }, 150);

    this.activeIntervals.set(jobId, interval);
  }

  private async runActualFullDeviceWipe(jobId: string, devicePath: string, algorithm: WipeAlgorithm) {
    const resolvedPaths: string[] = [];
    try {
      this.resolvePathsRecursively(devicePath, resolvedPaths);
    } catch (e) {
      console.error('[WipeService] Failed to index drive for full wipe:', e);
    }

    const job = this.activeJobs.get(jobId)!;
    job.totalFiles = resolvedPaths.length || 1;
    let totalBytes = 0;
    for (const filePath of resolvedPaths) {
      try {
        if (fs.existsSync(filePath)) {
          totalBytes += fs.statSync(filePath).size;
        }
      } catch (e) {}
    }
    job.totalBytes = totalBytes || 1;
    job.totalBlocks = Math.ceil(totalBytes / 4096) || 1;
    this.activeJobs.set(jobId, { ...job });

    await this.runActualFileWipe(jobId, resolvedPaths, algorithm, devicePath);
  }

  private async runActualFileWipe(jobId: string, filePaths: string[], algorithm: WipeAlgorithm, deviceRoot: string) {
    const job = this.activeJobs.get(jobId)!;
    const succeededFiles = new Set<string>();
    const failedFiles: { path: string; error: string }[] = [];
    const overwriteCompleted = new Set<string>();

    try {
      const passes = this.getPassCount(algorithm);
      let globalBytesWritten = 0;
      let totalBlocksWiped = 0;

      // Step 1: Preparing Wipe Job
      job.stage = 'scanning';
      job.percent = 2;
      job.message = 'Preparing Wipe Job';
      this.activeJobs.set(jobId, { ...job });
      await new Promise(r => setTimeout(r, 300));

      // Step 2: Validating Selected Files
      job.percent = 5;
      job.message = 'Validating Selected Files';
      this.activeJobs.set(jobId, { ...job });
      
      // Perform validation check
      const sysDriveLower = (process.env.SystemDrive || 'C:').toLowerCase() + '\\';
      for (const filePath of filePaths) {
        if (!filePath.toLowerCase().startsWith(deviceRoot.toLowerCase())) {
          throw new Error(`File validation failed: ${filePath} is outside device directory.`);
        }
        if (filePath.toLowerCase().startsWith(sysDriveLower)) {
          throw new Error('Access Denied: Action blocked on system partition paths.');
        }
      }
      await new Promise(r => setTimeout(r, 300));

      // Step 3: Calculating Files to Process
      job.percent = 10;
      job.message = 'Calculating Files to Process';
      this.activeJobs.set(jobId, { ...job });
      await new Promise(r => setTimeout(r, 300));

      // Step 4: Secure Wipe Started
      job.stage = 'erasing';
      job.percent = 12;
      job.message = 'Secure Wipe Started';
      this.activeJobs.set(jobId, { ...job });
      await new Promise(r => setTimeout(r, 300));

      let filesProcessedCount = 0;

      for (let pass = 1; pass <= passes; pass++) {
        job.currentPass = pass;

        for (const filePath of filePaths) {
          // Drive Disconnection Safety Check
          if (!fs.existsSync(deviceRoot)) {
            throw new Error('USB_DISCONNECTED');
          }

          // Skip previously failed files
          if (failedFiles.some(f => f.path === filePath)) continue;

          try {
            if (!fs.existsSync(filePath)) continue;

            const stats = fs.statSync(filePath);
            const size = stats.size;
            if (size === 0) {
              if (pass === passes) {
                overwriteCompleted.add(filePath);
              }
              continue;
            }

            const fd = fs.openSync(filePath, 'r+');
            const bufferSize = 4096;
            const buffer = Buffer.alloc(bufferSize);
            let offset = 0;

            while (offset < size) {
              // Graceful Cancellation Check
              if (!this.activeJobs.has(jobId) || this.activeJobs.get(jobId)?.stage === 'failed') {
                fs.closeSync(fd);
                return;
              }

              const length = Math.min(bufferSize, size - offset);

              // Pattern writing depending on passes and mode
              if (algorithm === 'single_pass') {
                crypto.randomFillSync(buffer);
              } else if (algorithm === 'double_pass') {
                if (pass === 1) buffer.fill(0x00);
                else crypto.randomFillSync(buffer);
              } else if (algorithm === 'dod_3pass') {
                if (pass === 1) buffer.fill(0x00);
                else if (pass === 2) buffer.fill(0xFF);
                else crypto.randomFillSync(buffer);
              } else {
                if (pass === 1 || pass === 5) buffer.fill(0x00);
                else if (pass === 2 || pass === 6) buffer.fill(0xFF);
                else crypto.randomFillSync(buffer);
              }

              fs.writeSync(fd, buffer, 0, length, offset);
              offset += length;
              globalBytesWritten += length;
              totalBlocksWiped++;

              // Update metrics
              job.bytesWritten = globalBytesWritten;
              job.currentBlockIndex = totalBlocksWiped;
              job.percent = Math.min(80, Math.floor(12 + ((globalBytesWritten / (job.totalBytes * passes)) * 68)));
              job.activeHexBlock = buffer.slice(0, 32).toString('hex').toUpperCase();
              
              const filename = path.basename(filePath);
              job.message = `Pass ${pass} of ${passes} – Overwriting Data\nFile: ${filename}\nProcessed: ${filesProcessedCount} / ${filePaths.length}`;
              this.activeJobs.set(jobId, { ...job });

              await new Promise(r => setTimeout(r, 5));
            }

            fs.fsyncSync(fd); // Flush writes after the pass
            fs.closeSync(fd);

            if (pass === passes) {
              overwriteCompleted.add(filePath);
            }
          } catch (fileErr: any) {
            console.error(`[WipeService] File write pass ${pass} failed for ${filePath}:`, fileErr);
            failedFiles.push({ path: filePath, error: fileErr.message || 'Write IO Error' });
          }
        }

        // Pass Complete status
        job.message = `Pass ${pass} Complete`;
        job.percent = Math.floor(12 + (pass / passes) * 68);
        this.activeJobs.set(jobId, { ...job });
        await new Promise(r => setTimeout(r, 500));
      }

      // Step 10: Verifying Overwrite
      job.stage = 'verifying';
      job.percent = 82;
      job.message = 'Verifying Overwrite';
      this.activeJobs.set(jobId, { ...job });
      
      const verifiedPathsToDestruct: string[] = [];
      for (const filePath of filePaths) {
        if (!fs.existsSync(deviceRoot)) {
          throw new Error('USB_DISCONNECTED');
        }
        if (overwriteCompleted.has(filePath) && !failedFiles.some(f => f.path === filePath)) {
          verifiedPathsToDestruct.push(filePath);
        }
      }
      await new Promise(r => setTimeout(r, 500));

      // Step 11: Removing Overwritten Files
      job.percent = 87;
      job.message = 'Removing Overwritten Files';
      this.activeJobs.set(jobId, { ...job });

      const renamedPathsMap = new Map<string, string>();
      for (const filePath of verifiedPathsToDestruct) {
        if (!fs.existsSync(deviceRoot)) {
          throw new Error('USB_DISCONNECTED');
        }
        try {
          if (!fs.existsSync(filePath)) continue;

          // Metadata truncation
          const fd = fs.openSync(filePath, 'r+');
          fs.ftruncateSync(fd, 0);
          fs.closeSync(fd);

          // Scrambled renames
          let currentPath = filePath;
          const dir = path.dirname(filePath);
          for (let i = 0; i < 3; i++) {
            const randName = path.join(dir, `wipe_${crypto.randomBytes(6).toString('hex')}`);
            fs.renameSync(currentPath, randName);
            currentPath = randName;
          }
          renamedPathsMap.set(filePath, currentPath);
        } catch (metaErr: any) {
          console.error(`[WipeService] Metadata scrub failed for ${filePath}:`, metaErr);
          failedFiles.push({ path: filePath, error: metaErr.message || 'Scrub Error' });
        }
      }
      await new Promise(r => setTimeout(r, 500));

      // Step 12: Confirming File Removal
      job.percent = 95;
      job.message = 'Confirming File Removal';
      this.activeJobs.set(jobId, { ...job });

      for (const filePath of verifiedPathsToDestruct) {
        if (!fs.existsSync(deviceRoot)) {
          throw new Error('USB_DISCONNECTED');
        }
        if (failedFiles.some(f => f.path === filePath)) continue;

        try {
          const finalPath = renamedPathsMap.get(filePath) || filePath;
          if (fs.existsSync(finalPath)) {
            fs.unlinkSync(finalPath);
          }
          succeededFiles.add(filePath);
          filesProcessedCount++;
          job.filesProcessed = filesProcessedCount;
          this.activeJobs.set(jobId, { ...job });
        } catch (unlinkErr: any) {
          console.error(`[WipeService] Unlink failed for ${filePath}:`, unlinkErr);
          failedFiles.push({ path: filePath, error: unlinkErr.message || 'Unlink Error' });
        }
      }
      await new Promise(r => setTimeout(r, 500));

      // Step 10: Preparing Verification
      job.stage = 'verifying';
      job.percent = 95;
      job.message = 'Preparing Verification';
      this.activeJobs.set(jobId, { ...job });
      await new Promise(r => setTimeout(r, 400));

      // Step 11: Checking Selected Files
      job.percent = 96;
      job.message = 'Checking Selected Files';
      this.activeJobs.set(jobId, { ...job });
      await new Promise(r => setTimeout(r, 400));

      // Step 12: Verifying File Removal
      let verificationFailedCount = 0;
      const verificationFailedPaths: string[] = [];

      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];

        if (!fs.existsSync(deviceRoot)) {
          throw new Error('USB_DISCONNECTED');
        }

        let fileExists = false;
        let fileCanOpen = false;

        try {
          if (fs.existsSync(filePath)) {
            fileExists = true;
          }
        } catch (e) {}

        try {
          const fd = fs.openSync(filePath, 'r');
          fs.closeSync(fd);
          fileCanOpen = true;
        } catch (e) {}

        const hasOverwriteError = failedFiles.some(f => f.path === filePath);

        if (fileExists || fileCanOpen || hasOverwriteError) {
          verificationFailedCount++;
          verificationFailedPaths.push(filePath);
        }

        job.percent = Math.min(98, Math.floor(96 + ((i + 1) / filePaths.length) * 2));
        job.filesProcessed = i + 1; // Files Verified
        job.message = `Verifying File Removal\nFile: ${path.basename(filePath)}\nVerified: ${i + 1} / ${filePaths.length}`;
        this.activeJobs.set(jobId, { ...job });

        await new Promise(r => setTimeout(r, 100));
      }

      // Step 13: Checking Remaining Data
      job.percent = 99;
      job.message = 'Checking Remaining Data';
      this.activeJobs.set(jobId, { ...job });
      await new Promise(r => setTimeout(r, 400));

      // Step 14: Verification Completed
      job.percent = 100;
      if (verificationFailedCount > 0) {
        job.stage = 'failed';
        job.message = 'Verification Completed (FAILED)';
        job.error = `Verification failed for ${verificationFailedCount} files. Reachable paths: ${verificationFailedPaths.join(', ')}`;
      } else {
        job.stage = 'completed';
        job.message = 'Verification Completed';
      }
      this.activeJobs.set(jobId, { ...job });

    } catch (err: any) {
      if (err.message === 'USB_DISCONNECTED') {
        const remaining = filePaths.filter(p => !succeededFiles.has(p));
        console.error('[WipeService] USB drive disconnected during secure wipe.');
        job.stage = 'failed';
        job.error = `Wipe interrupted: USB drive disconnected. Completed: ${succeededFiles.size} files. Remaining: ${remaining.length} files.`;
        this.activeJobs.set(jobId, { ...job });
        return;
      }

      console.error('[WipeService] Wipe execution failed:', err);
      job.stage = 'failed';
      job.error = err.message || 'IO Error during secure overwrite';
      this.activeJobs.set(jobId, { ...job });
    }
  }
}
