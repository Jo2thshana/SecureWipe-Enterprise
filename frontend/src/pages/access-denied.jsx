import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import Button from '../components/common/Button';

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
      <GlassCard glowColor="cyan" className="max-w-md text-center space-y-6">
        <ShieldAlert className="w-16 h-16 text-cyber-danger mx-auto animate-pulse" />
        <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-widest">Access Denied</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Security policy alert: Your operator profile has insufficient clearance levels to access this network node.
        </p>
        <NavLink to="/dashboard">
          <Button variant="primary">Return to Console</Button>
        </NavLink>
      </GlassCard>
    </div>
  );
}
