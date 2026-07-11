import React, { useState } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { KeyRound, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { showNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Determine redirection path (fallback to dashboard)
  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all authorization fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      showNotification('Access authorized. Session key active.', 'success', 'Login Approved');
      navigate(from, { replace: true });
    } catch (err) {
      const errorData = err.response?.data?.error;
      const msg = typeof errorData === 'object' && errorData !== null
        ? errorData.message || JSON.stringify(errorData)
        : (errorData || 'Authentication credentials rejected.');
      setError(msg);
      showNotification(msg, 'danger', 'Login Denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {/* Title */}
      <h2 className="text-xl font-bold text-center text-slate-100 uppercase tracking-widest">
        Clearance Login
      </h2>

      {/* Error banner */}
      {error && (
        <div className="p-3.5 border border-red-900 border-opacity-40 bg-red-950 bg-opacity-20 rounded-xl text-xs text-red-400 flex items-start space-x-2 animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Inputs */}
      <div className="space-y-4">
        <div className="relative flex items-center">
          <Mail className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Operator Email (admin@securewipe.com)"
            required
            className="w-full pl-10 pr-4 py-2.5 bg-cyber-bg bg-opacity-60 border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          />
        </div>

        <div className="relative flex items-center">
          <KeyRound className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Security Clearance Key"
            required
            className="w-full pl-10 pr-4 py-2.5 bg-cyber-bg bg-opacity-60 border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          />
        </div>
      </div>

      {/* Forgot Password Link */}
      <div className="text-right">
        <NavLink 
          to="/forgot-password" 
          className="text-[10px] text-cyber-secondary hover:text-cyber-accent font-bold uppercase tracking-wider transition-colors"
        >
          Recover credentials
        </NavLink>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full py-3 flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-wider shadow-neon-purple"
      >
        <span>{loading ? 'Validating Session...' : 'Authenticate Console'}</span>
      </Button>

      {/* Register Redirect */}
      <div className="text-center pt-2">
        <span className="text-[10px] text-cyber-muted font-medium">New console operator? </span>
        <NavLink 
          to="/register" 
          className="text-[10px] text-cyber-secondary hover:text-cyber-accent font-bold uppercase tracking-wider transition-colors"
        >
          Create registry key
        </NavLink>
      </div>
    </form>
  );
}
