import React from 'react';

export default function GlassCard({ children, className = '', glowColor = '' }) {
  const glowClasses = {
    purple: 'glass-panel-glow-purple',
    cyan: 'glass-panel-glow-cyan',
    '': 'glass-panel'
  };

  return (
    <div className={`p-6 rounded-2xl ${glowClasses[glowColor] || glowClasses['']} ${className}`}>
      {children}
    </div>
  );
}
