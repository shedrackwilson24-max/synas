import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WalletProvider } from './contexts/WalletContext';

import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';

import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import WorkoutSession from './components/WorkoutSession';
import Training from './components/Training';
import Stats from './components/Stats';
import Profile from './components/Profile';
import Settings from './components/Settings';
import AdminPanel from './components/AdminPanel';
import WorkoutHistory from './components/WorkoutHistory';
import MainLayout from './components/MainLayout';

const LoadingFallback = () => (
  <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center relative overflow-hidden">
    {/* Background Glow */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full" />
    
    <div className="relative flex flex-col items-center gap-8">
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-16 h-16 border-2 border-accent/20 rounded-2xl flex items-center justify-center"
      >
        <div className="w-8 h-8 bg-accent rounded-lg shadow-[0_0_20px_rgba(var(--accent-rgb),0.5)]" />
      </motion.div>

      <div className="flex flex-col items-center gap-2">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-black uppercase tracking-[0.4em] text-accent"
        >
          Neural Syncing
        </motion.div>
        <div className="w-32 h-[1px] bg-white/5 relative overflow-hidden">
          <motion.div 
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent w-full h-full"
          />
        </div>
      </div>
    </div>
  </div>
);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAuthFlow } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingFallback />; 
  if (isAuthFlow) return <Navigate to="/auth" />;
  if (!user) return <Navigate to="/auth" />;

  // If user is logged in but hasn't completed setup, redirect to setup
  if (!profile?.setup_complete && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" />;
  }

  // If user HAS completed setup but is trying to go back to setup, redirect to dashboard
  if (profile?.setup_complete && location.pathname === '/profile-setup') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAuthFlow } = useAuth();
  if (loading) return <LoadingFallback />;
  
  if (user && !isAuthFlow) {
    if (!profile?.setup_complete) return <Navigate to="/profile-setup" />;
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-accent selection:text-black">
        <AnimatePresence mode="wait">
          <Routes>
              <Route path="/" element={<Onboarding />} />
              <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
              <Route path="/profile-setup" element={<PrivateRoute><ProfileSetup /></PrivateRoute>} />
              
              <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/training" element={<Training />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/history" element={<WorkoutHistory />} />
              </Route>

              <Route path="/workout" element={<PrivateRoute><WorkoutSession /></PrivateRoute>} />
            </Routes>
          </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <WalletProvider>
                <AppRoutes />
              </WalletProvider>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
