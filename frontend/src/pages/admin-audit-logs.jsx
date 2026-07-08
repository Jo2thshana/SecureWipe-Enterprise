import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import ActivityTimeline from '../components/ActivityTimeline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import WarningAlert from '../components/common/WarningAlert';
import { Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';

export default function AdminAuditLogs() {
  const { showNotification } = useNotifications();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/activity-logs')
      .then(res => {
        setLogs(res.data.data.logs);
      })
      .catch(err => {
        console.error(err);
        showNotification('Failed to retrieve system audit logs.', 'danger', 'Admin Error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [showNotification]);

  const tamperedLogsCount = logs.filter(l => l.isSignatureVerified === false).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800 border-opacity-50">
        <Activity className="w-6 h-6 text-cyber-secondary shadow-neon-cyan" />
        <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">System Security Audit Ledger</h2>
      </div>

      {/* Warnings & Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {tamperedLogsCount > 0 ? (
            <WarningAlert 
              title="SECURITY ALARM: SYSTEM LEDGER CORRUPTED"
              message={`Warning: ${tamperedLogsCount} audit entries failed cryptographic HMAC verification checks. This indicates database tampering or records manipulation.`}
            />
          ) : (
            <div className="p-4 border border-emerald-500 border-opacity-35 bg-emerald-950 bg-opacity-10 rounded-2xl flex items-center space-x-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <div className="text-xs leading-normal">
                <h4 className="font-bold text-slate-200">Cryptographic Integrity Passed</h4>
                <p className="text-[10px] text-emerald-300 mt-0.5">All database ledger signatures checked and validated against server secrets successfully.</p>
              </div>
            </div>
          )}
        </div>

        <GlassCard className="p-4 bg-slate-950 bg-opacity-70 border-cyber-border text-center flex flex-col justify-center items-center">
          <span className="text-[9px] text-cyber-muted font-bold uppercase tracking-wider block">Checked Logs</span>
          <span className="text-2xl font-black text-slate-200 mt-1">{logs.length}</span>
        </GlassCard>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <LoadingSpinner size="lg" message="Validating database cryptographic signatures..." />
        </div>
      ) : (
        <ActivityTimeline logs={logs} loading={loading} />
      )}
    </div>
  );
}
