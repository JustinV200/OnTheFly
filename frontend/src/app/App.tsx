/* Defines the top-level app: the account provider, the shell, and the feature routes inside it. */
import type { ReactElement } from 'react';
import { useRoutes } from 'react-router-dom';

import { ActingAccountProvider } from '../shared/account/ActingAccountContext';
import { routes } from './routes';
import { AppShell } from './shell/AppShell';

/** Renders every route inside the shared shell. */
export function App(): ReactElement {
  const element = useRoutes([
    {
      element: <AppShell />,
      children: routes,
    },
  ]);

  return <ActingAccountProvider>{element}</ActingAccountProvider>;
}
