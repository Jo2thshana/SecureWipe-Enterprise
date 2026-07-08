import React from 'react';

export default function ForgotPassword() {
  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-xl font-bold text-center text-slate-100 uppercase tracking-wide">Forgot Password</h2>
      <p className="text-xs text-cyber-muted text-center leading-relaxed">
        Input your security clearance email below to receive a password reset token.
      </p>
    </div>
  );
}
