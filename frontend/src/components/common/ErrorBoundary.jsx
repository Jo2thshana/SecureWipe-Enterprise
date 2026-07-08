import React from 'react';
import GlassCard from './GlassCard';
import Button from './Button';
import { ShieldAlert } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-200">
          <GlassCard glowColor="red" className="max-w-md w-full space-y-6 bg-slate-950 bg-opacity-80 border-red-500 border p-8 rounded-2xl shadow-neon-red">
            <div className="flex items-center space-x-3 text-red-500">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
              <h1 className="text-xl font-bold uppercase tracking-widest">FATAL CRASH DETECTED</h1>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-400 leading-relaxed font-semibold uppercase tracking-wider">
                The secure sandbox environment encountered an unrecoverable runtime exception:
              </p>
              <div className="p-4 bg-red-950 bg-opacity-40 border border-red-900 border-opacity-40 rounded-xl font-mono text-xs text-red-400 break-all select-all">
                {this.state.error?.message || String(this.state.error)}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button 
                variant="primary" 
                onClick={this.handleReset}
                className="w-full bg-red-600 hover:bg-red-700 text-white uppercase tracking-widest text-xs font-bold py-3 shadow-neon-red border-red-500"
              >
                Reset Session & Return to Dashboard
              </Button>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
