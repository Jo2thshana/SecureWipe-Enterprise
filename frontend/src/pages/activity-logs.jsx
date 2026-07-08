import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import GlassCard from '../components/common/GlassCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import WarningAlert from '../components/common/WarningAlert';
import { 
  History, ShieldAlert, ShieldCheck, Search, Filter, 
  Calendar, Users, HardDrive, Shield, Download, RefreshCw, 
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Info, LogOut, KeyRound, Play
} from 'lucide-react';

export default function ActivityLogs() {
  const { user: currentUser } = useAuth();
  const { showNotification } = useNotifications();

  const [logs, setLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // all, today, 7days, 30days
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('all'); // userId for admins

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchLogsAndUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch appropriate logs endpoint based on role
      const endpoint = isAdmin ? '/logs/admin/all' : '/logs/me';
      const logsRes = await api.get(endpoint);
      setLogs(logsRes.data.data.logs);

      // 2. Fetch users list if Admin to map operator names
      if (isAdmin) {
        try {
          const usersRes = await api.get('/admin/users');
          setUsersList(usersRes.data.data.users);
        } catch (uErr) {
          console.warn('[ActivityLogs] Failed to fetch users directory:', uErr);
        }
      }
    } catch (err) {
      console.error('[ActivityLogs] Sync error:', err);
      showNotification('Failed to populate audit logs ledger.', 'danger', 'Sync Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndUsers();
  }, [showNotification]);

  // Check if any logs have failed signature check
  const tamperedLogsCount = logs.filter(l => l.isSignatureVerified === false).length;

  // Resolve operator name from userId
  const getOperatorName = (userId) => {
    if (!userId) return 'SYSTEM';
    if (userId === currentUser?.id) return currentUser?.fullName;
    const foundUser = usersList.find(u => u.id === userId);
    return foundUser ? foundUser.fullName : `ID: ${userId.substring(0, 8)}`;
  };

  // Get status badge properties: color and category
  const getStatusBadge = (action) => {
    const act = action.toUpperCase();
    if (act.includes('FAILED') || act.includes('TAMPER')) {
      return {
        label: 'FAILED',
        style: 'border-red-500 bg-red-950 bg-opacity-30 text-red-400',
        icon: AlertTriangle
      };
    }
    if (act.includes('STARTED') || act.includes('PROGRESS')) {
      return {
        label: 'WARNING',
        style: 'border-amber-500 bg-amber-950 bg-opacity-30 text-amber-400',
        icon: Info
      };
    }
    if (act.includes('COMPLETED') || act === 'LOGIN' || act === 'LOGOUT' || act === 'CERTIFICATE_GENERATED') {
      return {
        label: 'SUCCESS',
        style: 'border-emerald-500 bg-emerald-950 bg-opacity-30 text-emerald-400',
        icon: CheckCircle2
      };
    }
    return {
      label: 'INFO',
      style: 'border-blue-500 bg-blue-950 bg-opacity-30 text-blue-400',
      icon: Info
    };
  };

  // Filtering logic
  const filteredLogs = logs.filter(log => {
    // 1. Search Box (matches action, details, or resolved operator name)
    const opName = getOperatorName(log.userId).toLowerCase();
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opName.includes(searchTerm.toLowerCase());

    // 2. Time Filter
    let matchesTime = true;
    const logDate = new Date(log.created_at);
    const now = new Date();
    if (timeFilter === 'today') {
      matchesTime = logDate.toDateString() === now.toDateString();
    } else if (timeFilter === '7days') {
      const diffTime = Math.abs(now.getTime() - logDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      matchesTime = diffDays <= 7;
    } else if (timeFilter === '30days') {
      const diffTime = Math.abs(now.getTime() - logDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      matchesTime = diffDays <= 30;
    }

    // 3. Event Type Filter
    const matchesEvent = eventTypeFilter === 'all' || log.action === eventTypeFilter;

    // 4. Device Filter
    const matchesDevice = !deviceFilter || log.details.toLowerCase().includes(deviceFilter.toLowerCase());

    // 5. Operator Filter (Admin only)
    const matchesOperator = !isAdmin || operatorFilter === 'all' || log.userId === operatorFilter;

    return matchesSearch && matchesTime && matchesEvent && matchesDevice && matchesOperator;
  });

  // Pagination slice
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800 border-opacity-50">
        <div className="flex items-center space-x-2.5">
          <History className="w-6 h-6 text-cyber-secondary shadow-neon-cyan" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Security Audit Ledger</h2>
        </div>
        <button 
          onClick={fetchLogsAndUsers}
          className="p-1.5 rounded border border-slate-800 hover:border-cyber-secondary hover:text-cyber-secondary transition-colors text-cyber-muted text-xs flex items-center space-x-1 font-semibold uppercase tracking-wider"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Ledger</span>
        </button>
      </div>

      {/* Warnings & Integrity Alarm */}
      {tamperedLogsCount > 0 && (
        <WarningAlert 
          title="LEDGER INTEGRITY AUDIT: TAMPERING DETECTED"
          message={`Forensic check: ${tamperedLogsCount} audit entries failed cryptographic HMAC verification checks. Cryptographic signatures mismatch, ledger status compromised.`}
        />
      )}

      {/* Filter Control Board */}
      <GlassCard className="bg-slate-950 bg-opacity-85 border-cyber-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Box */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cyber-muted">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Search details, actions..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyber-secondary transition-colors"
            />
          </div>

          {/* Time Filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cyber-muted">
              <Calendar className="w-4 h-4" />
            </span>
            <select
              value={timeFilter}
              onChange={(e) => { setTimeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-cyber-secondary transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Event Category Filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cyber-muted">
              <Shield className="w-4 h-4" />
            </span>
            <select
              value={eventTypeFilter}
              onChange={(e) => { setEventTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-cyber-secondary transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All Event Types</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="DEVICE_SELECTED">DEVICE_SELECTED</option>
              <option value="FILES_SELECTED">FILES_SELECTED</option>
              <option value="WIPE_STARTED">WIPE_STARTED</option>
              <option value="WIPE_PROGRESS">WIPE_PROGRESS</option>
              <option value="WIPE_COMPLETED">WIPE_COMPLETED</option>
              <option value="WIPE_FAILED">WIPE_FAILED</option>
              <option value="VERIFICATION_STARTED">VERIFICATION_STARTED</option>
              <option value="VERIFICATION_COMPLETED">VERIFICATION_COMPLETED</option>
              <option value="CERTIFICATE_GENERATED">CERTIFICATE_GENERATED</option>
              <option value="PDF_DOWNLOADED">PDF_DOWNLOADED</option>
            </select>
          </div>

          {/* Device filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cyber-muted">
              <HardDrive className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Filter by device name..." 
              value={deviceFilter}
              onChange={(e) => { setDeviceFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyber-secondary transition-colors"
            />
          </div>
        </div>

        {/* Admin only Operator Filter */}
        {isAdmin && (
          <div className="flex items-center space-x-3 pt-2 border-t border-slate-900">
            <span className="text-[10px] text-cyber-muted uppercase tracking-wider font-bold">Operator Registry Filter:</span>
            <div className="relative w-48">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cyber-muted">
                <Users className="w-3.5 h-3.5" />
              </span>
              <select
                value={operatorFilter}
                onChange={(e) => { setOperatorFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 pl-8 pr-4 text-[11px] text-slate-200 focus:outline-none focus:border-cyber-secondary transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Operators</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Audit Table Ledger */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <LoadingSpinner size="lg" message="Loading security ledger files..." />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-16 text-center text-xs text-cyber-muted uppercase tracking-wider bg-slate-950 bg-opacity-50 border border-slate-900 rounded-3xl">
          No audit logs matched selected parameters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-900 rounded-2xl bg-slate-950 bg-opacity-70">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 bg-opacity-90 text-[10px] uppercase text-cyber-muted tracking-wider border-b border-slate-900">
                  <th className="py-3.5 px-4 font-bold">Timestamp</th>
                  <th className="py-3.5 px-4 font-bold">Operator</th>
                  <th className="py-3.5 px-4 font-bold">Action Category</th>
                  <th className="py-3.5 px-4 font-bold">Details</th>
                  <th className="py-3.5 px-4 font-bold">Audit Status</th>
                  <th className="py-3.5 px-4 font-bold text-center">HMAC Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300">
                {currentItems.map((log) => {
                  const badge = getStatusBadge(log.action);
                  const BadgeIcon = badge.icon;
                  const isVerified = log.isSignatureVerified !== false;

                  return (
                    <tr key={log.id} className="hover:bg-slate-900 hover:bg-opacity-35 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[10px] whitespace-nowrap text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {getOperatorName(log.userId)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] text-cyber-secondary uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-sm truncate leading-normal text-slate-400">
                        {log.details}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1 text-[9px] px-2 py-0.5 border rounded-full font-bold uppercase ${badge.style}`}>
                          <BadgeIcon className="w-2.5 h-2.5" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isVerified ? (
                          <span className="inline-flex items-center text-[10px] text-emerald-400 font-bold" title="HMAC Signature match">
                            <ShieldCheck className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-red-500 font-bold animate-pulse" title="Integrity Tampered!">
                            <ShieldAlert className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center py-2 text-xs">
              <span className="text-cyber-muted">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length} audit entries
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => paginate(currentPage - 1)}
                  className="p-1.5 rounded border border-slate-800 hover:border-cyber-secondary hover:text-cyber-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none text-slate-400"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-200">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => paginate(currentPage + 1)}
                  className="p-1.5 rounded border border-slate-800 hover:border-cyber-secondary hover:text-cyber-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none text-slate-400"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
