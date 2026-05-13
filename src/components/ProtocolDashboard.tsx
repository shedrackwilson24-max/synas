import React from 'react';
import { motion } from 'motion/react';
import { useWallet } from '../contexts/WalletContext';
import { 
  Shield, 
  Zap, 
  Lock, 
  Unlock, 
  Cpu, 
  Activity, 
  Globe,
  Share2,
  Database
} from 'lucide-react';

export default function ProtocolDashboard() {
  const { address, isConnected, connect, disconnect, isConnecting } = useWallet();

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="bg-bg-card rounded-[3.5rem] border border-border-color p-10 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
          <Globe size={300} />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary font-display">
                {isConnected ? 'Neural Link Established' : 'Connection Required'}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-black tracking-tight text-text-primary font-display uppercase leading-[0.9]">
                Neural <br />
                <span className="text-brand-primary italic">Protocol</span>
              </h1>
              <p className="text-sm text-text-secondary font-medium leading-relaxed max-w-md">
                Secure your biometric data on the decentralized synapse network. Establishing a neural link allows for immutable record keeping and protocol-level verification.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {isConnected ? (
                <button 
                  onClick={disconnect}
                  className="px-8 py-5 bg-rose-500/10 text-rose-500 rounded-3xl border border-rose-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  Terminate Protocol
                </button>
              ) : (
                <button 
                  onClick={connect}
                  disabled={isConnecting}
                  className="px-8 py-5 bg-blue-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 font-display"
                >
                  {isConnecting ? 'Establishing Link...' : 'Initiate Secure Link'}
                </button>
              )}
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className={`w-64 h-64 rounded-[4rem] border-2 transition-all duration-700 flex items-center justify-center relative ${isConnected ? 'border-brand-primary bg-brand-primary/5 shadow-2xl shadow-brand-primary/20' : 'border-dashed border-border-color bg-bg-secondary opacity-50'}`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-transparent animate-pulse" />
              {isConnected ? <Unlock size={80} className="text-brand-primary" /> : <Lock size={80} className="text-text-secondary" />}
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ProtocolCard 
          icon={<Shield className="text-brand-primary" />}
          label="Verification"
          value={isConnected ? "VERIFIED" : "PENDING"}
          desc="Neural hash validation"
          active={isConnected}
        />
        <ProtocolCard 
          icon={<Activity className="text-brand-vibrant" />}
          label="Transmission"
          value={isConnected ? "ENCRYPTED" : "LOCKED"}
          desc="AES-256 Protocol"
          active={isConnected}
        />
        <ProtocolCard 
          icon={<Cpu className="text-brand-cyan" />}
          label="Sovereignty"
          value={isConnected ? "FULL" : "RESTRICTED"}
          desc="Data ownership status"
          active={isConnected}
        />
      </div>

      {/* Connection Details Section */}
      {isConnected && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-card rounded-[3rem] border border-border-color p-8 shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-bg-secondary flex items-center justify-center text-brand-primary shadow-inner">
                <Database size={32} />
              </div>
              <div>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-1 font-display">Neural Identifier</p>
                <p className="text-lg font-mono font-bold text-text-primary break-all">{address}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="p-4 rounded-2xl bg-bg-secondary border border-border-color text-text-secondary hover:text-brand-primary transition-all shadow-sm">
                <Share2 size={20} />
              </button>
              <button className="p-4 rounded-2xl bg-bg-secondary border border-border-color text-text-secondary hover:text-brand-primary transition-all shadow-sm">
                <Globe size={20} />
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {!isConnected && (
        <div className="bg-bg-secondary/50 rounded-[3rem] p-12 border-2 border-dashed border-border-color text-center">
          <Zap className="text-text-secondary/10 mx-auto mb-6" size={60} />
          <h3 className="text-xl font-bold text-text-secondary font-display uppercase tracking-wider">Protocol Locked</h3>
          <p className="text-xs text-text-secondary/60 mt-2 max-w-xs mx-auto">Connect your wallet to authorize the decentralized biometric storage protocol.</p>
        </div>
      )}
    </div>
  );
}

function ProtocolCard({ icon, label, value, desc, active }: { icon: React.ReactNode, label: string, value: string, desc: string, active: boolean }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border transition-all ${active ? 'bg-bg-card border-border-color shadow-sm' : 'bg-bg-secondary/30 border-transparent opacity-60'}`}>
      <div className="w-12 h-12 rounded-2xl bg-bg-secondary flex items-center justify-center mb-6 shadow-inner">
        {icon}
      </div>
      <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-3 font-display">{label}</p>
      <h4 className={`text-2xl font-black font-display tracking-tight mb-2 ${active ? 'text-text-primary' : 'text-text-secondary'}`}>{value}</h4>
      <p className="text-[10px] text-text-secondary/50 font-bold uppercase tracking-widest font-display">{desc}</p>
    </div>
  );
}
