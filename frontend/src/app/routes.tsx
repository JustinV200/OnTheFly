/* Declares the route map for the frontend.
   Each feature owns its page component; this file only composes them. */
import { RouteObject } from 'react-router-dom';

import { ChallengePage } from '../features/challenge/ChallengePage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { InboxPage } from '../features/inbox/InboxPage';
import { InvitePage } from '../features/invitations/InvitePage';
import { OptOutPage } from '../features/invitations/optout/OptOutPage';
import { MyListingsPage } from '../features/listings/MyListingsPage';
import { ListingDetailPage } from '../features/marketplace/ListingDetailPage';
import { MarketplacePage } from '../features/marketplace/MarketplacePage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { PublishFlow } from '../features/publish/PublishFlow';
import { TracePage } from '../features/trace/TracePage';
import { NotFoundPage } from './shell/NotFoundPage';

export const routes: RouteObject[] = [
  { path: '/', element: <DashboardPage /> },
  { path: '/publish', element: <PublishFlow /> },
  { path: '/my-listings', element: <MyListingsPage /> },
  { path: '/marketplace', element: <MarketplacePage /> },
  { path: '/listings/:id', element: <ListingDetailPage /> },
  { path: '/listings/:id/challenge', element: <ChallengePage /> },
  { path: '/listings/:id/inbox', element: <InboxPage /> },
  { path: '/listings/:id/invite', element: <InvitePage /> },
  // Public, no account: the link in every invitation footer (roadmap 08, compliance).
  { path: '/opt-out/:token', element: <OptOutPage /> },
  { path: '/offers/:challengeId/trace', element: <TracePage /> },
  { path: '/p/:handle', element: <ProfilePage /> },
  // An unknown URL gets a page that says so, not an empty shell.
  { path: '*', element: <NotFoundPage /> },
];
