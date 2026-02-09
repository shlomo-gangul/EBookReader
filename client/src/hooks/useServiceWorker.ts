import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // Check for updates every hour

export function useServiceWorker() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Periodically check for SW updates
      setInterval(() => {
        registration.update();
      }, UPDATE_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const applyUpdate = () => {
    updateServiceWorker(true);
  };

  const dismissUpdate = () => {
    setNeedRefresh(false);
  };

  return { needRefresh, applyUpdate, dismissUpdate };
}
