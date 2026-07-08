import React from 'react';

export default function Button({ children, onClick, className = '', variant = 'primary', ...props }) {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-cyber-primary text-white hover:bg-opacity-80 shadow-neon-purple active:scale-95",
    secondary: "bg-cyber-secondary text-cyber-bg font-semibold hover:bg-opacity-80 shadow-neon-cyan active:scale-95",
    danger: "bg-cyber-danger text-white hover:bg-opacity-80 active:scale-95",
    ghost: "bg-transparent border border-cyber-border text-slate-300 hover:bg-slate-800"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}
