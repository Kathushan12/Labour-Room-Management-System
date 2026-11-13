import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 border border-red-200">
            <h2 className="text-xl font-bold text-red-700 mb-2">Application Error</h2>
            <p className="text-sm text-slate-600 mb-4">
              An unexpected error occurred in the clinical application interface.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-slate-50 p-3 rounded border text-slate-800 overflow-x-auto mb-4">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-2 px-4 rounded text-sm transition"
            >
              Reload Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
