import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { DeviceProvider } from './context/DeviceContext';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

// Guards
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Public Pages
import Login from './pages/login';
import Register from './pages/register';
import ForgotPassword from './pages/forgot-password';
import AccessDenied from './pages/access-denied';

// Operator/User Pages
import Dashboard from './pages/dashboard';
import Devices from './pages/devices';
import FullWipe from './pages/full-wipe';
import SelectiveWipe from './pages/selective-wipe';
import WipeSummary from './pages/wipe-summary';
import Verification from './pages/verification';
import Certificates from './pages/certificates';
import ActivityLogs from './pages/activity-logs';
import Profile from './pages/profile';

// Admin Pages
import AdminPanel from './pages/admin-panel';
import AdminAuditLogs from './pages/admin-audit-logs';
import EnterpriseReports from './pages/enterprise-reports';

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <DeviceProvider>
            <ErrorBoundary>
              <Router>
                <Routes>
                  {/* 1. Public Auth Routes */}
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                  </Route>

                  {/* 2. Security Clearance Route Guard */}
                  <Route path="/access-denied" element={<AccessDenied />} />

                  {/* 3. Protected Operator Dashboard Routes */}
                  <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/devices" element={<Devices />} />
                    <Route path="/full-wipe" element={<FullWipe />} />
                    <Route path="/selective-wipe" element={<SelectiveWipe />} />
                    <Route path="/wipe-summary" element={<WipeSummary />} />
                    <Route path="/verification" element={<Verification />} />
                    <Route path="/certificates" element={<Certificates />} />
                    <Route path="/activity-logs" element={<ActivityLogs />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/:operatorId" element={<Profile />} />

                    {/* 4. Protected Admin Workspace Routes */}
                    <Route element={<AdminLayout />}>
                      <Route path="/admin/users" element={<AdminPanel />} />
                      <Route path="/admin/reports" element={<Dashboard />} />
                      <Route path="/admin/enterprise-reports" element={<EnterpriseReports />} />
                      <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                    </Route>
                  </Route>

                  {/* 5. Fallback Wildcard redirect */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Router>
            </ErrorBoundary>
          </DeviceProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
