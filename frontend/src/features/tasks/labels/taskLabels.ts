/* Words for a task's origin, state and the viewer's relationship to it, so every screen says them the same way.
   Unknown values are shown as stored rather than hidden. */
import type { BadgeTone } from '../../../shared/ui';

interface Label {
  text: string;
  tone: BadgeTone;
  explanation: string;
}

// Explanations read the same for every viewer (poster, owner, client), since the header shows them under the title.
const ORIGINS: Record<string, Label> = {
  rebid: { text: 'REBID', tone: 'neutral', explanation: 'Work its poster already pays for, put up for new bids.' },
  new: { text: 'New work', tone: 'neutral', explanation: 'New work with no current vendor.' },
  split: { text: 'Piece', tone: 'neutral', explanation: 'A piece split off a larger task by that task’s owner.' },
};

const STATES: Record<string, Label> = {
  private: { text: 'Private', tone: 'private', explanation: 'Nobody else can see it.' },
  scope_confirmed: { text: 'Scope confirmed', tone: 'private', explanation: 'Ready to preview and publish; still private.' },
  public: { text: 'Public', tone: 'success', explanation: 'On the market board, taking offers.' },
  closed: { text: 'Closed', tone: 'neutral', explanation: 'No longer taking offers.' },
  shortlisted: { text: 'Shortlisted', tone: 'info', explanation: 'Bidding closed while offers are reviewed.' },
  accepted: { text: 'Accepted', tone: 'info', explanation: 'An offer was accepted; its bidder owns the task.' },
};

const RELATIONSHIPS: Record<string, Label> = {
  poster_and_owner: { text: 'You posted and own this', tone: 'brand', explanation: 'No offer is accepted yet, so it is still yours.' },
  poster: { text: 'You’re the client', tone: 'info', explanation: 'You accepted an offer; that bidder owns the work now.' },
  owner: { text: 'You own this', tone: 'brand', explanation: 'You won it through an accepted offer, so only you can split it.' },
};

/** Return the label for a task origin. */
export function originLabel(origin: string): Label {
  return ORIGINS[origin] ?? { text: origin, tone: 'neutral', explanation: '' };
}

/** Return the label for a task state. */
export function stateLabel(state: string): Label {
  return STATES[state] ?? { text: state.replace(/_/g, ' '), tone: 'neutral', explanation: '' };
}

/** Return the label for the viewer's relationship to a task. */
export function relationshipLabel(relationship: string): Label {
  return RELATIONSHIPS[relationship] ?? { text: relationship, tone: 'neutral', explanation: '' };
}
