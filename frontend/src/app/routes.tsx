/* Declares the route map for the current frontend phases.
   Each feature owns its page component; this file only composes them. */
import { RouteObject } from 'react-router-dom';

import { ChallengePage } from '../features/challenge/ChallengePage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { InboxPage } from '../features/inbox/InboxPage';
import { ListingDetailPage } from '../features/marketplace/ListingDetailPage';
import { MarketplacePage } from '../features/marketplace/MarketplacePage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { PublishFlow } from '../features/publish/PublishFlow';

export const routes: RouteObject[] = [
  { path: '/', element: <DashboardPage /> },
  { path: '/publish', element: <PublishFlow /> },
  { path: '/marketplace', element: <MarketplacePage /> },
  { path: '/listings/:id', element: <ListingDetailPage /> },
  { path: '/listings/:id/challenge', element: <ChallengePage /> },
  { path: '/listings/:id/inbox', element: <InboxPage /> },
  { path: '/p/:handle', element: <ProfilePage /> },
];
