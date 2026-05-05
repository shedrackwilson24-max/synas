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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--text-primary)]">Synapse Protocol</h3>
                  <p className="text-[8px] text-[var(--text-secondary)] font-bold uppercase tracking-[0.2em]">Terms of Service v1.0</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-8 pb-4 overflow-y-auto space-y-6 custom-scrollbar">
              <section>
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent mb-3">
                  <FileText size={14} />
                  01. Data Usage
                </h4>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-medium">
                  Synapse processes your biometric data (Age, Gender, Activity Level, Fitness Metrics) to synchronize your training protocols. Your data is stored securely in our neural encrypted database and is never shared with third-party networks without explicit authorization.
                </p>
              </section>

              <section>
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent mb-3">
                  <CheckCircle2 size={14} />
                  02. App Functionality
                </h4>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-medium">
                  By initializing this protocol, you acknowledge that Synapse provides AI-assisted fitness guidance. Physical activity carries inherent risks; consult with a medical professional before engaging in high-intensity synaptic training.
                </p>
              </section>

              <section>
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent mb-3">
                  <Shield size={14} />
                  03. Privacy & Security
                </h4>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed font-medium">
                  We implement industry-standard encryption to protect your synaptic nodes. You retain full ownership of your data and can request permanent deletion (factory reset) at any time through the profile interface.
                </p>
              </section>

              <div className="pt-4 border-t border-[var(--border-color)]/50">
                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest leading-loose">
                  * Continued use of the Synapse protocol constitutes dynamic acceptance of these terms.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 pt-4">
              <button
                onClick={onAccept}
                className="w-full bg-accent py-4 rounded-2xl flex items-center justify-center text-black font-black italic uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-accent/20"
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
