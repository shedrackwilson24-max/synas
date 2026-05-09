import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Database, Download, Upload, RefreshCw, FileJson, FileSpreadsheet, Heart, Activity, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { exportUserData, downloadAsFile, importSampleData } from '../services/dataService';

export default function DataManagement() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async (type: 'json' | 'csv') => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await exportUserData(user.uid);
      downloadAsFile(data, `synapse-health-data-${new Date().toISOString().split('T')[0]}.${type}`, type);
      addNotification('success', 'Archive Ready', 'Your health metadata has been successfully exported.');
    } catch (err) {
      addNotification('reminder', 'Export Failed', 'Unable to generate data archive.');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleImport = async () => {
    if (!user) return;
    setImporting(true);
    try {
      await importSampleData(user.uid);
      addNotification('success', 'System Bootstrapped', 'Sample biometric data has been integrated into your profile.');
    } catch (err) {
      addNotification('reminder', 'Import Failed', 'Failed to inject sample data.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-bg-card border border-border-color flex items-center justify-center shadow-sm">
            <Database size={16} className="text-brand-primary" />
          </div>
          <h2 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] font-display">Data Custody</h2>
        </div>

        <div className="bg-bg-card rounded-[2.5rem] border border-border-color p-8 space-y-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleExport('json')}
              disabled={loading}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-bg-secondary border border-border-color hover:border-brand-primary/30 hover:bg-bg-card transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-bg-card flex items-center justify-center text-text-secondary group-hover:text-brand-primary shadow-sm transition-all">
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <FileJson size={20} />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary font-display">Export JSON</span>
            </button>

            <button 
              onClick={() => handleExport('csv')}
              disabled={loading}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-bg-secondary border border-border-color hover:border-brand-vibrant/30 hover:bg-bg-card transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-bg-card flex items-center justify-center text-text-secondary group-hover:text-brand-vibrant shadow-sm transition-all">
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <FileSpreadsheet size={20} />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary font-display">Export CSV</span>
            </button>
          </div>

          <p className="text-[10px] text-text-secondary font-medium text-center leading-relaxed font-display">
            Generate a portable encrypted archive of your biometrics, activity sessions, and performance trends. You own your data.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-bg-card border border-border-color flex items-center justify-center shadow-sm">
            <Upload size={16} className="text-brand-cyan" />
          </div>
          <h2 className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] font-display">External Integration</h2>
        </div>

        <div className="bg-bg-card rounded-[2.5rem] border border-border-color p-8 space-y-6 shadow-sm">
            <div className="space-y-3">
                <IntegrationCard 
                    icon={<Heart size={20} />} 
                    title="Apple Health" 
                    status="Pending Setup" 
                    color="text-rose-500"
                    sub="Sync iOS biometric payloads"
                />
                <IntegrationCard 
                    icon={<Activity size={20} />} 
                    title="Garmin Connect" 
                    status="Manual Import" 
                    color="text-brand-vibrant" 
                    sub="Integrate performance metadata"
                />
            </div>

            <button 
              onClick={handleSampleImport}
              disabled={importing}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-text-primary text-bg-primary hover:bg-text-secondary transition-all active:scale-95 disabled:opacity-50"
            >
                <div className="flex items-center gap-3">
                    <RefreshCw size={18} className={importing ? 'animate-spin' : ''} />
                    <span className="text-xs font-bold uppercase tracking-widest font-display">Inject Sample Protocol</span>
                </div>
                <Globe size={16} className="opacity-50" />
            </button>
            <p className="text-[9px] text-text-secondary text-center font-bold uppercase tracking-widest font-display">MVP: Simulated Data Integration</p>
        </div>
      </section>
    </div>
  );
}

function IntegrationCard({ icon, title, status, color, sub }: { icon: React.ReactNode, title: string, status: string, color: string, sub: string }) {
    return (
        <div className="flex items-center justify-between p-5 rounded-2xl border border-border-color bg-bg-secondary/50">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-bg-card flex items-center justify-center ${color} shadow-sm border border-border-color`}>
                    {icon}
                </div>
                <div>
                    <h4 className="text-xs font-bold text-text-primary tracking-tight font-display">{title}</h4>
                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mt-0.5 font-display">{sub}</p>
                </div>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 bg-bg-card rounded border border-border-color text-text-secondary font-display">
                {status}
            </span>
        </div>
    );
}
