import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled render error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem('civicfix-report-draft');
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-lg rounded-3xl border border-red-200 bg-white p-6 shadow-xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-600">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" /> Reset & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
