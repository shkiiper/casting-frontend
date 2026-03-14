import { useEffect } from 'react';
import { useSubscriptionStore, startPolling, stopPolling } from '@/entities/subscription/model/subscriptionStore';

export function useSubscriptionPolling() {
  useEffect(() => {
    let localMounted = 0;  // ← ЛОКАЛЬНАЯ переменная в closure
    localMounted++;
    startPolling();

    return () => {
      localMounted--;
      if (localMounted === 0) stopPolling();
    };
  }, []);
}

export function useSubscriptionInfo() {
  const store = useSubscriptionStore();
  return {
    info: store.info,
    loading: store.loading,
    error: store.error,
    refresh: store.refresh,
  };
}
