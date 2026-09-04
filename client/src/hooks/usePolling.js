import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for smart, battery-aware polling
 * Automatically slows down when user changes tabs (Page Visibility API)
 */
export function usePolling(fetchCallback, options = {}) {
  const {
    activeInterval = 15000,   // 15 seconds active
    backgroundInterval = 60000, // 60 seconds when tab is hidden
    enabled = true
  } = options;

  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const savedCallback = useRef(fetchCallback);
  useEffect(() => {
    savedCallback.current = fetchCallback;
  }, [fetchCallback]);

  const executeFetch = useCallback(async () => {
    if (!savedCallback.current) return;
    try {
      setIsRefreshing(true);
      await savedCallback.current();
      setLastRefreshedAt(new Date());
      setSecondsAgo(0);
    } catch (err) {
      console.warn('Polling error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Interval timer based on document visibility
  useEffect(() => {
    if (!enabled) return;

    let intervalId = null;

    const startTimer = () => {
      if (intervalId) clearInterval(intervalId);
      const delay = document.hidden ? backgroundInterval : activeInterval;
      intervalId = setInterval(() => {
        executeFetch();
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Just returned to tab - immediate refresh!
        executeFetch();
      }
      startTimer();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startTimer();

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, activeInterval, backgroundInterval, executeFetch]);

  // Tick secondsAgo every second
  useEffect(() => {
    const ticker = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date().getTime() - lastRefreshedAt.getTime()) / 1000));
      setSecondsAgo(diff);
    }, 1000);

    return () => clearInterval(ticker);
  }, [lastRefreshedAt]);

  return {
    secondsAgo,
    lastRefreshedAt,
    isRefreshing,
    refreshNow: executeFetch
  };
}
