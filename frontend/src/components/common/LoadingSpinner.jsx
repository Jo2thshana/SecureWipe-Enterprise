import React from 'react';

export default function LoadingSpinner({ size = "md", message }) {
  const sizes = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4"
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-3">
      <div className={`${sizes[size] || sizes.md} rounded-full border-t-cyber-primary border-r-transparent border-b-cyber-secondary border-l-transparent animate-spin`}></div>
      {message && <p className="text-sm font-medium text-slate-400 animate-pulse">{message}</p>}
    </div>
  );
}
