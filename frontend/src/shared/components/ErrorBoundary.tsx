/* Provides a minimal error boundary for route-level rendering failures.
   It surfaces errors plainly instead of hiding them behind blank UI. */
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

  public render(): ReactNode {
    if (this.state.errorMessage) {
      return <div role="alert">Something went wrong: {this.state.errorMessage}</div>;
    }

    return this.props.children;
  }
}
