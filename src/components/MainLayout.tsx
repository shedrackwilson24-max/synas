import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, Dumbbell, BarChart3, User } from 'lucide-react';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-accent selection:text-black relative">
      {/* Scrollable Content Area */}
      <main className="max-w-md mx-auto relative pb-24">
        <Outlet />
      </main>

      {/* Persistent Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-2xl border-t border-[var(--border-color)] px-6 pb-8 pt-4">
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

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `
        flex flex-col items-center gap-1 transition-all duration-300
        ${isActive ? 'text-accent scale-110' : 'text-gray-600 hover:text-gray-300'}
      `}
    >
      {({ isActive }) => (
        <>
          <div className="p-2 rounded-xl transition-colors">
            {icon}
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
          
          {/* Active Indicator */}
          <div className={`
            w-1.5 h-1.5 rounded-full bg-accent mt-1 transition-all duration-300
            ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `} />
        </>
      )}
    </NavLink>
  );
}
