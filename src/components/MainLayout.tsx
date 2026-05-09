import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutGrid, Dumbbell, BarChart3, User, Activity, Heart, Shield, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

export default function MainLayout() {
  const location = useLocation();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-brand-primary selection:text-white relative flex flex-col lg:flex-row font-sans">
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col w-72 bg-bg-card border-r border-border-color h-screen sticky top-0 px-8 py-10 z-50 overflow-y-auto shadow-sm">
        <div className="flex items-center gap-4 mb-14 px-2">
          <Logo className="w-full h-auto px-4" />
        </div>

        <div className="flex-1 space-y-2.5">
          <SidebarItem to="/dashboard" icon={<LayoutGrid size={20} />} label="Overview" />
          <SidebarItem to="/training" icon={<Activity size={20} />} label="Activity" />
          <SidebarItem to="/stats" icon={<BarChart3 size={20} />} label="Analytics" />
          <SidebarItem to="/profile" icon={<User size={20} />} label="Profile" />
          <SidebarItem to="/settings" icon={<Settings size={20} />} label="Settings" />
          
          <div className="pt-6">
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-border-color">
          <div className="bg-bg-secondary p-5 rounded-[2rem] border border-border-color shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-white dark:border-zinc-800 bg-brand-primary/5 flex items-center justify-center shadow-inner overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email || 'user'}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-text-primary truncate">
                  {profile?.name || 'Authorized User'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                    {profile?.activity_rank?.toFixed(1) || '1.0'} Score
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full relative pb-24 lg:pb-12 overflow-x-hidden pt-4 lg:pt-10 px-6 sm:px-10">
        {/* Mobile Header */}
        <div className="flex lg:hidden items-center justify-between mb-8">
          <Logo className="w-32 h-auto" />
          <ThemeToggle />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Persistent Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card/80 backdrop-blur-3xl border-t border-border-color px-8 pb-10 pt-4 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <NavItem to="/dashboard" icon={<LayoutGrid size={24} />} label="Overview" />
          <NavItem to="/training" icon={<Activity size={24} />} label="Activity" />
          <NavItem to="/stats" icon={<BarChart3 size={24} />} label="Analytics" />
          <NavItem to="/profile" icon={<User size={24} />} label="Profile" />
        </div>
      </nav>

      {/* Decorative Orbs */}
      <div className="fixed top-[-10%] right-[-10%] w-[60%] aspect-square bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[60%] aspect-square bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}

function SidebarItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink to={to} className="w-full no-underline">
      {({ isActive }) => (
        <div className={`
          flex items-center gap-4 px-5 py-4 rounded-[1.25rem] transition-all duration-300 group relative
          ${isActive 
            ? 'text-white shadow-xl shadow-brand-primary/20' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'}
        `}>
          <span className="relative z-10">{icon}</span>
          <span className="text-xs font-bold tracking-tight relative z-10 font-display">{label}</span>
          {isActive && (
            <motion.div 
              layoutId="sidebar-active"
              className="absolute inset-0 neural-gradient rounded-[1.25rem] -z-10"
            />
          )}
        </div>
      )}
    </NavLink>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `
        flex flex-col items-center gap-1.5 transition-all duration-300 relative group
        ${isActive ? 'text-text-primary scale-105' : 'text-text-secondary'}
      `}
    >
      {({ isActive }) => (
        <>
          <div className={`p-2.5 rounded-2xl transition-all duration-300 ${isActive ? 'neural-gradient text-white shadow-lg shadow-brand-primary/20' : 'bg-transparent'}`}>
            {icon}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest font-display">{label}</span>
          {isActive && (
            <motion.div 
              layoutId="nav-dot"
              className="w-1.5 h-1.5 rounded-full bg-brand-cyan absolute -top-1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}
