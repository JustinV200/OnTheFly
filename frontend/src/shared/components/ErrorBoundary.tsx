/* Catches route-level rendering failures and shows them instead of a blank white screen.
   The shell keys this boundary by acting account, so switching business also clears a caught error. */
import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  errorMessage: string | null;
}

/** Catches render-time errors and displays a visible fallback message. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { errorMessage: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { errorMessage: error.message };
  }

  public componentDidCatch(error: Error): void {
    console.error('A page failed to render', error);
  }

  public render(): ReactNode {
    if (this.state.errorMessage) {
      return (
        <section
          role="alert"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem 1.25rem' }}
        >
          <h3 style={{ margin: '0 0 0.5rem' }}>This page failed to render</h3>
          <p style={{ margin: 0 }}>{this.state.errorMessage}</p>
          <button onClick={() => this.setState({ errorMessage: null })} style={{ marginTop: '0.75rem' }} type="button">
            Try again
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
