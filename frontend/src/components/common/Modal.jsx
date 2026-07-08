import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-panel-glow-purple rounded-2xl overflow-hidden shadow-glass border border-cyber-border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyber-border bg-slate-900 bg-opacity-40">
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 transition-colors text-xl font-bold"
          >
            &times;
          </button>
        </div>
        {/* Content */}
        <div className="p-6 bg-cyber-bg bg-opacity-90">
          {children}
        </div>
      </div>
    </div>
  );
}
