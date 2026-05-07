import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutGrid, Dumbbell, BarChart3, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function MainLayout() {
  const location = useLocation();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-accent selection:text-black relative flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col w-72 bg-[var(--bg-primary)] border-r border-[var(--border-color)] h-screen sticky top-0 p-8 z-50">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
            <LayoutGrid size={24} className="text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">Synapse</h1>
            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Growth Protocol</p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <SidebarItem to="/dashboard" icon={<LayoutGrid size={20} />} label="Dashboard" />
          <SidebarItem to="/training" icon={<Dumbbell size={20} />} label="Training" />
          <SidebarItem to="/stats" icon={<BarChart3 size={20} />} label="Stats" />
          <SidebarItem to="/profile" icon={<User size={20} />} label="Profile" />
        </div>

        <div className="mt-auto pt-8 border-t border-[var(--border-color)]">
          <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <User size={20} className="text-accent" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest truncate">
                  {profile?.name || 'SYNCED UNIT'}
                </p>
                <p className="text-[8px] text-gray-500 font-bold uppercase">
                  Rank: {profile?.activity_rank?.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full relative pb-24 lg:pb-8 overflow-x-hidden pt-4 lg:pt-8 px-4 sm:px-8 lg:px-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Persistent Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-2xl border-t border-[var(--border-color)] px-6 pb-8 pt-4 lg:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <NavItem to="/dashboard" icon={<LayoutGrid size={24} />} label="Dashboard" />
          <NavItem to="/training" icon={<Dumbbell size={24} />} label="Training" />
          <NavItem to="/stats" icon={<BarChart3 size={24} />} label="Stats" />
          <NavItem to="/profile" icon={<User size={24} />} label="Profile" />
        </div>
      </nav>

      {/* Decorative Orbs */}
      <div className="fixed top-[-10%] right-[-10%] w-[60%] aspect-square bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[60%] aspect-square bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}

function SidebarItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `
        flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative
        ${isActive ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'text-gray-500 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}
      `}
    >
      <span className="relative z-10">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{label}</span>
      {/* Visual Glitch/Flourish on Hover */}
      <div className="absolute inset-0 bg-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </NavLink>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `
        flex flex-col items-center gap-1 transition-all duration-300 relative group
        ${isActive ? 'text-accent scale-110' : 'text-gray-600 hover:text-gray-300'}
      `}
    >
      {({ isActive }) => (
        <>
          <motion.div 
            whileTap={{ scale: 0.9, rotate: isActive ? 0 : [0, -10, 10, 0] }}
            className="p-2 rounded-xl transition-colors relative"
          >
            {isActive && (
              <motion.div 
                layoutId="nav-bg"
                className="absolute inset-0 bg-accent/10 rounded-xl blur-sm"
              />
            )}
            {icon}
          </motion.div>
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
          
          {/* Active Indicator */}
          <AnimatePresence>
            {isActive && (
              <motion.div 
                layoutId="active-dot"
                className="w-1.5 h-1.5 rounded-full bg-accent mt-1"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  );
}
