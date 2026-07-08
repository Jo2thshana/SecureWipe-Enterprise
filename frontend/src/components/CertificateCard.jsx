import React from 'react';
import { FileCheck, ShieldCheck, Download, ExternalLink, Calendar } from 'lucide-react';
import GlassCard from './common/GlassCard';
import Button from './common/Button';
import api from '../services/api';

export default function CertificateCard({ certificate, onDownload }) {
  const { id, jobId, certificateId, userName, deviceName, deviceType, algorithm_used, wipeDate, verificationStatus, confidence_score, qrCodeData } = certificate;

  const handleDownload = async () => {
    try {
      const response = await api.post('/generate-certificate', { jobId }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Certificate_${certificateId}.pdf`;
      link.click();
    } catch (err) {
      console.error('Failed to download certificate PDF:', err);
    }
  };

  const isPassed = verificationStatus === 'PASSED';

  return (
    <GlassCard glowColor="purple" className="flex flex-col h-full bg-slate-950 bg-opacity-70 border-cyber-border">
      {/* Title */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800 border-opacity-40 mb-4">
        <div className="flex items-center space-x-2.5">
          <FileCheck className="w-5 h-5 text-cyber-secondary shadow-neon-cyan" />
          <div>
            <h4 className="font-bold text-sm text-slate-200">{certificateId}</h4>
            <span className="text-[9px] text-cyber-muted tracking-wider uppercase font-semibold">Destruction Receipt</span>
          </div>
        </div>
        <span className={`inline-flex items-center text-[9px] px-2 py-0.5 border rounded-full font-bold uppercase tracking-widest ${
          isPassed ? 'border-emerald-500 bg-emerald-950 text-emerald-400' : 'border-red-500 bg-red-950 text-red-400'
        }`}>
          <ShieldCheck className="w-3 h-3 mr-1" />
          {verificationStatus}
        </span>
      </div>

      {/* Details list */}
      <div className="text-xs space-y-2.5 flex-grow mb-6">
        <div className="flex justify-between">
          <span className="text-cyber-muted">Device Model:</span>
          <span className="font-bold text-slate-300 truncate w-32 text-right">{deviceName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cyber-muted">Asset Class:</span>
          <span className="font-semibold text-slate-300">{deviceType.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cyber-muted">Overwrite Pass:</span>
          <span className="font-semibold text-slate-300">{algorithm_used.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cyber-muted">Confidence Level:</span>
          <span className="font-bold text-emerald-400">{confidence_score}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cyber-muted">Authorized by:</span>
          <span className="font-semibold text-slate-300 truncate w-32 text-right">{userName}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-cyber-muted pt-1">
          <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> Date:</span>
          <span>{new Date(wipeDate).toLocaleDateString()}</span>
        </div>
      </div>

      {/* QR code container & Actions */}
      <div className="flex items-center space-x-3 pt-3 border-t border-slate-800 border-opacity-40">
        {qrCodeData && (
          <div className="p-1 bg-white rounded border border-slate-300">
            <img src={qrCodeData} alt="Security Check QR" className="w-16 h-16" />
          </div>
        )}
        <div className="flex-grow flex flex-col space-y-2">
          <Button 
            variant="ghost" 
            onClick={handleDownload}
            className="text-[11px] py-1.5 flex items-center justify-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
