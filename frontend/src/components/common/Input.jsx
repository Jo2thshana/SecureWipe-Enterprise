import React from 'react';

export default function Input({ label, type = 'text', value, onChange, placeholder, className = '', error, ...props }) {
  return (
    <div className={`flex flex-col space-y-1.5 w-full ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`px-4 py-2 bg-cyber-bg bg-opacity-60 border ${error ? 'border-cyber-danger' : 'border-cyber-border'} rounded-lg focus:outline-none focus:border-cyber-primary text-slate-200 transition-colors w-full`}
        {...props}
      />
      {error && <span className="text-xs text-cyber-danger font-medium">{error}</span>}
    </div>
  );
}
