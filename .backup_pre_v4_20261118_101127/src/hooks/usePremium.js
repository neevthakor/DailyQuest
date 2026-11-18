import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMyEntitlement, entitlementService } from '../services/entitlementService';

/**
 * Hook for reading Premium status in components. Always backed by the
 * server (via get_my_entitlement RPC) — never by a locally stored flag.
 *
 * Usage:
 *   const { isPremium, loading, refresh } = usePremium();
 */
export function usePremium() {
  const { isAuthenticated, user } = useAuth();
  const [entitlement, setEntitlement] = useState(entitlementService.DEFAULT_ENTITLEMENT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setEntitlement(entitlementService.DEFAULT_ENTITLEMENT);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchMyEntitlement();
      setEntitlement(next);
    } catch {
      setEntitlement(entitlementService.DEFAULT_ENTITLEMENT);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh, user?.id]);

  return {
    ...entitlement,
    loading,
    refresh,
  };
}
