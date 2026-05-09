import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, FileText, CheckCircle2 } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-lg bg-bg-card border border-border-color rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-10 border-b border-border-color flex items-center justify-between bg-bg-primary/50 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-text-primary font-display uppercase">Synapse Protocol</h3>
                  <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.3em] font-display">Terms of Service v1.0.4</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-text-secondary hover:text-text-primary transition-all border border-border-color shadow-sm"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-10 pb-6 overflow-y-auto space-y-10 custom-scrollbar scrollbar-hide">
              <section className="group">
                <h4 className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-cyan mb-4 font-display group-hover:text-brand-primary transition-colors">
                  <FileText size={16} />
                  01. Data Synthesis
                </h4>
                <p className="text-text-secondary text-sm leading-relaxed font-medium font-display opacity-80 group-hover:opacity-100 transition-opacity">
                  Synapse processes your biometric data (Age, Gender, Activity Level, Fitness Metrics) to synchronize your training protocols. Your data is stored securely in our neural encrypted database and is never shared with third-party networks without explicit authorization.
                </p>
              </section>

              <section className="group">
                <h4 className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-primary mb-4 font-display group-hover:text-brand-cyan transition-colors">
                  <CheckCircle2 size={16} />
                  02. Protocol Integrity
                </h4>
                <p className="text-text-secondary text-sm leading-relaxed font-medium font-display opacity-80 group-hover:opacity-100 transition-opacity">
                  By initializing this protocol, you acknowledge that Synapse provides AI-assisted fitness guidance. Physical activity carries inherent risks; consult with a medical professional before engaging in high-intensity synaptic training.
                </p>
              </section>

              <section className="group">
                <h4 className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-vibrant mb-4 font-display group-hover:text-brand-primary transition-colors">
                  <Shield size={16} />
                  03. Security Layers
                </h4>
                <p className="text-text-secondary text-sm leading-relaxed font-medium font-display opacity-80 group-hover:opacity-100 transition-opacity">
                  We implement industry-standard encryption to protect your synaptic nodes. You retain full ownership of your data and can request permanent deletion (factory reset) at any time through the profile interface.
                </p>
              </section>

              <div className="pt-6 border-t border-border-color/30">
                <p className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-widest leading-relaxed font-display text-center italic">
                  * Continued use of the Synapse protocol constitutes dynamic acceptance of these synthesized terms.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-10 pt-4 bg-bg-primary/30">
              <button
                onClick={onAccept}
                className="w-full bg-text-primary py-6 rounded-[1.5rem] flex items-center justify-center text-bg-primary font-bold uppercase tracking-widest transition-all active:scale-95 shadow-xl font-display text-sm hover:scale-[1.02]"
              >
                Accept Protocol
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
