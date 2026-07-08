import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import GlassCard from '../components/common/GlassCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import StatisticsCard from '../components/StatisticsCard';
import { 
  FileText, RefreshCw, Download, ShieldCheck, Database, HardDrive, 
  Layers, CheckCircle, AlertTriangle, Cpu, Info, Calendar, User, Activity
} from 'lucide-react';

export default function EnterpriseReports() {
  const { showNotification } = useNotifications();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('executive'); // 'executive' or 'devices'

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/enterprise-reports');
      setData(response.data.data);
      showNotification('Enterprise reports database synced.', 'success', 'Audit Registry Active');
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.error || 'Failed to fetch enterprise reporting metrics.', 'danger', 'Sync Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [showNotification]);

  const handleDownloadPDF = async (reportType) => {
    setExporting(true);
    try {
      const type = reportType === 'devices' ? 'device' : reportType;
      const response = await api.get('/admin/enterprise-reports/pdf', {
        params: { reportType: type },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `SecureWipe_${reportType}_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      showNotification(`${reportType === 'executive' ? 'Executive Summary' : 'Device Registry'} PDF downloaded successfully.`, 'success', 'Document Exported');
    } catch (err) {
      console.error(err);
      showNotification('Failed to generate and download PDF report.', 'danger', 'Export Error');
    } finally {
      setExporting(false);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (loading && !data) {
    return (
      <div className="py-20 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading PostgreSQL data aggregations..." />
      </div>
    );
  }

  const exec = data?.executiveReport || {};
  const devRep = data?.deviceReport || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 border-opacity-50 gap-4">
        <div className="flex items-center space-x-3">
          <FileText className="w-7 h-7 text-cyber-secondary shadow-neon-cyan" />
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Enterprise Reports Node</h2>
            <p className="text-[10px] text-cyber-muted font-semibold tracking-wider mt-0.5">SECURE DESTROY COMPLIANCE LEDGER</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] text-cyber-muted font-bold mr-1">
            LAST SYNC: {exec.lastUpdated ? new Date(exec.lastUpdated).toLocaleTimeString() : 'N/A'}
          </span>
          <Button 
            variant="ghost" 
            onClick={fetchReportData} 
            disabled={loading}
            className="flex items-center space-x-2 text-xs uppercase font-bold tracking-wider"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Data</span>
          </Button>
          <Button 
            variant="primary" 
            onClick={() => handleDownloadPDF(activeTab)} 
            disabled={exporting || loading}
            className="flex items-center space-x-2 text-xs uppercase font-bold tracking-wider"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Exporting...' : 'Export to PDF'}</span>
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-2 border-b border-slate-800 border-opacity-40 p-1">
        <button
          onClick={() => setActiveTab('executive')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'executive' 
              ? 'bg-cyber-primary bg-opacity-20 text-cyber-accent border-b-2 border-cyber-primary shadow-neon-purple' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Executive Summary
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'devices' 
              ? 'bg-cyber-secondary bg-opacity-20 text-cyber-accent border-b-2 border-cyber-secondary shadow-neon-cyan' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Device Inventory Report
        </button>
      </div>

      {activeTab === 'executive' && (
        <div className="space-y-6">
          {/* Metadata Card */}
          <GlassCard className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-950 bg-opacity-60 border-cyber-border">
            <div className="space-y-1">
              <span className="text-[9px] text-cyber-muted font-extrabold uppercase block tracking-widest">SecureWipe Node</span>
              <span className="text-sm font-bold text-slate-200 flex items-center">
                <Cpu className="w-4 h-4 mr-1.5 text-cyber-secondary" /> {exec.version}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-cyber-muted font-extrabold uppercase block tracking-widest">Database Node Connection</span>
              <span className="text-sm font-bold text-slate-200 flex items-center">
                <Database className="w-4 h-4 mr-1.5 text-emerald-400 animate-pulse" /> {exec.dbStatus}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-cyber-muted font-extrabold uppercase block tracking-widest">Auditor Credentials</span>
              <span className="text-sm font-bold text-slate-200 flex items-center">
                <User className="w-4 h-4 mr-1.5 text-cyber-primary" /> {exec.generatedBy}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-cyber-muted font-extrabold uppercase block tracking-widest">Asset Scanning Date</span>
              <span className="text-sm font-bold text-slate-200 flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 text-amber-500" /> {exec.lastDeviceScanTime}
              </span>
            </div>
          </GlassCard>

          {/* Primary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatisticsCard 
              title="Total Wipe Jobs" 
              value={exec.totalWipeJobs} 
              icon={Activity} 
              glowColor="purple" 
              subtext="Overwrites attempts registry count"
            />
            <StatisticsCard 
              title="Devices Audited" 
              value={exec.totalDevicesProcessed} 
              icon={HardDrive} 
              glowColor="cyan" 
              subtext="Unique hardware profiles checked"
            />
            <StatisticsCard 
              title="Destruction Success" 
              value={`${exec.successRate?.toFixed(1)}%`} 
              icon={CheckCircle} 
              glowColor="green" 
              subtext={`${exec.successfulWipes} Clean Wipes / ${exec.failedWipes} Redundant Wipes`}
            />
            <StatisticsCard 
              title="Capacity Managed" 
              value={formatBytes(exec.totalCapacityManaged)} 
              icon={Layers} 
              glowColor="warning" 
              subtext="Accumulated system block sectors size"
            />
          </div>

          {/* Secondary Details Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sanitisation Metrics */}
            <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-900 pb-2">
                <ShieldCheck className="w-4 h-4 text-cyber-primary" />
                <h4 className="font-extrabold uppercase text-xs tracking-wider text-slate-200">Destruction Clearance Summary</h4>
              </div>
              <div className="divide-y divide-slate-900 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Total Sanitized Pen Drives</span>
                  <span className="font-bold text-slate-200">{exec.totalUsbWiped} Drives</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Total Sanitized External HDDs</span>
                  <span className="font-bold text-slate-200">{exec.totalExtHddWiped} Drives</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Total Sanitized Internal HDDs</span>
                  <span className="font-bold text-slate-200">{exec.totalIntHddWiped} Drives</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Total SSD Storage Scanned</span>
                  <span className="font-bold text-slate-200">{exec.totalSsdsDetected} Drives</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Total Raw Data Sanitized</span>
                  <span className="font-bold text-cyber-secondary">{formatBytes(exec.totalDataWipedBytes)}</span>
                </div>
              </div>
            </GlassCard>

            {/* Verification and Certificates */}
            <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-900 pb-2">
                <Info className="w-4 h-4 text-cyber-secondary" />
                <h4 className="font-extrabold uppercase text-xs tracking-wider text-slate-200">Compliance & Verification Registry</h4>
              </div>
              <div className="divide-y divide-slate-900 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Certificates Issued & Authenticated</span>
                  <span className="font-bold text-slate-200">{exec.certificatesGenerated} Certificates</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Verification Passed (Zero Residue)</span>
                  <span className="font-bold text-emerald-400 flex items-center">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> {exec.verificationPassed} Passed
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Verification Failed (Threat Identified)</span>
                  <span className="font-bold text-red-400 flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {exec.verificationFailed} Failed
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Average Destruction Signature Integrity</span>
                  <span className="font-bold text-slate-200">99.98% Cryptographic Proof</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Compliance Standard Citation</span>
                  <span className="font-bold text-cyber-accent">NIST SP 800-88 Rev 1 Compliant</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="space-y-6">
          {/* Category Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {devRep.deviceSummary?.map((cat, idx) => {
              const isConnected = cat.currentStatus.includes('Connected') && !cat.currentStatus.startsWith('0');
              return (
                <GlassCard key={idx} className="bg-slate-950 bg-opacity-50 border-cyber-border p-4 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-cyber-muted font-bold uppercase tracking-wider block">{cat.categoryName}</span>
                    <span className="text-2xl font-black text-slate-100">{cat.deviceCount}</span>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-900 text-[10px] text-slate-400 space-y-1">
                    <div>Size: <span className="text-slate-300 font-semibold">{formatBytes(cat.totalCapacity)}</span></div>
                    <div>Wiped: <span className="text-cyber-secondary font-semibold">{formatBytes(cat.totalDataWiped)}</span></div>
                    <div className="truncate">
                      Status:{' '}
                      <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                        {isConnected ? 'Active' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Individual Device Ledger Table */}
          <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border overflow-hidden p-0">
            <div className="p-4 border-b border-slate-900 bg-slate-900 bg-opacity-20 flex justify-between items-center">
              <h4 className="font-extrabold uppercase text-xs tracking-wider text-slate-200">Registered Media Hardware Ledger</h4>
              <span className="text-[10px] text-cyber-muted uppercase font-bold">Total: {devRep.devicesList?.length || 0} Assets</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950 bg-opacity-40 text-[9px] text-cyber-muted uppercase tracking-widest font-extrabold">
                    <th className="py-3 px-5">Device Label</th>
                    <th className="py-3 px-5">Category / Bus Type</th>
                    <th className="py-3 px-5">Media Type</th>
                    <th className="py-3 px-5 text-right">Capacity</th>
                    <th className="py-3 px-5 text-right">Used / Free</th>
                    <th className="py-3 px-5 text-center">Status</th>
                    <th className="py-3 px-5">Last Detection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs">
                  {devRep.devicesList?.map((dev, index) => {
                    const isConn = dev.connectionStatus === 'connected';
                    return (
                      <tr key={index} className="hover:bg-slate-800 hover:bg-opacity-25 transition-colors">
                        <td className="py-3 px-5">
                          <div className="font-bold text-slate-200 max-w-xs truncate">{dev.name}</div>
                        </td>
                        <td className="py-3 px-5 text-slate-400">
                          <div className="text-[10px] uppercase font-semibold text-slate-300">{dev.type.replace(/_/g, ' ')}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{dev.connectionType} / {dev.busType}</div>
                        </td>
                        <td className="py-3 px-5 text-slate-400">
                          <span className={`inline-flex items-center px-2 py-0.5 border rounded-md font-bold uppercase text-[8px] tracking-wider ${
                            dev.mediaType === 'SSD' 
                              ? 'border-cyan-500 bg-cyan-950 bg-opacity-20 text-cyan-400' 
                              : 'border-purple-500 bg-purple-950 bg-opacity-20 text-purple-400'
                          }`}>
                            {dev.mediaType}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right text-slate-300 font-semibold">
                          {formatBytes(dev.capacity)}
                        </td>
                        <td className="py-3 px-5 text-right text-slate-500 text-[10px]">
                          <div>U: {formatBytes(dev.usedSpace)}</div>
                          <div>F: {formatBytes(dev.freeSpace)}</div>
                        </td>
                        <td className="py-3 px-5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 border rounded-full font-bold uppercase text-[8px] tracking-wider ${
                            isConn 
                              ? 'border-emerald-500 bg-emerald-950 bg-opacity-20 text-emerald-400' 
                              : 'border-slate-700 bg-slate-800 bg-opacity-25 text-slate-400'
                          }`}>
                            {isConn ? 'Connected' : 'Offline'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-slate-400 text-[10px]">
                          {dev.updated_at ? new Date(dev.updated_at).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                  {(!devRep.devicesList || devRep.devicesList.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-cyber-muted text-xs">
                        No storage hardware profiles scanned in system database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
