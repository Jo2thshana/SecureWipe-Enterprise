import React from 'react';
import { HardDrive, PlayCircle, FolderOpen, RefreshCcw, ShieldAlert, Lock } from 'lucide-react';
import GlassCard from './common/GlassCard';
import Button from './common/Button';

export default function DeviceCard({ device, onAnalyze, onFullWipe, onSelectiveWipe, loading = false }) {
  const { id, name, type, capacity, usedSpace, freeSpace, connectionStatus, path, risk_level, busType, connectionType, mediaType } = device;

  const isLocked = device.isOSDisk || !device.isSafe;
  const isSSD = type === 'ssd' || type === 'internal_sata_ssd' || type === 'nvme_ssd';

  // Format bytes to human readable sizes (GB/MB)
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usedPercent = Math.min(100, Math.floor((usedSpace / capacity) * 100));

  const getRiskColors = (risk) => {
    switch (risk) {
      case 'critical': return 'bg-red-950 text-red-400 border-red-500 shadow-neon-red';
      case 'high': return 'bg-amber-950 text-amber-400 border-amber-500';
      case 'medium': return 'bg-yellow-950 text-yellow-400 border-yellow-500';
      case 'low':
      default:
        return 'bg-emerald-950 text-emerald-400 border-emerald-500';
    }
  };

  const getDeviceTypeLabel = (type) => {
    switch (type) {
      case 'pendrive': return 'USB Removable';
      case 'external_hdd': return 'External HDD';
      case 'internal_hdd': return 'Internal HDD';
      case 'internal_sata_ssd': return 'Internal SATA SSD';
      case 'nvme_ssd': return 'NVMe SSD';
      case 'ssd': return 'Internal SSD';
      default: return 'Storage Node';
    }
  };

  return (
    <GlassCard glowColor={isLocked ? 'danger' : isSSD ? 'warning' : 'purple'} className={`flex flex-col h-full hover:scale-[1.01] transition-transform duration-200 border-cyber-border bg-slate-950 bg-opacity-70 ${isLocked ? 'border-red-950 border-opacity-60 shadow-neon-red' : isSSD ? 'border-amber-950 border-opacity-60 shadow-neon-amber' : ''}`}>
      {/* Header info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-lg bg-slate-900 border text-cyber-secondary ${isLocked ? 'border-red-800 text-red-400 shadow-neon-red' : isSSD ? 'border-amber-800 text-amber-400 shadow-neon-amber' : 'border-cyber-border shadow-neon-cyan'}`}>
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 truncate w-40">{name}</h4>
            <span className="text-[10px] text-cyber-muted font-semibold tracking-wider uppercase">
              {getDeviceTypeLabel(type)} | {path}
            </span>
          </div>
        </div>
        {isLocked ? (
          <span className="text-[9px] px-2 py-0.5 border border-red-500 bg-red-950 text-red-400 rounded-full font-bold uppercase tracking-widest flex items-center space-x-1">
            <Lock className="w-2.5 h-2.5" />
            <span>OS Locked</span>
          </span>
        ) : isSSD ? (
          <span className="text-[9px] px-2 py-0.5 border border-amber-500 bg-amber-950 text-amber-400 rounded-full font-bold uppercase tracking-widest">
            SSD Detected
          </span>
        ) : (
          <span className={`text-[9px] px-2 py-0.5 border rounded-full font-bold uppercase tracking-widest ${getRiskColors(risk_level)}`}>
            {risk_level} Risk
          </span>
        )}
      </div>

      {/* Capacity progress */}
      <div className="space-y-2 flex-grow mb-4">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-400">Used: {formatBytes(usedSpace)}</span>
          <span className="text-cyber-muted">Total: {formatBytes(capacity)}</span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div 
            className={`h-full rounded-full ${isLocked ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-neon-red' : isSSD ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-neon-amber' : 'bg-gradient-to-r from-purple-500 to-cyan-400 shadow-neon-purple'}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-cyber-muted font-medium">
          <span>{usedPercent}% Allocated</span>
          <span>Free: {formatBytes(freeSpace)}</span>
        </div>

        {/* Detailed Hardware Spec Sheet */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-3 border-t border-slate-900 border-opacity-40 text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
          <div>Storage: <span className="text-slate-300 font-bold">{mediaType || 'Unspecified'}</span></div>
          <div>Bus Type: <span className="text-slate-300 font-bold">{busType || 'Unknown'}</span></div>
          <div>Connection: <span className="text-slate-300 font-bold">{connectionType || 'Internal'}</span></div>
          <div>Status: <span className={isSSD ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>{isSSD ? "SSD Detected" : "Ready for Wipe"}</span></div>
        </div>
      </div>

      {/* SSD diagnostics roadmap info panel */}
      {isSSD && (
        <div className="mb-4 p-3 bg-amber-950 bg-opacity-20 border border-amber-900 border-opacity-30 rounded-lg space-y-1.5 text-[9px] text-amber-400">
          <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-amber-500">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Diagnostics Interface Active</span>
          </div>
          <div className="pl-5 space-y-1 text-slate-300">
            <div className="flex items-center"><span className="text-emerald-400 mr-1.5 font-bold">✓</span>Device Detection</div>
            <div className="flex items-center"><span className="text-emerald-400 mr-1.5 font-bold">✓</span>Device Analysis</div>
            <div className="flex items-center"><span className="text-emerald-400 mr-1.5 font-bold">✓</span>File Browsing</div>
            <div className="text-[8px] text-amber-500 font-semibold border-t border-amber-900 border-opacity-30 pt-1 mt-1">
              • Roadmap: Advanced SSD Secure Erase (Future)
            </div>
          </div>
        </div>
      )}

      {/* OS disk write protection warning */}
      {isLocked && (
        <div className="mb-4 p-2 bg-red-950 bg-opacity-40 border border-red-900 border-opacity-40 rounded-lg flex items-center space-x-2 text-[10px] text-red-400">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>System protection active. Wiping is strictly write-blocked.</span>
        </div>
      )}

      {/* Buttons Console */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 border-opacity-60">
        <Button 
          variant="ghost" 
          onClick={() => onAnalyze(id)}
          disabled={isLocked || loading}
          className="text-xs py-2 px-1 flex items-center justify-center space-x-1.5"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Analyze</span>
        </Button>
        <Button 
          variant="primary" 
          onClick={() => onFullWipe(id)}
          disabled={isLocked || isSSD || loading}
          className="text-xs py-2 px-1 flex items-center justify-center space-x-1.5 shadow-none"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>Full Wipe</span>
        </Button>
        <Button 
          variant="secondary" 
          onClick={() => onSelectiveWipe(id)}
          disabled={isLocked || loading}
          className="text-xs py-2 px-1 flex items-center justify-center space-x-1.5 shadow-none"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>{isSSD ? 'Browse' : 'Selective'}</span>
        </Button>
      </div>
    </GlassCard>
  );
}
