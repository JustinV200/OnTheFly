/* Catches route-level rendering failures and shows them instead of a blank white screen.
   The shell keys this boundary by acting account, so switching business also clears a caught error. */
import { Component, ReactNode } from 'react';

import { Button, Callout } from '../ui';
import './pageStates.css';

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
        <Callout
          actions={<Button onClick={() => this.setState({ errorMessage: null })} variant="primary">Try again</Button>}
          as="section"
          className="page-state"
          role="alert"
          title="This page failed to render"
          titleLevel={2}
          tone="danger"
        >
          <p>{this.state.errorMessage}</p>
        </Callout>
      );
    }

    return this.props.children;
  }
}
