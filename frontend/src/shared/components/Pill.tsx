/* Renders a small rounded label in one of a fixed set of tones.
   Tones carry meaning app-wide (e.g. "simulated" is always amber), so they're named by meaning, not colour. */
import type { ReactNode } from 'react';

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'simulated' | 'private';

const TONE_STYLES: Record<PillTone, { background: string; color: string; border: string }> = {
  neutral: { background: '#f1f5f9', color: '#334155', border: '#cbd5e1' },
  info: { background: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  success: { background: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  warning: { background: '#fffbeb', color: '#92400e', border: '#fde68a' },
  danger: { background: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  simulated: { background: '#fff7ed', color: '#9a3412', border: '#fdba74' },
  private: { background: '#f8fafc', color: '#0f172a', border: '#94a3b8' },
};

interface PillProps {
  tone: PillTone;
  children: ReactNode;
  // Longer explanation on hover, for labels that compress a rule into a word or two.
  title?: string;
}

/** Render an inline pill label. */
export function Pill({ tone, children, title }: PillProps): JSX.Element {
  const toneStyle = TONE_STYLES[tone];
  return (
    <span
      title={title}
      style={{
        backgroundColor: toneStyle.background,
        border: `1px solid ${toneStyle.border}`,
        borderRadius: '999px',
        color: toneStyle.color,
        display: 'inline-block',
        fontSize: '0.8rem',
        fontWeight: 600,
        lineHeight: 1.4,
        padding: '0.1rem 0.55rem',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
