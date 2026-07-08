import React, { useEffect, useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import CertificateCard from '../components/CertificateCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FileCheck, Search, Filter } from 'lucide-react';

export default function Certificates() {
  const { showNotification } = useNotifications();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.get('/certificates')
      .then(res => {
        setCerts(res.data.data.certificates);
      })
      .catch(err => {
        console.error(err);
        showNotification('Failed to retrieve destruction certificates.', 'danger', 'Data Error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [showNotification]);

  // Filter calculation
  const filteredCerts = certs.filter(c => {
    // Search check
    const matchesSearch = 
      c.certificateId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userName.toLowerCase().includes(searchQuery.toLowerCase());

    // Type check
    const matchesType = deviceFilter === 'all' || c.deviceType === deviceFilter;

    // Date check
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const date = new Date(c.wipeDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === 'today') matchesDate = diffDays <= 1;
      else if (dateFilter === 'week') matchesDate = diffDays <= 7;
      else if (dateFilter === 'month') matchesDate = diffDays <= 30;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800 border-opacity-50">
        <FileCheck className="w-6 h-6 text-cyber-secondary shadow-neon-cyan" />
        <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Compliance Audit Certificates</h2>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 glass-panel border-cyber-border rounded-2xl bg-slate-950 bg-opacity-50">
        {/* Search */}
        <div className="md:col-span-2 relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <input 
            type="text" 
            placeholder="Search by ID, Operator, Asset name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-cyber-bg border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          />
        </div>

        {/* Filter type */}
        <div className="relative flex items-center">
          <Filter className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <select 
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-cyber-bg border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          >
            <option value="all">All Asset Classes</option>
            <option value="pendrive">USB Removable</option>
            <option value="external_hdd">External HDD</option>
            <option value="ssd">SSD</option>
          </select>
        </div>

        {/* Filter date */}
        <div className="relative flex items-center">
          <Filter className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-cyber-bg border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          >
            <option value="all">All Timeframes</option>
            <option value="today">Past 24 Hours</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Grid of Results */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <LoadingSpinner size="lg" message="Loading destruction certificates..." />
        </div>
      ) : filteredCerts.length === 0 ? (
        <div className="p-16 text-center text-xs text-cyber-muted border border-dashed border-slate-800 rounded-2xl bg-slate-950 bg-opacity-50">
          No compliance certificates match your filter query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCerts.map(cert => (
            <CertificateCard key={cert.id} certificate={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
