/* Applies a ?as=<account_id> link on in-app navigation and removes the parameter from the address bar (replacing the
   history entry), so a copied URL or a refresh never re-applies an old switch. The provider has already applied a link
   in the opening URL before the first render; this hook then only strips it. An unknown value is left in place and
   changes nothing, so a mistyped link stays visible instead of silently vanishing. */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ACCOUNT_LINK_PARAM, readAccountLink } from '../../shared/account/accountLink';
import { useActingAccount } from '../../shared/account/ActingAccountContext';

/** Watch the URL for an account link; call once, from the app shell. */
export function useAccountLink(): void {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAccountId } = useActingAccount();

  useEffect(() => {
    const linkedId = readAccountLink(location.search);
    if (linkedId === undefined) {
      return;
    }
    // A no-op when the provider already applied this link on load; a real switch when a link was followed in-app.
    setAccountId(linkedId);

    const params = new URLSearchParams(location.search);
    params.delete(ACCOUNT_LINK_PARAM);
    const remaining = params.toString();
    navigate(
      { pathname: location.pathname, search: remaining ? `?${remaining}` : '', hash: location.hash },
      { replace: true, state: location.state },
    );
  }, [location.hash, location.pathname, location.search, location.state, navigate, setAccountId]);
}
