import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import GlassCard from '../components/common/GlassCard';
import StatisticsCard from '../components/StatisticsCard';
import ActivityTimeline from '../components/ActivityTimeline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { 
  User, ShieldAlert, Award, Calendar, KeyRound, 
  HardDrive, CheckCircle, Lock, Activity, ShieldCheck, ArrowLeft, History
} from 'lucide-react';

export default function Profile() {
  const { operatorId } = useParams();
  const { user: currentUser } = useAuth();
  const { showNotification } = useNotifications();

  const [profileUser, setProfileUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    devicesProcessed: 0,
    wipesCompleted: 0,
    certsGenerated: 0,
    successRate: 100,
    loginSessions: 0
  });

  const [loading, setLoading] = useState(true);
  const [logsRestricted, setLogsRestricted] = useState(false);

  const isOwnProfile = !operatorId || operatorId === currentUser?.id;
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      setLogsRestricted(false);
      try {
        // 1. Fetch user profile information
        let targetUser = currentUser;
        if (!isOwnProfile) {
          try {
            const userRes = await api.get(`/operator/profile/${operatorId}`);
            targetUser = userRes.data.data.user;
          } catch (err) {
            console.error('[Profile] Failed to fetch operator info:', err);
            showNotification('Operator profile not found.', 'danger', 'Error');
            setLoading(false);
            return;
          }
        }
        setProfileUser(targetUser);

        // 2. Fetch activity logs to compute statistics and populate timeline
        let userLogs = [];
        if (isOwnProfile || isAdmin) {
          try {
            const logsRes = await api.get(`/logs/operator/${targetUser.id}`);
            userLogs = logsRes.data.data.logs;
            setLogs(userLogs);
          } catch (err) {
            console.warn('[Profile] Logs are restricted for this profile', err);
            setLogsRestricted(true);
          }
        } else {
          setLogsRestricted(true);
        }

        // 3. Compute stats
        if (userLogs.length > 0) {
          const devicesCount = userLogs.filter(l => l.action === 'DEVICE_SELECTED').length;
          const completedCount = userLogs.filter(l => l.action === 'WIPE_COMPLETED').length;
          const certsCount = userLogs.filter(l => l.action === 'CERTIFICATE_GENERATED').length;
          const loginCount = userLogs.filter(l => l.action === 'LOGIN').length;
          const failedCount = userLogs.filter(l => l.action === 'WIPE_FAILED').length;
          
          const totalWipes = completedCount + failedCount;
          const successRate = totalWipes > 0 ? Math.round((completedCount / totalWipes) * 100) : 100;

          setStats({
            devicesProcessed: devicesCount,
            wipesCompleted: completedCount,
            certsGenerated: certsCount,
            successRate,
            loginSessions: loginCount
          });
        } else {
          // Defaults if logs are restricted
          setStats({
            devicesProcessed: isOwnProfile ? 0 : 'N/A',
            wipesCompleted: isOwnProfile ? 0 : 'N/A',
            certsGenerated: isOwnProfile ? 0 : 'N/A',
            successRate: isOwnProfile ? 100 : 'N/A',
            loginSessions: isOwnProfile ? 0 : 'N/A'
          });
        }
      } catch (err) {
        console.error('[Profile] Profile parsing error:', err);
        showNotification('Failed to read operator profile metrics.', 'danger', 'Sync Error');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [operatorId, currentUser, isOwnProfile, isAdmin]);

  const getLastLoginTime = () => {
    if (logsRestricted || logs.length === 0) return 'N/A';
    const logins = logs.filter(l => l.action === 'LOGIN');
    if (logins.length === 0) return 'N/A';
    return new Date(logins[0].created_at).toLocaleString();
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Compiling operator metadata & log history..." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title Header with Back Option */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800 border-opacity-50">
        <div className="flex items-center space-x-2.5">
          <User className="w-6 h-6 text-cyber-secondary shadow-neon-cyan" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">
            {isOwnProfile ? 'My Profile' : `${profileUser?.fullName || 'Operator'}'s Profile`}
          </h2>
        </div>
        <Link 
          to="/dashboard" 
          className="flex items-center space-x-1.5 text-xs text-cyber-muted hover:text-cyber-secondary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info card */}
        <div className="space-y-6">
          <GlassCard glowColor="purple" className="flex flex-col items-center text-center space-y-5 bg-slate-950 bg-opacity-70 border-cyber-border">
            {/* Cyber Avatar */}
            <div className="w-24 h-24 rounded-full bg-purple-950 bg-opacity-35 border border-purple-500 flex items-center justify-center font-black text-3xl text-cyber-accent shadow-neon-purple">
              {profileUser?.fullName?.charAt(0).toUpperCase() || 'O'}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100">{profileUser?.fullName || 'Unknown Operator'}</h3>
              <p className="text-xs text-cyber-muted">{profileUser?.email || 'N/A'}</p>
            </div>

            <span className={`text-[10px] px-4 py-1.5 border rounded-full font-bold uppercase tracking-widest ${
              profileUser?.role === 'ADMIN' 
                ? 'border-red-500 bg-red-950 bg-opacity-30 text-red-400' 
                : 'border-cyan-500 bg-cyan-950 bg-opacity-30 text-cyan-400'
            }`}>
              {profileUser?.role === 'ADMIN' ? 'Administrator' : 'Sanitization Operator'}
            </span>

            {/* Meta details */}
            <div className="w-full text-left text-xs space-y-2 border-t border-slate-900 pt-4 text-slate-400">
              <div className="flex justify-between">
                <span className="text-cyber-muted uppercase tracking-wider text-[10px]">Registry Date:</span>
                <span className="font-semibold">{profileUser?.created_at ? new Date(profileUser.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted uppercase tracking-wider text-[10px]">Last Login:</span>
                <span className="font-semibold text-right text-[11px] truncate max-w-[150px]">{getLastLoginTime()}</span>
              </div>
            </div>
          </GlassCard>

          {/* Clearance detail block */}
          <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border space-y-4">
            <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800 border-opacity-40">
              <ShieldAlert className="w-5 h-5 text-cyber-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Clearance Status</h4>
            </div>

            <div className="text-xs space-y-3 text-slate-400 leading-relaxed">
              <div className="flex items-start space-x-2">
                <span className="text-cyber-secondary font-bold">•</span>
                <p>Authorized to mount connected removable storage devices and run analysis profiling scans.</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-cyber-secondary font-bold">•</span>
                <p>Clearance to initiate Single-Pass, DoD 5220.22-M, and Schneier 7-Pass sanitization schedules.</p>
              </div>
              {profileUser?.role === 'ADMIN' && (
                <div className="flex items-start space-x-2 text-red-300 font-medium">
                  <span className="text-red-400 font-bold">•</span>
                  <p>Administrative Privileges: Allowed user registry audits, ledger signature checking, and full node analytics lookups.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Dashboard Statistics & Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatisticsCard 
              title="Wipes Done"
              value={stats.wipesCompleted}
              glowColor="cyan"
              className="py-4"
            />
            <StatisticsCard 
              title="Certs Built"
              value={stats.certsGenerated}
              glowColor="warning"
              className="py-4"
            />
            <StatisticsCard 
              title="Devices Wiped"
              value={stats.devicesProcessed}
              glowColor="purple"
              className="py-4"
            />
            <StatisticsCard 
              title="Logins"
              value={stats.loginSessions}
              glowColor="indigo"
              className="py-4"
            />
            <StatisticsCard 
              title="Success Rate"
              value={typeof stats.successRate === 'number' ? `${stats.successRate}%` : stats.successRate}
              glowColor="green"
              className="py-4 col-span-2 md:col-span-1"
            />
          </div>

          {/* Personal Activity Timeline */}
          {logsRestricted ? (
            <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-950 bg-opacity-35 border border-red-900 flex items-center justify-center mx-auto animate-pulse">
                <Lock className="w-6 h-6 text-red-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200 uppercase tracking-widest text-sm">Ledger Audit Access Blocked</h4>
                <p className="text-xs text-cyber-muted max-w-sm mx-auto leading-normal">
                  Chronological activity timeline lists are restricted to profile owners and administrators. Security clearance level ADMIN is required.
                </p>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-cyber-secondary shadow-neon-cyan" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Chronological Activity Ledger</h4>
              </div>
              <ActivityTimeline logs={logs} loading={loading} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
