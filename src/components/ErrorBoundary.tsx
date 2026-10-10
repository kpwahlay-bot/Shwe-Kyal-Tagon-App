import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Shwe Kyal Tagon POS - Uncaught runtime error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocalState = () => {
    // Clear only transient view state if any, keeping core business data intact
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-500/30">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">
              System Display Interrupted
            </h1>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              An unexpected display issue occurred. Your data is secure and undamaged. Click below to reload the application.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleResetLocalState}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer border border-slate-600"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-slate-950/60 rounded-xl p-3 border border-slate-700/60 text-[11px] font-mono text-slate-400 overflow-hidden">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Technical Diagnostic Info</span>
                </summary>
                <div className="mt-2 text-rose-400 break-words whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </div>
              </details>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700/60 text-[11px] text-slate-400">
              Shwe Kyal Tagon Co., Ltd. • IT Enterprise POS
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
