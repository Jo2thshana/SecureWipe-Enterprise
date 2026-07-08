import React from 'react';
import { Outlet } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-cyber-gradient cyber-grid relative p-4">
      {/* Background glowing ambient elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-glow-purple -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-glow-cyan translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        <GlassCard glowColor="purple" className="shadow-neon-purple border-cyber-border bg-slate-950 bg-opacity-75">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent uppercase">
              SecureWipe
            </h1>
            <p className="text-xs text-cyber-muted tracking-widest mt-1.5 uppercase">
              IT Asset Disposal Sanitizer
            </p>
          </div>
          <Outlet />
        </GlassCard>
      </div>
    </div>
  );
}
