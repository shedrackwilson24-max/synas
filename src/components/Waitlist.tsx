import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, Star, Zap, Globe, Github, Twitter, MessageCircle, Loader2, Activity } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNotifications } from '../contexts/NotificationContext';

export default function Waitlist() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotifications();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'waitlist'), {
                email,
                timestamp: serverTimestamp(),
                source: 'dashboard_waitlist'
            });
            addNotification('success', 'Waitlist Integrated', 'You have been added to the elite recruitment queue.');
            setEmail('');
        } catch (err) {
            addNotification('reminder', 'Sync Error', 'Failed to register with the waitlist infrastructure.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="neural-gradient rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-brand-primary/20 group">
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Star className="text-brand-cyan drop-shadow-glow" size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight font-display uppercase">Synapse Genesis</h3>
                        <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.3em] font-display">Recruitment Protocol active</p>
                    </div>
                </div>

                <p className="text-sm text-white/80 leading-relaxed font-medium mb-10 max-w-sm font-display italic">
                    "Register for early access to our proprietary neural hydration and hormonal calibration engine. Systematic deployment in progress."
                </p>

                <form onSubmit={handleSubmit} className="flex gap-3">
                    <input 
                        type="email"
                        required
                        placeholder="Neural Identity (Email)"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-5 text-sm font-bold text-white placeholder:text-white/30 focus:bg-white/20 focus:border-brand-cyan/50 outline-none transition-all font-display"
                    />
                    <button 
                        disabled={loading}
                        className="px-6 bg-white text-brand-primary rounded-2xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-black/20 flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </form>

                <div className="flex items-center gap-8 mt-12">
                    <SocialLink href="https://x.com/synapseneuro_ai" icon={<Twitter size={14} />} label="Intelligence Hub" />
                    <SocialLink href="https://telegram.org" icon={<MessageCircle size={14} />} label="Encryption Channel" />
                    <SocialLink href="https://docs.google.com/forms/d/e/1FAIpQLSfsVYblctRCn8DB9brbl5aaSVgNMi1TmNTlqmkbRtkjD0vAIw/viewform" icon={<Zap size={14} />} label="Hive Feedback" />
                </div>
            </div>

            <Activity className="absolute -bottom-20 -right-20 text-white/5 rotate-12 scale-[3] pointer-events-none" />
            <Zap className="absolute -top-10 -left-10 text-brand-cyan/10 -rotate-12 scale-[1.5] pointer-events-none" />
        </section>
    );
}

function SocialLink({ icon, label, href }: { icon: React.ReactNode, label: string, href: string }) {
    return (
        <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all font-display"
        >
            <span className="text-brand-cyan/50 group-hover:text-brand-cyan transition-colors">{icon}</span>
            {label}
        </a>
    );
}
