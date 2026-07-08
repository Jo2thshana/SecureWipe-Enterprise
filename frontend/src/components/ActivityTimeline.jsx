import React from 'react';
import { History, ShieldCheck, ShieldAlert, KeyRound, HardDrive, CheckCircle } from 'lucide-react';
import GlassCard from './common/GlassCard';

export default function ActivityTimeline({ logs = [], loading = false }) {
  const getActionColors = (action = '') => {
    const act = action.toUpperCase();
    if (act.includes('COMPLETED') || act.includes('PASSED') || act === 'LOGIN' || act === 'LOGOUT') {
      return 'text-emerald-400 bg-emerald-950 border-emerald-500';
    }
    if (act.includes('FAILED')) {
      return 'text-red-400 bg-red-950 border-red-500';
    }
    if (act.includes('STARTED') || act.includes('PENDING') || act.includes('PROGRESS')) {
      return 'text-cyan-400 bg-cyan-950 border-cyan-500';
    }
    return 'text-slate-400 bg-slate-800 border-slate-700';
  };

  const getActionIcon = (action = '') => {
    const act = action.toUpperCase();
    if (act.includes('COMPLETED') || act.includes('PASSED')) return CheckCircle;
    if (act.includes('FAILED')) return ShieldAlert;
    if (act.includes('STARTED') || act.includes('PENDING')) return HardDrive;
    if (act === 'LOGIN') return KeyRound;
    return History;
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-xs text-cyber-muted animate-pulse">
        Polling audit log streams...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-cyber-muted uppercase tracking-wider">
        No recent activities logged on console.
      </div>
    );
  }

  return (
    <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border space-y-6">
      <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-800 border-opacity-50">
        <History className="w-5 h-5 text-cyber-secondary shadow-neon-cyan" />
        <h4 className="font-bold text-slate-200 uppercase tracking-widest text-sm">Clearance Activity Ledger</h4>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
        {logs.map((log) => {
          const action = log.action || (log.type ? `${log.type}_WIPE_${log.status || ''}` : 'SYSTEM_EVENT');
          const details = log.details || `Wipe job (${log.id?.substring(0, 8)}) on device. Algorithm: ${log.algorithm_used || 'N/A'}`;
          
          const Icon = getActionIcon(action);
          const isVerified = log.isSignatureVerified !== false;

          return (
            <div key={log.id} className="relative group">
              {/* Timeline dot */}
              <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] z-10 ${getActionColors(action)}`}>
                <Icon className="w-2.5 h-2.5" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    {action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[9px] text-cyber-muted font-medium">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-normal">{details}</p>

                {/* Cryptographic check badge */}
                <div className="flex items-center space-x-1.5 pt-0.5">
                  {isVerified ? (
                    <span className="inline-flex items-center text-[9px] text-emerald-400 font-bold bg-emerald-950 bg-opacity-35 px-1.5 py-0.5 rounded border border-emerald-900">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Ledger Signature Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[9px] text-red-400 font-bold bg-red-950 bg-opacity-35 px-1.5 py-0.5 rounded border border-red-900 animate-pulse">
                      <ShieldAlert className="w-3 h-3 mr-1" />
                      Ledger Tampered
                    </span>
                  )}
                  <span className="text-[8px] text-slate-600 font-mono">
                    ID: {log.id ? log.id.substring(0, 12) : 'N/A'}...
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
