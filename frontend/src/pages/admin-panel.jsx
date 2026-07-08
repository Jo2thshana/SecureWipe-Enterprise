import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import GlassCard from '../components/common/GlassCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Users, Shield, ShieldCheck, Mail, Calendar } from 'lucide-react';

export default function AdminPanel() {
  const { showNotification } = useNotifications();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/users')
      .then(res => {
        setUsers(res.data.data.users);
      })
      .catch(err => {
        console.error(err);
        showNotification('Failed to retrieve registered operator profiles.', 'danger', 'Admin Error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [showNotification]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800 border-opacity-50">
        <Users className="w-6 h-6 text-cyber-secondary shadow-neon-cyan" />
        <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Operator Account Ledger</h2>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <LoadingSpinner size="lg" message="Reading operator data registries..." />
        </div>
      ) : (
        <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 bg-opacity-35 text-[10px] text-cyber-muted uppercase tracking-widest font-extrabold">
                  <th className="py-4 px-6">Operator Name</th>
                  <th className="py-4 px-6">Security Clearance</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Registration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800 hover:bg-opacity-25 transition-colors">
                    <td className="py-4 px-6 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-purple-900 bg-opacity-40 border border-cyber-border flex items-center justify-center font-bold text-cyber-accent">
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-200">{u.fullName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 border rounded-full font-bold uppercase text-[9px] tracking-wider ${
                        u.role === 'ADMIN' 
                          ? 'border-red-500 bg-red-950 bg-opacity-30 text-red-400' 
                          : 'border-cyan-500 bg-cyan-950 bg-opacity-30 text-cyan-400'
                      }`}>
                        {u.role === 'ADMIN' ? <Shield className="w-3 h-3 mr-1" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      <span className="flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> {u.email}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
