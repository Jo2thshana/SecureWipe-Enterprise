import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import GlassCard from '../components/common/GlassCard';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ShieldCheck, Download, LayoutDashboard, FileCheck, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function Verification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  
  const jobId = searchParams.get('jobId');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (jobId) {
      setLoading(true);
      // Run the manual verification pass on target job
      api.post('/verify-wipe', { jobId })
        .then(res => {
          setReport(res.data.data);
        })
        .catch(err => {
          console.error(err);
          showNotification('Verification audit check failed.', 'danger', 'Audit Failure');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [jobId, showNotification]);

  const handleDownloadCert = async () => {
    if (!jobId) return;
    setDownloading(true);
    try {
      const response = await api.post('/generate-certificate', { jobId }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Certificate_${jobId}.pdf`;
      link.click();
      showNotification('Certificate downloaded successfully.', 'success', 'PDF Ready');
    } catch (err) {
      showNotification('Failed to download PDF Certificate.', 'danger', 'Error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Compiling forensic destruction verification report..." />
      </div>
    );
  }

  const isPassed = report?.status === 'PASSED';

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div className="flex items-center space-x-2.5">
        <ShieldCheck className="w-6 h-6 text-cyber-secondary shadow-neon-cyan" />
        <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Verification Audit Report</h2>
      </div>

      {report ? (
        <GlassCard glowColor={isPassed ? 'green' : 'danger'} className="space-y-6 bg-slate-950 bg-opacity-70 border-cyber-border text-center">
          {/* Large icon */}
          <div className="py-4">
            {isPassed ? (
              <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            ) : (
              <ShieldAlert className="w-20 h-20 text-red-500 mx-auto drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" />
            )}
            <h3 className={`text-2xl font-black uppercase tracking-widest mt-4 ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
              Verification {isPassed ? 'SUCCESS' : 'FAILED'}
            </h3>
            <p className="text-xs text-cyber-muted mt-1 font-semibold uppercase tracking-wider">
              SecureWipe Sanitization Protocol Standard
            </p>
          </div>

          {/* Details table */}
          <div className="p-4 bg-slate-900 bg-opacity-50 border border-slate-800 rounded-2xl text-xs space-y-3 text-left">
            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Verification Result:</span>
              <span className={`font-bold uppercase ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPassed ? 'SUCCESS' : 'FAILED'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Total Files Selected:</span>
              <span className="font-bold text-slate-200">
                {report.totalFiles || 0}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Successfully Wiped:</span>
              <span className="font-bold text-emerald-400">
                {report.succeededFiles || 0}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Failed Files:</span>
              <span className={`font-bold ${report.failedFiles > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                {report.failedFiles || 0}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Success Rate:</span>
              <span className={`font-extrabold text-sm ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                {report.successRate !== undefined ? `${report.successRate}%` : 'N/A'}
              </span>
            </div>

            <div className="flex flex-col space-y-1 py-1.5">
              <span className="text-cyber-muted">Verification Details:</span>
              <p className="text-slate-400 leading-normal text-[11px] mt-0.5">{report.details}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-wider"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Operator Console</span>
            </Button>
            <Button 
              variant="primary" 
              onClick={handleDownloadCert}
              disabled={downloading || !isPassed}
              className="flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-wider shadow-neon-purple"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Get Certificate'}</span>
            </Button>
          </div>
        </GlassCard>
      ) : (
        <div className="p-4 text-center text-xs text-red-400 glass-panel border-red-900 rounded-xl">
          Error loading verification credentials. Target Job ID not specified.
        </div>
      )}
    </div>
  );
}
