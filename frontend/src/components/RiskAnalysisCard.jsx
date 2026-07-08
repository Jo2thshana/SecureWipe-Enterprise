import React from 'react';
import { ShieldAlert, FileText, Image, Video, ShieldCheck, Folder, HardDrive, Music, Box, Cpu, Database, Key } from 'lucide-react';
import GlassCard from './common/GlassCard';

export default function RiskAnalysisCard({ report, loading = false }) {
  if (loading) {
    return (
      <GlassCard className="text-center py-8 text-xs text-cyber-muted animate-pulse">
        Running forensic directory index...
      </GlassCard>
    );
  }

  if (!report) {
    return (
      <GlassCard className="text-center py-8 text-xs text-cyber-muted uppercase tracking-wider">
        No active data profiling reports generated.
      </GlassCard>
    );
  }

  const {
    totalFolders = 0,
    totalFiles = 0,
    totalStorageUsed = 0,
    documentsCount = 0,
    imagesCount = 0,
    videosCount = 0,
    audioCount = 0,
    archivesCount = 0,
    executablesCount = 0,
    databasesCount = 0,
    credentialsCount = 0,
    sensitiveFilesCount = 0,
    riskLevel = 'low'
  } = report;

  const getRiskDetails = (level) => {
    switch (level) {
      case 'critical':
        return {
          banner: 'border-red-500 bg-red-950 bg-opacity-40 text-red-200 shadow-neon-red',
          label: 'Critical Risk',
          desc: 'High concentration of sensitive file signatures. Secure cryptographic shredding highly recommended.'
        };
      case 'high':
        return {
          banner: 'border-amber-500 bg-amber-950 bg-opacity-40 text-amber-200',
          label: 'High Risk',
          desc: 'Identified folders containing confidential documents. Ensure multi-pass DoD erasure is run.'
        };
      case 'medium':
        return {
          banner: 'border-yellow-500 bg-yellow-950 bg-opacity-40 text-yellow-200',
          label: 'Medium Risk',
          desc: 'Standard file structures indexed. Normal overwrite schedules apply.'
        };
      case 'low':
      default:
        return {
          banner: 'border-emerald-500 bg-emerald-950 bg-opacity-40 text-emerald-200 shadow-neon-green',
          label: 'Low Risk',
          desc: 'No significant sensitive signatures located. Standard single-pass erasure is sufficient.'
        };
    }
  };

  const risk = getRiskDetails(riskLevel);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const typeDistribution = [
    { label: 'Documents', count: documentsCount, icon: FileText, color: 'text-purple-400' },
    { label: 'Images', count: imagesCount, icon: Image, color: 'text-cyan-400' },
    { label: 'Videos', count: videosCount, icon: Video, color: 'text-blue-400' },
    { label: 'Audio', count: audioCount, icon: Music, color: 'text-pink-400' },
    { label: 'Archives', count: archivesCount, icon: Box, color: 'text-yellow-400' },
    { label: 'Executables', count: executablesCount, icon: Cpu, color: 'text-orange-400' },
    { label: 'Databases', count: databasesCount, icon: Database, color: 'text-emerald-400' },
    { label: 'Certificates / Keys', count: credentialsCount, icon: Key, color: 'text-amber-400' }
  ];

  return (
    <GlassCard glowColor={riskLevel === 'critical' ? 'danger' : 'purple'} className="space-y-6">
      {/* Title */}
      <div className="flex items-center space-x-2 pb-3 border-b border-slate-800 border-opacity-50">
        <ShieldCheck className="w-5 h-5 text-cyber-secondary shadow-neon-cyan" />
        <h4 className="font-bold text-slate-200 uppercase tracking-widest text-sm">Clearance Profile Report</h4>
      </div>

      {/* Risk Alert Banner */}
      <div className={`p-4 border rounded-xl flex items-start space-x-3 ${risk.banner}`}>
        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold text-xs uppercase tracking-wider">{risk.label}</h5>
          <p className="text-[11px] leading-relaxed mt-0.5">{risk.desc}</p>
        </div>
      </div>

      {/* Grid of Storage Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Folders */}
        <div className="p-3 bg-slate-900 bg-opacity-40 border border-cyber-border rounded-xl flex items-center space-x-3">
          <div className="p-2 bg-slate-950 rounded text-slate-300">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-cyber-muted font-bold uppercase tracking-wider block">Total Folders</span>
            <span className="text-sm font-bold text-slate-200">{totalFolders}</span>
          </div>
        </div>

        {/* Total Files */}
        <div className="p-3 bg-slate-900 bg-opacity-40 border border-cyber-border rounded-xl flex items-center space-x-3">
          <div className="p-2 bg-slate-950 rounded text-slate-300">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-cyber-muted font-bold uppercase tracking-wider block">Total Files</span>
            <span className="text-sm font-bold text-slate-200">{totalFiles}</span>
          </div>
        </div>

        {/* Total Storage Used */}
        <div className="p-3 bg-slate-900 bg-opacity-40 border border-cyber-border rounded-xl flex items-center space-x-3">
          <div className="p-2 bg-slate-950 rounded text-slate-300">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-cyber-muted font-bold uppercase tracking-wider block">Storage Used</span>
            <span className="text-xs font-bold text-slate-200">{formatBytes(totalStorageUsed)}</span>
          </div>
        </div>

        {/* Sensitive Files */}
        <div className="p-3 bg-slate-900 bg-opacity-40 border border-cyber-border rounded-xl flex items-center space-x-3">
          <div className="p-2 bg-red-950 bg-opacity-40 border border-red-900 text-cyber-danger rounded">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Sensitive Items</span>
            <span className="text-sm font-bold text-red-300">{sensitiveFilesCount}</span>
          </div>
        </div>
      </div>

      {/* File Type Distribution */}
      <div className="space-y-3 pt-3 border-t border-slate-900 border-opacity-50">
        <h5 className="text-[10px] text-cyber-muted font-bold uppercase tracking-widest">File Type Distribution</h5>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {typeDistribution.map((item) => (
            <div key={item.label} className="flex justify-between items-center py-1.5 px-3 bg-slate-950 bg-opacity-35 rounded-lg border border-slate-900">
              <div className="flex items-center space-x-2 truncate">
                <item.icon className={`w-3.5 h-3.5 ${item.color} flex-shrink-0`} />
                <span className="text-slate-400 truncate">{item.label}</span>
              </div>
              <span className="font-mono font-bold text-slate-200 pl-2">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
