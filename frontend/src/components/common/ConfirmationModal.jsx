import React, { useState, useEffect } from 'react';
import Button from './Button';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title = "Confirm Action", message, confirmText }) {
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTypedText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const requiresTyping = typeof confirmText === 'string' && confirmText.trim().length > 0;
  const isButtonDisabled = requiresTyping && typedText.trim() !== confirmText.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-cyber-danger shadow-neon-red overflow-hidden">
        <div className="p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-cyber-danger bg-opacity-20 flex items-center justify-center text-cyber-danger text-2xl font-bold">
            ⚠
          </div>
          <h3 className="text-xl font-extrabold text-slate-100">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {message || "Are you sure you want to permanently erase data? This action cannot be undone."}
          </p>

          {requiresTyping && (
            <div className="space-y-2 text-left pt-2">
              <label className="text-[10px] uppercase font-bold text-cyber-muted tracking-wider block">
                Please type <span className="text-cyber-danger select-all font-mono font-black">{confirmText}</span> to confirm:
              </label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={`Type "${confirmText}"`}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-cyber-danger tracking-wide"
              />
            </div>
          )}

          <div className="flex space-x-3 justify-center pt-2">
            <Button variant="ghost" onClick={onClose}>
              CANCEL
            </Button>
            <Button 
              variant="danger" 
              onClick={onConfirm} 
              disabled={isButtonDisabled}
              className={`shadow-neon-red ${isButtonDisabled ? 'opacity-40 cursor-not-allowed shadow-none' : ''}`}
            >
              YES, WIPE DEVICE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
