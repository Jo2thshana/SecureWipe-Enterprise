import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDevices } from '../context/DeviceContext';
import FileExplorer from '../components/FileExplorer';
import GlassCard from '../components/common/GlassCard';
import { FolderSync, FolderOpen, HardDrive, ShieldAlert } from 'lucide-react';

export default function SelectiveWipe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { devices } = useDevices();
  const deviceId = searchParams.get('deviceId');

  const device = devices.find(d => d.id === deviceId);
  const isSSD = device && (device.type === 'ssd' || device.type === 'internal_sata_ssd' || device.type === 'nvme_ssd');

  const handleWipeSelect = (selectedFiles) => {
    if (isSSD) return; // Safeguard
    // Navigate to summary page passing selections
    navigate(`/wipe-summary?deviceId=${deviceId}&type=SELECTIVE&files=${encodeURIComponent(JSON.stringify(selectedFiles))}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2.5 pb-2">
        {isSSD ? (
          <>
            <FolderOpen className="w-6 h-6 text-amber-500 shadow-neon-amber" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Device File Explorer</h2>
          </>
        ) : (
          <>
            <FolderSync className="w-6 h-6 text-cyber-secondary shadow-neon-cyan" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Selective Sanitization</h2>
          </>
        )}
      </div>

      {device ? (
        <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HardDrive className="w-5 h-5 text-cyber-secondary" />
            <div>
              <h4 className="font-bold text-sm text-slate-100">{device.name}</h4>
              <p className="text-[10px] text-cyber-muted uppercase tracking-widest font-semibold">
                Path: {device.path} | Capacity: {(device.capacity / (1024 * 1024 * 1024)).toFixed(1)} GB
              </p>
            </div>
          </div>
          <span className={`text-[9px] border px-2 py-0.5 rounded font-bold uppercase tracking-widest ${
            isSSD 
              ? 'bg-amber-950 border-amber-500 text-amber-400' 
              : 'bg-slate-900 border-cyber-border text-cyber-accent'
          }`}>
            {isSSD ? 'Read Only' : 'Ready'}
          </span>
        </GlassCard>
      ) : (
        <div className="p-4 text-center text-xs text-red-400 glass-panel border-red-900 rounded-xl">
          Warning: Target device not selected or disconnected. Return to Dashboard to scan.
        </div>
      )}

      {/* SSD diagnostics roadmap info panel */}
      {device && isSSD && (
        <div className="p-4 bg-amber-950 bg-opacity-20 border border-amber-900 border-opacity-30 rounded-xl space-y-2 text-amber-400 text-xs">
          <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-amber-500">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>SSD Diagnostics Interface Active</span>
          </div>
          <p className="text-slate-300 leading-normal">
            Standard software overwrite sanitization is write-blocked for SSD media to protect physical block endurance. You are in read-only file browsing mode. Advanced SSD Secure Erase protocols will be available in a future release.
          </p>
        </div>
      )}

      {/* File Explorer Tree view */}
      <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border">
        <FileExplorer onWipeSelect={handleWipeSelect} />
      </GlassCard>
    </div>
  );
}
