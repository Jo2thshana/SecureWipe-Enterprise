import React, { createContext, useState, useContext, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const NotificationContext = createContext({
  showNotification: (message, type, title) => {}
});

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showNotification = useCallback((message, type = 'info', title = '') => {
    let finalMessage = message;
    if (message instanceof Error) {
      finalMessage = message.message;
    } else if (message && typeof message === 'object') {
      finalMessage = message.error || message.message || JSON.stringify(message);
    } else if (typeof message !== 'string') {
      finalMessage = String(message);
    }

    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, message: finalMessage, type, title }]);
    
    // Automatically dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastColors = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500 bg-emerald-950 bg-opacity-90 text-emerald-200 shadow-neon-green';
      case 'warning':
        return 'border-amber-500 bg-amber-950 bg-opacity-90 text-amber-200 shadow-neon-warning';
      case 'danger':
        return 'border-red-500 bg-red-950 bg-opacity-90 text-red-200 shadow-neon-red';
      case 'info':
      default:
        return 'border-cyan-500 bg-cyan-950 bg-opacity-90 text-cyan-200 shadow-neon-cyan';
    }
  };

  const getToastIcon = (type) => {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'danger': return '⚡';
      case 'info':
      default: return 'i';
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Toast Overlay Portal */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col space-y-3 w-full max-w-sm">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`p-4 border rounded-xl shadow-glass flex items-start space-x-3 backdrop-blur-md ${getToastColors(t.type)}`}
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black bg-opacity-25 flex items-center justify-center font-bold text-sm">
                {getToastIcon(t.type)}
              </div>
              <div className="flex-grow">
                {t.title && <h4 className="font-bold text-xs uppercase tracking-wider">{t.title}</h4>}
                <p className="text-xs leading-normal mt-0.5">{t.message}</p>
              </div>
              <button 
                onClick={() => dismissToast(t.id)} 
                className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-semibold self-start"
              >
                &times;
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
