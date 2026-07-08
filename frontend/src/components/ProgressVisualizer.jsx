import React, { useEffect, useState } from 'react';
import GlassCard from './common/GlassCard';

export default function ProgressVisualizer({ progress }) {
  const [hexRows, setHexRows] = useState([]);

  const safeProgress = progress || {
    percent: 0,
    stage: 'connecting',
    currentPass: 1,
    totalPasses: 3,
    currentBlockIndex: 0,
    totalBlocks: 100,
    bytesWritten: 0
  };

  const { percent, stage, currentPass, totalPasses, currentBlockIndex, totalBlocks, bytesWritten } = safeProgress;

  const getWorkflowMessage = () => {
    if (safeProgress.message) {
      return safeProgress.message;
    }

    if (stage === 'connecting') {
      return 'Device Selected';
    }

    if (percent <= 2) return "Device Selected";
    if (percent <= 5) return "Reading Device Information";
    if (percent <= 8) return "Preparing Secure Wipe";
    if (percent <= 10) return "Scanning Storage Blocks";
    if (percent <= 12) return "Secure Wipe Started";

    if (stage === 'erasing' || (percent > 12 && percent <= 79)) {
      if (totalPasses === 1) {
        if (percent <= 75) return "Pass 1 of 1 – Writing Random Pattern";
        return "Pass 1 Complete";
      } else if (totalPasses === 3) {
        if (currentPass === 1) {
          if (percent <= 30) return "Pass 1 of 3 – Writing Zero Pattern (0x00)";
          return "Pass 1 Complete";
        } else if (currentPass === 2) {
          if (percent <= 53) return "Pass 2 of 3 – Writing One Pattern (0xFF)";
          return "Pass 2 Complete";
        } else {
          if (percent <= 75) return "Pass 3 of 3 – Writing Random Pattern";
          return "Pass 3 Complete";
        }
      } else {
        // 7 passes
        if (currentPass === 1) {
          if (percent <= 20) return "Pass 1 of 7 – Writing Zero Pattern (0x00)";
          return "Pass 1 Complete";
        } else if (currentPass === 2) {
          if (percent <= 30) return "Pass 2 of 7 – Writing One Pattern (0xFF)";
          return "Pass 2 Complete";
        } else if (currentPass === 3) {
          if (percent <= 40) return "Pass 3 of 7 – Writing Random Pattern";
          return "Pass 3 Complete";
        } else if (currentPass === 4) {
          if (percent <= 50) return "Pass 4 of 7 – Writing Alternating Pattern";
          return "Pass 4 Complete";
        } else if (currentPass === 5) {
          if (percent <= 60) return "Pass 5 of 7 – Writing Zero Pattern (0x00)";
          return "Pass 5 Complete";
        } else if (currentPass === 6) {
          if (percent <= 70) return "Pass 6 of 7 – Writing One Pattern (0xFF)";
          return "Pass 6 Complete";
        } else {
          if (percent <= 77) return "Pass 7 of 7 – Writing Random Pattern";
          return "Pass 7 Complete";
        }
      }
    }

    if (stage === 'verifying' || (percent > 79 && percent <= 94)) {
      if (percent <= 84) return "Verifying Data Removal";
      if (percent <= 89) return "Checking for Remaining Data";
      return "No Recoverable Data Found";
    }

    if (stage === 'completed' || percent > 94) {
      if (percent <= 96) return "Secure Wipe Completed";
      if (percent <= 98) return "Generating Security Certificate";
      return "Certificate Successfully Generated";
    }

    if (stage === 'failed') {
      return 'Secure Wipe Failed.';
    }

    return 'Processing...';
  };

  const getHeaderStageText = () => {
    switch (stage) {
      case 'connecting':
      case 'scanning':
        return 'SYSTEM INITIALIZATION';
      case 'erasing':
        return 'SANITIZATION PROTOCOL RUNNING';
      case 'verifying':
        return 'FORENSIC INTEGRITY AUDIT';
      case 'completed':
        return 'DESTRUCTION SANITIZATION COMPLETED';
      case 'failed':
        return 'CRITICAL SANITIZATION FAILURE';
      default:
        return 'PROCESSING';
    }
  };

  // Generate scrolling hex content
  useEffect(() => {
    const generateHexLine = () => {
      let bytes = '';

      if (stage === 'verifying' || stage === 'completed') {
        bytes = Array(8).fill('0000').join(' ');
      } else if (stage === 'erasing') {
        // Yield random hex noise
        const parts = [];
        for (let i = 0; i < 8; i++) {
          parts.push(Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase());
        }
        bytes = parts.join(' ');
      } else {
        bytes = Array(8).fill('----').join(' ');
      }

      const displayStatus = stage === 'erasing' ? `PASS ${currentPass}` : stage === 'verifying' ? 'VERIFYING' : stage === 'completed' ? 'CLEARED' : 'INITIALIZING';
      return `${bytes}  |${displayStatus}|`;
    };

    if (stage === 'erasing' || stage === 'verifying') {
      const interval = setInterval(() => {
        setHexRows(prev => {
          const updated = [...prev, generateHexLine()];
          if (updated.length > 8) updated.shift();
          return updated;
        });
      }, 100);
      return () => clearInterval(interval);
    } else if (stage === 'completed') {
      setHexRows([
        '0000 0000 0000 0000 0000 0000 0000 0000  |CLEARED|',
        '0000 0000 0000 0000 0000 0000 0000 0000  |CLEARED|',
        '0000 0000 0000 0000 0000 0000 0000 0000  |CLEARED|',
        '0000 0000 0000 0000 0000 0000 0000 0000  |CLEARED|',
        '0000 0000 0000 0000 0000 0000 0000 0000  |CLEARED|',
        '0000 0000 0000 0000 0000 0000 0000 0000  |CLEARED|'
      ]);
    } else {
      const text = stage === 'connecting' ? 'INIT' : 'SCAN';
      setHexRows(Array(6).fill(`---- ---- ---- ---- ---- ---- ---- ----  |${text}|`));
    }
  }, [stage, currentPass]);

  // Sector grid math (100 blocks total)
  const totalSectors = 100;
  const activeSectorsCount = Math.floor((percent / 100) * totalSectors);

  const getSectorColor = (index) => {
    if (stage === 'completed') {
      return 'bg-emerald-500 shadow-neon-green border-emerald-400';
    }
    if (stage === 'failed') {
      return 'bg-red-500 shadow-neon-red border-red-400';
    }

    if (index < activeSectorsCount) {
      if (stage === 'erasing') {
        return 'bg-cyber-primary shadow-neon-purple border-purple-400 animate-pulse';
      }
      if (stage === 'verifying') {
        return 'bg-cyber-secondary shadow-neon-cyan border-cyan-400 animate-pulse';
      }
    }
    
    if (stage === 'scanning' || stage === 'connecting') {
      return 'bg-slate-900 border-slate-700 animate-pulse';
    }

    return 'bg-slate-900 border-slate-800';
  };

  const getEstimatedTime = () => {
    if (stage === 'completed') return '0 Seconds';
    if (stage === 'failed') return 'N/A';
    const pctLeft = 100 - percent;
    if (pctLeft <= 0) return '0 Seconds';
    const remainingSeconds = Math.ceil((pctLeft / 100) * 15);
    return `${remainingSeconds} Seconds`;
  };

  return (
    <GlassCard className="space-y-6 bg-slate-950 bg-opacity-85 border-cyber-border">
      {/* Visual stage header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800 border-opacity-50">
        <div>
          <span className="text-[10px] text-cyber-muted tracking-widest font-semibold uppercase">Current Stage</span>
          <h4 className="text-lg font-bold text-slate-100 uppercase tracking-widest mt-0.5 font-sans">
            {getHeaderStageText()}
          </h4>
          <span className="text-xs text-cyber-secondary font-mono mt-1 block">
            {getWorkflowMessage()}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-cyber-muted font-semibold uppercase">Progress Status</span>
          <h4 className="text-xl font-black text-cyber-secondary drop-shadow-[0_0_10px_rgba(6,182,212,0.4)] mt-0.5">
            {percent}%
          </h4>
        </div>
      </div>

      {/* Main animated progress bar */}
      <div className="relative">
        <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div 
            className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-purple-500 via-violet-500 to-cyan-400 shadow-neon-purple"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Grid: Sector Blocks Visualizer */}
      <div className="space-y-2">
        <span className="text-[10px] text-cyber-muted tracking-widest font-bold uppercase block">
          Storage Sanitization Progress Matrix
        </span>
        <div className="grid grid-cols-10 gap-1.5 p-3.5 bg-slate-950 bg-opacity-70 border border-slate-900 rounded-2xl">
          {Array(totalSectors).fill(0).map((_, i) => (
            <div 
              key={i} 
              className={`aspect-square rounded border transition-colors duration-250 ${getSectorColor(i)}`}
            />
          ))}
        </div>
      </div>

      {/* Hex Dump Scroller Panel */}
      <div className="space-y-2">
        <span className="text-[10px] text-cyber-muted tracking-widest font-bold uppercase block">
          Real-Time Data Sanitization Stream
        </span>
        <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl font-mono text-[10px] text-cyan-300 text-opacity-80 space-y-1.5 overflow-hidden h-36 flex flex-col justify-center">
          {hexRows.map((row, idx) => (
            <div key={idx} className="whitespace-pre truncate leading-none">
              {row}
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      {stage === 'verifying' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-4 border-t border-slate-800 border-opacity-40">
          <div>
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider block font-bold">Files Verified</span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {safeProgress.filesProcessed || 0} / {safeProgress.totalFiles || 0}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider block font-bold">Files Remaining</span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {Math.max(0, (safeProgress.totalFiles || 0) - (safeProgress.filesProcessed || 0))}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider block font-bold">Verification Percentage</span>
            <span className="text-xs font-bold text-cyber-secondary font-mono">
              {percent}%
            </span>
          </div>
          <div>
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider block font-bold">Current File Name</span>
            <span className="text-xs font-bold text-slate-200 font-mono truncate block max-w-[140px] mx-auto" title={
              safeProgress.message && safeProgress.message.includes('File:') 
                ? safeProgress.message.split('\n').find(l => l.startsWith('File:'))?.replace('File:', '').trim() || 'N/A'
                : 'N/A'
            }>
              {safeProgress.message && safeProgress.message.includes('File:') 
                ? safeProgress.message.split('\n').find(l => l.startsWith('File:'))?.replace('File:', '').trim() || 'N/A'
                : 'N/A'}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center pt-4 border-t border-slate-800 border-opacity-40">
          <div>
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider block">Current Pass</span>
            <span className="text-xs font-bold text-slate-200 font-mono">Pass {currentPass} of {totalPasses}</span>
          </div>
          <div>
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider block">Storage Blocks Processed</span>
            <span className="text-xs font-bold text-slate-200 font-mono">{currentBlockIndex} / {totalBlocks}</span>
          </div>
          <div>
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider block">Files Processed</span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {safeProgress.filesProcessed || 0} / {safeProgress.totalFiles || 120}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider block">Est. Time Left</span>
            <span className="text-xs font-bold text-cyber-accent font-mono">{getEstimatedTime()}</span>
          </div>
          <div className="col-span-2 md:col-span-1">
            <span className="text-[9px] text-cyber-muted uppercase tracking-wider block font-bold">Sanitized Data</span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {bytesWritten > 1024 * 1024 
                ? `${(bytesWritten / (1024 * 1024)).toFixed(1)} MB` 
                : `${(bytesWritten / 1024).toFixed(1)} KB`
              }
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
