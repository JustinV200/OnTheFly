/* A panel that slides in from the right on desktop and fills the screen on a phone, for detail that belongs to a row
   (an expense's transactions, an offer's evidence) without sending the viewer off the list they were scanning.
   Escape, the close button, and the backdrop close it; focus moves in on open and returns to the trigger on close. */
import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from '../icons/Icon';
import './Drawer.css';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  // One line under the title: the row's key figure or state.
  description?: ReactNode;
  // Sticky actions at the bottom (e.g. "Publish…", "Unpublish").
  footer?: ReactNode;
  children: ReactNode;
  width?: 'md' | 'lg';
}

/** Render the drawer into document.body while open. */
export function Drawer({ isOpen, onClose, title, description, footer, children, width = 'md' }: DrawerProps): JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    // The page behind stays put while the drawer scrolls on its own.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }
  return createPortal(
    <div className="ui-drawer">
      <div aria-hidden="true" className="ui-drawer__backdrop" onClick={onClose} />
      <div aria-labelledby={titleId} aria-modal="true" className={`ui-drawer__panel ui-drawer__panel--${width}`} ref={panelRef} role="dialog" tabIndex={-1}>
        <header className="ui-drawer__header">
          <div className="ui-drawer__heading">
            <h2 className="ui-drawer__title" id={titleId}>{title}</h2>
            {description ? <div className="ui-drawer__description">{description}</div> : null}
          </div>
          <button aria-label="Close" className="ui-drawer__close" onClick={onClose} type="button">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="ui-drawer__body">{children}</div>
        {footer ? <footer className="ui-drawer__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
