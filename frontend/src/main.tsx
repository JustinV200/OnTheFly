/* Boots the React application into the Vite HTML shell.
   Routing and feature composition live in app-level modules instead.
   The design system's global styles load here, once, in cascade order: tokens and both themes, then element defaults, then utilities. */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Global styles come before App on purpose: Vite injects CSS in import order, so component styles land after the base.
import './shared/ui/styles/tokens.css';
import './shared/ui/styles/themes/light.css';
import './shared/ui/styles/themes/dark.css';
import './shared/ui/styles/base.css';
import './shared/ui/styles/utilities.css';
import { App } from './app/App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
