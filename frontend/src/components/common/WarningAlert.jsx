import React from 'react';

export default function WarningAlert({ message, title = "Security Warning" }) {
  return (
    <div className="p-4 border border-cyber-warning border-opacity-40 rounded-xl bg-cyber-warning bg-opacity-10 text-cyber-warning flex items-start space-x-3">
      <span className="text-xl font-bold mt-0.5">⚠</span>
      <div>
        <h4 className="font-bold text-sm text-amber-200">{title}</h4>
        <p className="text-xs text-amber-300 leading-normal mt-0.5">{message}</p>
      </div>
    </div>
  );
}
