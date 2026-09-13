/* Carries a notice across navigation onto the task page: an acceptance made in the Offers drawer lands here, so the
   ownership-moved banner shows where the owner sees its effect. The route state is cleared once read, so a reload or
   the back button doesn't replay a banner for an action that already happened. */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { TaskNotice } from './taskNotice';

// Route state other pages pass when they navigate here after acting on the task.
export interface TaskArrivalState {
  acceptedBidderName?: string;
}

/** Return the notice the previous page handed over, or null; consumes the route state so it shows once. */
export function useArrivalNotice(): TaskNotice | null {
  const location = useLocation();
  const navigate = useNavigate();
  const [notice] = useState<TaskNotice | null>(() => {
    const state = location.state as TaskArrivalState | null;
    return state?.acceptedBidderName ? { kind: 'accepted', bidderName: state.acceptedBidderName } : null;
  });

  useEffect(() => {
    if (location.state) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
    // Once, on arrival: later navigations belong to the page, not to the hand-over.
  }, []);

  return notice;
}
