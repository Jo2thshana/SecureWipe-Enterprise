import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDevices } from '../context/DeviceContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import StatisticsCard from '../components/StatisticsCard';
import DeviceGrid from '../components/DeviceGrid';
import ActivityTimeline from '../components/ActivityTimeline';
import CertificateCard from '../components/CertificateCard';
import GlassCard from '../components/common/GlassCard';
import { HardDrive, RefreshCcw, ShieldCheck, Activity, Award } from 'lucide-react';
import Button from '../components/common/Button';

export default function Dashboard() {
  const { user } = useAuth();
  const { devices, scanning, fetchDevices, analyzeDevice } = useDevices();
  const { showNotification } = useNotifications();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalDevices: 0,
    totalWipes: 0,
    successfulWipes: 0,
    certificates: 0
  });

  const [logs, setLogs] = useState([]);
  const [certs, setCerts] = useState([]);
  const [recentOperators, setRecentOperators] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const isAdmin = user?.role === 'ADMIN';

  // Load stats, certs, and logs
  const loadDashboardData = async () => {
    setLoadingStats(true);
    try {
      // Load recent operators stats
      try {
        const opRes = await api.get('/operators/recent');
        setRecentOperators(opRes.data.data.operators || []);
      } catch (opErr) {
        console.warn('[Dashboard] Failed to fetch active operators list:', opErr);
      }

      if (isAdmin) {
        // Admins fetch consolidated reports
        const { data } = await api.get('/admin/reports');
        const { metrics, analytics } = data.data;
        setStats({
          totalDevices: metrics.totalDevices,
          totalWipes: metrics.totalWipeOperations,
          successfulWipes: metrics.successfulWipes,
          certificates: metrics.certificatesGenerated
        });
        setLogs(analytics.recentActivities || []);
        
        const certList = await api.get('/certificates');
        setCerts(certList.data.data.certificates.slice(-3).reverse());
      } else {
        // Users compile local stats
        const [devicesRes, certsRes, logsRes] = await Promise.all([
          api.get('/devices'),
          api.get('/certificates'),
          api.get('/activity-logs')
        ]);

        const devCount = devicesRes.data.data.devices.length;
        const certCount = certsRes.data.data.certificates.length;
        const logList = logsRes.data.data.logs;

        const completedWipes = logList.filter(l => l.action === 'WIPE_COMPLETED').length;
        const failedWipes = logList.filter(l => l.action === 'WIPE_FAILED').length;

        setStats({
          totalDevices: devCount,
          totalWipes: completedWipes + failedWipes,
          successfulWipes: completedWipes,
          certificates: certCount
        });
        setLogs(logList.slice(0, 5));
        setCerts(certsRes.data.data.certificates.slice(-3).reverse());
      }
    } catch (err) {
      showNotification('Failed to populate dashboard summary cards.', 'danger', 'Data Error');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    loadDashboardData();
  }, [fetchDevices, isAdmin]);

  // Actions Callbacks
  const handleAnalyze = async (deviceId) => {
    try {
      showNotification('Initiating forensic filesystem scan...', 'info', 'Scanner Active');
      await analyzeDevice(deviceId);
      loadDashboardData();
    } catch (err) {
      // Notification handled in context
    }
  };

  const handleFullWipe = (deviceId) => {
    // Select device and navigate to Full Wipe page
    navigate(`/full-wipe?deviceId=${deviceId}`);
  };

  const handleSelectiveWipe = (deviceId) => {
    // Select device and navigate to Selective Wipe page
    navigate(`/selective-wipe?deviceId=${deviceId}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 uppercase tracking-widest">
            {isAdmin ? 'Clearance Audit Center' : 'Destruction Control Hub'}
          </h2>
          <p className="text-xs text-cyber-muted tracking-wider mt-1">
            Secure asset disposal logging active for <b>{user?.fullName}</b> ({user?.role})
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="ghost" 
            onClick={() => { fetchDevices(); loadDashboardData(); }}
            className="flex items-center space-x-2 text-xs uppercase font-bold tracking-wider"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>Refreshes</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatisticsCard 
          title="Monitored Devices"
          value={loadingStats ? '...' : stats.totalDevices}
          subtext="Connected removable storage media"
          icon={HardDrive}
          glowColor="cyan"
        />
        <StatisticsCard 
          title="Sanitization Runs"
          value={loadingStats ? '...' : stats.totalWipes}
          subtext="Total secure wipe jobs triggered"
          icon={Activity}
          glowColor="purple"
        />
        <StatisticsCard 
          title="Verified Cleared"
          value={loadingStats ? '...' : stats.successfulWipes}
          subtext="Destructions with zero data residue"
          icon={ShieldCheck}
          glowColor="green"
        />
        <StatisticsCard 
          title="Issued Certificates"
          value={loadingStats ? '...' : stats.certificates}
          subtext="Cryptographically signed compliance receipts"
          icon={Award}
          glowColor="warning"
        />
      </div>

      {/* Connected Devices listings */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-4 bg-cyber-secondary rounded"></span>
          <h3 className="text-md font-bold uppercase tracking-wider text-slate-200">Detected Media Nodes</h3>
        </div>
        <DeviceGrid 
          devices={devices}
          onAnalyze={handleAnalyze}
          onFullWipe={handleFullWipe}
          onSelectiveWipe={handleSelectiveWipe}
          scanning={scanning}
        />
      </div>

      {/* Audit ledger split section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ActivityTimeline logs={logs} loading={loadingStats} />
        </div>
        
        {/* Recent Certificates sidebar */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2.5 pb-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h4 className="font-bold text-slate-200 uppercase tracking-widest text-sm">Recent Sign-offs</h4>
          </div>
          {certs.length === 0 ? (
            <div className="p-8 text-center text-xs text-cyber-muted border border-dashed border-slate-800 rounded-2xl bg-slate-950 bg-opacity-50">
              No destructions certified yet.
            </div>
          ) : (
            <div className="space-y-4">
              {certs.map(c => (
                <CertificateCard key={c.id} certificate={c} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Operators section */}
      <div className="space-y-4 pt-4 border-t border-slate-900 border-opacity-65">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-4 bg-cyber-primary rounded shadow-neon-purple"></span>
          <h3 className="text-md font-bold uppercase tracking-wider text-slate-200">Active Operators</h3>
        </div>
        
        {recentOperators.length === 0 ? (
          <div className="p-8 text-center text-xs text-cyber-muted border border-dashed border-slate-800 rounded-2xl bg-slate-950 bg-opacity-50">
            No active operators found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentOperators.map(op => (
              <GlassCard key={op.id} glowColor="purple" className="flex items-center justify-between p-4 bg-slate-950 bg-opacity-70 border-cyber-border">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-purple-950 bg-opacity-35 border border-purple-800 flex items-center justify-center font-bold text-cyber-accent">
                    {op.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{op.fullName}</h4>
                    <span className="text-[9px] text-cyber-muted uppercase font-mono">{op.role === 'ADMIN' ? 'Admin' : 'Operator'}</span>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      Last active: {new Date(op.lastActivityTime).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end space-y-1.5">
                  <div className="text-xs font-mono font-bold text-cyber-secondary">
                    {op.totalWipes} Wipes
                  </div>
                  <button 
                    onClick={() => navigate(`/profile/${op.id}`)}
                    className="px-2.5 py-1 text-[9px] font-bold uppercase rounded-md border border-cyber-border text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
