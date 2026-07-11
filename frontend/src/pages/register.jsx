import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Button from '../components/common/Button';
import { User, KeyRound, Mail, Shield, AlertCircle } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const { showNotification } = useNotifications();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please complete all security registry fields.');
      return;
    }

    if (password.length < 8) {
      setError('Clearence key must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Credentials mismatch: passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(fullName, email, password, role);
      showNotification('Operator key created successfully. You may login.', 'success', 'Registry Key Compiled');
      navigate('/login');
    } catch (err) {
      const errorData = err.response?.data?.error;
      const msg = typeof errorData === 'object' && errorData !== null
        ? errorData.message || JSON.stringify(errorData)
        : (errorData || 'Failed to compile operator credentials.');
      setError(msg);
      showNotification(msg, 'danger', 'Registry Rejected');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      <h2 className="text-xl font-bold text-center text-slate-100 uppercase tracking-widest">
        Operator Registry
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
          <User className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Operator Full Name"
            required
            className="w-full pl-10 pr-4 py-2.5 bg-cyber-bg bg-opacity-60 border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          />
        </div>

        <div className="relative flex items-center">
          <Mail className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Operator Email"
            required
            className="w-full pl-10 pr-4 py-2.5 bg-cyber-bg bg-opacity-60 border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          />
        </div>

        <div className="relative flex items-center">
          <Shield className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-cyber-bg bg-opacity-60 border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          >
            <option value="USER">Console User (Operator)</option>
            <option value="ADMIN">System Admin (Compliance Auditor)</option>
          </select>
        </div>

        <div className="relative flex items-center">
          <KeyRound className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Access Key (Min 8 chars)"
            required
            className="w-full pl-10 pr-4 py-2.5 bg-cyber-bg bg-opacity-60 border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          />
        </div>

        <div className="relative flex items-center">
          <KeyRound className="absolute left-3 w-4 h-4 text-cyber-muted" />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Access Key"
            required
            className="w-full pl-10 pr-4 py-2.5 bg-cyber-bg bg-opacity-60 border border-cyber-border rounded-xl text-slate-200 focus:outline-none focus:border-cyber-primary text-xs"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full py-3 flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-wider shadow-neon-purple"
      >
        <span>{loading ? 'Creating Registry...' : 'Compile Operator Key'}</span>
      </Button>

      {/* Login Redirect */}
      <div className="text-center pt-2">
        <span className="text-[10px] text-cyber-muted font-medium">Already registered? </span>
        <NavLink 
          to="/login" 
          className="text-[10px] text-cyber-secondary hover:text-cyber-accent font-bold uppercase tracking-wider transition-colors"
        >
          Console Login
        </NavLink>
      </div>
    </form>
  );
}
