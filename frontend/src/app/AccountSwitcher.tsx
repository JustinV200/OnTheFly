/* Shows which business is acting, big enough to read on a projector, and switches between them.
   Framed as "the other side of the marketplace", not an admin tool (roadmap 09, step 6). */
import { useActingAccount } from '../shared/account/ActingAccountContext';
import { demoAccounts } from '../shared/account/demoAccounts';

const PUBLIC_VISITOR_COLOR = '#334155';

/** Render the acting-business banner and one button per seeded business plus the public visitor. */
export function AccountSwitcher(): JSX.Element {
  const { account, setAccountId } = useActingAccount();
  const bannerColor = account?.color ?? PUBLIC_VISITOR_COLOR;

  return (
    <section aria-label="Acting business" style={{ backgroundColor: bannerColor, borderRadius: '12px', color: '#ffffff', padding: '0.75rem 1rem' }}>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <span
          aria-hidden="true"
          style={{
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '999px',
            color: bannerColor,
            display: 'inline-flex',
            fontSize: '1.1rem',
            fontWeight: 800,
            height: '2.6rem',
            justifyContent: 'center',
            width: '2.6rem',
          }}
        >
          {account?.initials ?? '👁'}
        </span>
        <div>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.08em', opacity: 0.85, textTransform: 'uppercase' }}>
            {account ? 'You are acting as' : 'Signed out'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.15 }}>
            {account ? account.businessName : 'Public visitor: sees only what is public'}
          </div>
        </div>
      </div>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem' }}>
        <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Every business can publish and challenge. See it as:</span>
        {demoAccounts.map((candidate) => (
          <SwitchButton
            key={candidate.id}
            isActive={candidate.id === account?.id}
            label={candidate.businessName}
            onClick={() => setAccountId(candidate.id)}
          />
        ))}
        <SwitchButton isActive={account === null} label="Public visitor" onClick={() => setAccountId(null)} />
      </div>
    </section>
  );
}

interface SwitchButtonProps {
  isActive: boolean;
  label: string;
  onClick: () => void;
}

function SwitchButton({ isActive, label, onClick }: SwitchButtonProps): JSX.Element {
  return (
    <button
      aria-pressed={isActive}
      onClick={onClick}
      style={{
        backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: '999px',
        color: isActive ? '#0f172a' : '#ffffff',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: isActive ? 700 : 500,
        padding: '0.25rem 0.7rem',
      }}
      type="button"
    >
      {label}
    </button>
  );
}
