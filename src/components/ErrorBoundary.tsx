import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Neural Link Failure</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest max-w-xs mb-8">
            The synapse connection encountered a critical variance. System fallback initiated.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-accent text-black font-black uppercase italic tracking-widest rounded-xl hover:scale-105 transition-transform"
          >
            Reboot System
          </button>
          {this.state.error && (
            <pre className="mt-8 text-[8px] text-gray-800 font-mono text-left max-w-md overflow-auto p-4 bg-black/50 rounded-lg">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
