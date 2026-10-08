'use client';
import { useEffect, useRef, useState } from 'react';
import type { GeoSample } from '@/engine/geo';

export type GeoStatus = 'off' | 'locating' | 'tracking' | 'denied' | 'unavailable';

/**
 * Watches the device position while `enabled`. Samples are handed to `onSample`; the caller decides
 * whether to use them (for example, ignoring them while paused). Chrome must stay in the foreground for this to work.
 */
export function useGeolocation(enabled: boolean, onSample: (s: GeoSample) => void): GeoStatus {
  const [status, setStatus] = useState<GeoStatus>('off');
  const cb = useRef(onSample);
  useEffect(() => {
    cb.current = onSample;
  }, [onSample]);

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setStatus('tracking');
        cb.current({ lat: p.coords.latitude, lng: p.coords.longitude, t: p.timestamp, acc: p.coords.accuracy });
      },
      (e) => setStatus(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return status;
}
