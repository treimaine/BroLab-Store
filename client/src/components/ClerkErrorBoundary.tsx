import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ClerkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Clerk Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--deep-black)] flex items-center justify-center">
          <div className="max-w-md w-full mx-auto text-center p-8">
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-red-200 mb-4">
                Erreur d'authentification
              </h2>
              <p className="text-red-200 mb-4">
                Une erreur s'est produite avec le système d'authentification Clerk.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Recharger la page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}