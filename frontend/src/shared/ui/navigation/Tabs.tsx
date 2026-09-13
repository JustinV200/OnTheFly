/* Tabs for switching between views of one thing (an expense's Overview / Transactions / Signals, a listing's
   Scope / Leaderboard / Rules). ARIA tabs pattern with arrow-key movement; only the active panel renders.
   For filters that change a list (market categories), use FilterChips instead: those are not views of one thing. */
import { KeyboardEvent, ReactNode, useId, useRef, useState } from 'react';

import { joinClassNames } from '../joinClassNames';
import './Tabs.css';

export interface TabItem {
  id: string;
  label: string;
  // A small count or status beside the label, e.g. "12".
  meta?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  label: string;
  tabs: TabItem[];
  // Controlled when both are given; otherwise the component remembers the active tab itself.
  activeId?: string;
  onChange?: (id: string) => void;
  className?: string;
}

/** Render a tab list and the active tab's panel. */
export function Tabs({ label, tabs, activeId, onChange, className }: TabsProps): JSX.Element {
  const baseId = useId();
  const [ownActiveId, setOwnActiveId] = useState(tabs[0]?.id ?? '');
  const currentId = activeId ?? ownActiveId;
  const currentIndex = Math.max(0, tabs.findIndex((tab) => tab.id === currentId));
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (id: string): void => {
    setOwnActiveId(id);
    onChange?.(id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const lastIndex = tabs.length - 1;
    const moves: Record<string, number> = { ArrowRight: currentIndex + 1, ArrowLeft: currentIndex - 1, Home: 0, End: lastIndex };
    if (!(event.key in moves)) {
      return;
    }
    event.preventDefault();
    const next = (moves[event.key] + tabs.length) % tabs.length;
    select(tabs[next].id);
    buttonsRef.current[next]?.focus();
  };

  const active = tabs[currentIndex];
  return (
    <div className={joinClassNames('ui-tabs', className)}>
      <div aria-label={label} className="ui-tabs__list" onKeyDown={onKeyDown} role="tablist">
        {tabs.map((tab, index) => (
          <button
            aria-controls={`${baseId}-panel`}
            aria-selected={index === currentIndex}
            className="ui-tabs__tab"
            id={`${baseId}-tab-${tab.id}`}
            key={tab.id}
            onClick={() => select(tab.id)}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
            role="tab"
            tabIndex={index === currentIndex ? 0 : -1}
            type="button"
          >
            {tab.label}
            {tab.meta !== undefined ? <span className="ui-tabs__meta">{tab.meta}</span> : null}
          </button>
        ))}
      </div>
      {active ? (
        <div aria-labelledby={`${baseId}-tab-${active.id}`} className="ui-tabs__panel" id={`${baseId}-panel`} role="tabpanel" tabIndex={0}>
          {active.content}
        </div>
      ) : null}
    </div>
  );
}
