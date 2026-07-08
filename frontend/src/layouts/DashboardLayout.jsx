import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, HardDrive, ShieldAlert, FolderSync, 
  FileCheck, History, User, LogOut, Users, FileText, 
  Activity, ShieldCheck, ShieldAlert as AlertIcon, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Dynamically build Sidebar Menu Items based on user role and placement requirements
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(user?.role === 'ADMIN' ? [{ name: 'Users', path: '/admin/users', icon: Users }] : []),
    { name: 'Devices', path: '/devices', icon: HardDrive },
    { name: 'Full Wipe', path: '/full-wipe', icon: ShieldAlert },
    { name: 'Selective Wipe', path: '/selective-wipe', icon: FolderSync },
    { name: 'Certificates', path: '/certificates', icon: FileCheck },
    { name: 'Activity Logs', path: '/activity-logs', icon: History },
    ...(user?.role === 'ADMIN' ? [
      { name: 'Enterprise Reports', path: '/admin/enterprise-reports', icon: FileText },
      { name: 'Audit Logs', path: '/admin/audit-logs', icon: Activity }
    ] : []),
    { name: 'Profile', path: '/profile', icon: User }
  ];

  return (
    <div className="min-h-screen bg-cyber-bg bg-cyber-gradient flex relative">
      {/* Background glowing rings */}
      <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-glow-cyan blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-glow-purple blur-3xl pointer-events-none"></div>

      {/* Responsive Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-cyber-border z-20 flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-cyber-border flex items-center space-x-3 bg-slate-950 bg-opacity-40">
          <ShieldCheck className="w-8 h-8 text-cyber-secondary shadow-neon-cyan rounded" />
          <div>
            <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent uppercase">
              SecureWipe
            </h1>
            <span className="text-[10px] text-cyber-muted font-bold tracking-widest uppercase">
              {user?.role === 'ADMIN' ? 'Admin Node' : 'Operator Console'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                  isActive 
                    ? 'bg-cyber-primary bg-opacity-20 text-cyber-accent border-l-4 border-cyber-primary shadow-neon-purple' 
                    : 'text-slate-400 hover:bg-slate-800 hover:bg-opacity-40 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info / Logout Footer */}
        <div className="p-4 border-t border-cyber-border bg-slate-950 bg-opacity-40 flex flex-col space-y-3">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-full bg-purple-900 bg-opacity-40 flex items-center justify-center font-bold text-cyber-accent border border-cyber-border">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-slate-200 truncate">{user?.fullName || 'User'}</h4>
              <p className="text-[10px] text-cyber-muted truncate">{user?.email || 'user@securewipe.com'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-950 hover:bg-opacity-30 hover:text-red-300 transition-colors text-sm font-semibold border border-transparent hover:border-red-900"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-30 md:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 glass-panel border-r border-cyber-border z-40 flex flex-col md:hidden"
            >
              <div className="p-6 border-b border-cyber-border flex items-center justify-between bg-slate-950 bg-opacity-40">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-6 h-6 text-cyber-secondary" />
                  <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wider">SecureWipe</h1>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                        isActive 
                          ? 'bg-cyber-primary bg-opacity-20 text-cyber-accent border-l-4 border-cyber-primary' 
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="p-4 border-t border-cyber-border bg-slate-950 bg-opacity-40 flex flex-col space-y-3">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-950 hover:bg-opacity-30 hover:text-red-300 transition-colors text-sm font-semibold border border-transparent hover:border-red-900"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Page Area Container */}
      <div className="flex-grow flex flex-col min-w-0 z-10">
        {/* Header (Top bar) */}
        <header className="flex items-center justify-between p-4 md:px-8 border-b border-cyber-border bg-slate-950 bg-opacity-30 backdrop-blur-md">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs text-cyber-muted tracking-wider uppercase font-semibold">Ledger Connection Active</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <span className="text-[10px] text-cyber-muted font-bold uppercase block">Current Operator</span>
              <span className="text-xs text-slate-300 font-bold block">{user?.fullName || 'User'}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-900 bg-opacity-40 flex items-center justify-center font-bold text-cyber-accent border border-cyber-border sm:hidden">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Content Outlet with transition animations */}
        <main className="flex-grow overflow-y-auto p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
