import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Database, Activity, TrendingUp, ShieldCheck, Mail, Calendar, Loader2 } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    userCount: 0,
    totalWorkouts: 0,
    totalDailyStats: 0,
    feedbackCount: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Loose admin check for MVP
  const isAdmin = user?.email === 'shedrackwilson24@gmail.com' || user?.email?.includes('admin');

  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const workoutsSnap = await getDocs(collection(db, 'workouts'));
        const statsSnap = await getDocs(collection(db, 'dailyStats'));
        const feedbackSnap = await getDocs(collection(db, 'feedback'));

        setStats({
          userCount: usersSnap.size,
          totalWorkouts: workoutsSnap.size,
          totalDailyStats: statsSnap.size,
          feedbackCount: feedbackSnap.size
        });

        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 10));
        setRecentFeedback(feedbackSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0)).slice(0, 5));
      } catch (err) {
        console.error('Admin data fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center text-rose-500 mb-8 shadow-inner">
          <ShieldCheck size={48} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-3 font-display uppercase italic">Access Denied</h1>
        <p className="text-text-secondary max-w-sm font-display text-sm leading-relaxed">Secure administrative node. Your authorization level does not match current protocol depth. System oversight is restricted.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-40 pt-10 px-8 max-w-7xl mx-auto"
    >
      <header className="mb-16">
        <div className="flex items-center gap-4 mb-4">
          <div className="px-4 py-1.5 neural-gradient text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg font-display">System Oversight</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
            <p className="text-[10px] text-brand-cyan font-bold uppercase tracking-widest font-display">Neural Interface Link Active</p>
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tighter text-text-primary font-display uppercase">Administrative Matrix</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <AdminStat icon={<Users size={28} />} label="Active Protocols" value={stats.userCount} color="indigo" />
        <AdminStat icon={<Activity size={28} />} label="Session Volume" value={stats.totalWorkouts} color="cyan" />
        <AdminStat icon={<Database size={28} />} label="Metadata Pool" value={stats.totalDailyStats} color="vibrant" />
        <AdminStat icon={<TrendingUp size={28} />} label="Synthesized Intel" value={stats.feedbackCount} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="bg-bg-card rounded-[3.5rem] border border-border-color p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-bl-[5rem] -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
          <h3 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.4em] mb-10 font-display">Agent Directory</h3>
          <div className="space-y-5">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-5 bg-bg-secondary rounded-3xl border border-border-color group hover:border-brand-primary/20 transition-all shadow-inner">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-bg-card flex items-center justify-center text-text-secondary shadow-sm border border-border-color group-hover:text-brand-primary transition-colors">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-text-primary font-display uppercase tracking-tight">{u.name || 'Unknown Agent'}</p>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.1em] font-display opacity-40">{u.email}</p>
                  </div>
                </div>
                <div className="px-4 py-1.5 bg-bg-card rounded-full text-[9px] font-bold uppercase tracking-widest border border-border-color text-text-secondary group-hover:text-brand-primary transition-all font-display">
                  {u.activity_level || 'Beginner'}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-bg-card rounded-[3.5rem] border border-border-color p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/5 rounded-bl-[5rem] -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
          <h3 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.4em] mb-10 font-display">Intelligence Core</h3>
          <div className="space-y-8">
            {recentFeedback.map((f, idx) => (
              <div key={f.id} className="relative pl-8 border-l-2 border-border-color group/item">
                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-brand-primary group-hover/item:scale-150 transition-transform shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-text-primary font-display uppercase tracking-wider">{f.userEmail}</p>
                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest font-display opacity-40">
                        {f.timestamp?.toDate?.().toLocaleDateString() || 'Recent'}
                    </p>
                </div>
                <p className="text-xs text-text-secondary font-medium leading-relaxed italic mb-5 font-display">"{f.desiredFeatures || 'No specific requests.'}"</p>
                <div className="flex flex-wrap gap-3">
                    <span className="px-3 py-1.5 bg-brand-primary/5 text-brand-primary text-[9px] font-bold uppercase tracking-widest rounded-xl border border-brand-primary/10 font-display">{f.devices}</span>
                    <span className="px-3 py-1.5 bg-brand-cyan/5 text-brand-cyan text-[9px] font-bold uppercase tracking-widest rounded-xl border border-brand-cyan/10 font-display">{f.rating} Stars Recalibration</span>
                </div>
              </div>
            ))}
            {recentFeedback.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <Database size={48} className="mb-4" />
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.4em] font-display">Protocol data depleted</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function AdminStat({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
  const colorMap: any = {
    indigo: 'bg-brand-primary/10 text-brand-primary shadow-indigo-500/10',
    cyan: 'bg-brand-cyan/10 text-brand-cyan shadow-cyan-500/10',
    vibrant: 'bg-brand-vibrant/10 text-brand-vibrant shadow-indigo-500/10',
    blue: 'bg-blue-500/10 text-blue-500 shadow-blue-500/10',
    amber: 'bg-amber-500/10 text-amber-500 shadow-amber-500/10'
  }
  return (
    <div className="bg-bg-card p-10 rounded-[3rem] border border-border-color shadow-sm flex items-center justify-between group hover:border-brand-primary/20 transition-all active:scale-95">
      <div>
        <h4 className="text-5xl font-bold tracking-tighter text-text-primary mb-2 font-display uppercase group-hover:text-brand-primary transition-colors">{value}</h4>
        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] font-display">{label}</p>
      </div>
      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg ${colorMap[color] || colorMap.indigo}`}>
        {icon}
      </div>
    </div>
  );
}
