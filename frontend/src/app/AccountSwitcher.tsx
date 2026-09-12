/* Shows the visible acting account switcher used for the demo.
   It persists only the selected seeded account id in local storage. */
import { useMemo, useState } from 'react';

const STORAGE_KEY = 'actingAccountId';

const accounts = [
  { id: 'acc_owner_1', businessName: 'Apex Facilities Group' },
  { id: 'acc_challenger_1', businessName: 'Bay Clean Professional Services' },
  { id: 'acc_challenger_2', businessName: 'Golden Gate Janitorial' },
  { id: 'acc_challenger_3', businessName: 'Summit Building Services' },
];

/** Returns the persisted acting account id or the default owner account. */
export function getStoredActingAccountId(): string {
  return window.localStorage.getItem(STORAGE_KEY) ?? accounts[0].id;
}

/** Renders the seeded-account selector used by the API client header. */
export function AccountSwitcher(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string>(getStoredActingAccountId());
  const selectedLabel = useMemo(() => {
    return accounts.find((account) => account.id === selectedId)?.businessName ?? accounts[0].businessName;
  }, [selectedId]);

  return (
    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem', gap: '0.25rem' }}>
      <span>Viewing as: {selectedLabel}</span>
      <select
        onChange={(event) => {
          const nextId = event.target.value;
          window.localStorage.setItem(STORAGE_KEY, nextId);
          setSelectedId(nextId);
        }}
        value={selectedId}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.businessName}
          </option>
        ))}
      </select>
    </label>
  );
}
