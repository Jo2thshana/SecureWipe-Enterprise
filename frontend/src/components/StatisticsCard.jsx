import React from 'react';
import GlassCard from './common/GlassCard';

export default function StatisticsCard({ title, value, subtext, icon: Icon, glowColor = 'purple', className = '' }) {
  const textGlows = {
    purple: 'text-purple-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]',
    cyan: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]',
    green: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    warning: 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]'
  };

  return (
    <GlassCard glowColor={glowColor} className={`flex items-center justify-between hover:scale-[1.02] transition-transform duration-200 ${className}`}>
      <div className="space-y-2">
        <span className="text-xs text-cyber-muted tracking-widest font-semibold uppercase">{title}</span>
        <h3 className={`text-3xl font-extrabold tracking-tight ${textGlows[glowColor] || 'text-slate-100'}`}>
          {value}
        </h3>
        {subtext && <p className="text-[10px] text-slate-500 font-medium">{subtext}</p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl bg-slate-900 bg-opacity-40 border border-cyber-border ${
          glowColor === 'purple' ? 'text-cyber-primary shadow-neon-purple' : 'text-cyber-secondary shadow-neon-cyan'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </GlassCard>
  );
}
