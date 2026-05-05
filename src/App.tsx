import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load others
const Auth = lazy(() => import('./components/Auth'));
const ProfileSetup = lazy(() => import('./components/ProfileSetup'));
const WorkoutSession = lazy(() => import('./components/WorkoutSession'));
const Training = lazy(() => import('./components/Training'));
const Stats = lazy(() => import('./components/Stats'));
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));
const WorkoutHistory = lazy(() => import('./components/WorkoutHistory'));
const MainLayout = lazy(() => import('./components/MainLayout'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">
      Neural Sync...
    </div>
  </div>
);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthFlow } = useAuth();
  if (loading) return <LoadingFallback />; 
  if (isAuthFlow) return <Navigate to="/auth" />;
  return user ? <>{children}</> : <Navigate to="/auth" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthFlow } = useAuth();
  if (loading) return <LoadingFallback />;
  if (user && !isAuthFlow) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-accent selection:text-black">
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
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
              <Route path="/history" element={<WorkoutHistory />} />
            </Route>

            <Route path="/workout" element={<PrivateRoute><WorkoutSession /></PrivateRoute>} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}
