import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import {
  ABSENSI_GEOFENCE,
  getDistanceFromGeofence,
  formatDistance,
  type GeoLocationResult,
} from '../utils/geofence';

// Status GPS untuk "gerbang" halaman absensi mobile
export type GpsStatus =
  | 'checking'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'timeout';

export type GpsGateState = {
  status: GpsStatus;
  position: GeoLocationResult | null;
  errorMessage: string;
  distance: number | null; // jarak ke titik RSU Avisena (meter)
  formattedDistance: string;
  inArea: boolean;
  isReady: boolean; // GPS aktif & koordinat berhasil didapat
  retry: () => void;
  getLatestPosition: () => GeoLocationResult | null;
};

/**
 * Memantau lokasi GPS perangkat secara real-time (watchPositionAsync).
 * Memastikan GPS aktif, izin diberikan, dan jarak ke RSU Avisena dihitung dengan Haversine.
 */
export function useGpsGate(enabled: boolean = true): GpsGateState {
  const [status, setStatus] = useState<GpsStatus>('checking');
  const [position, setPosition] = useState<GeoLocationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  const positionRef = useRef<GeoLocationResult | null>(null);
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);

  const retry = useCallback(() => {
    setStatus('checking');
    setErrorMessage('');
    setAttempt((a) => a + 1);
  }, []);

  const silentRetry = useCallback(() => {
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const cleanupWatcher = () => {
      if (watchSubRef.current) {
        watchSubRef.current.remove();
        watchSubRef.current = null;
      }
    };

    if (!enabled) {
      cleanupWatcher();
      positionRef.current = null;
      setPosition(null);
      setStatus('checking');
      setErrorMessage('');
      return;
    }

    const startWatching = async () => {
      cleanupWatcher();

      try {
        // 1. Cek apakah layanan lokasi perangkat (GPS) aktif
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (!isMounted) return;
          positionRef.current = null;
          setPosition(null);
          setStatus('unavailable');
          setErrorMessage(
            'Layanan lokasi (GPS) perangkat Anda belum aktif. Nyalakan GPS terlebih dahulu untuk melakukan absensi.'
          );
          return;
        }

        // 2. Minta izin lokasi foreground
        const { status: permStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (permStatus !== 'granted') {
          if (!isMounted) return;
          positionRef.current = null;
          setPosition(null);
          setStatus('denied');
          setErrorMessage(
            'Izin lokasi ditolak. Izinkan akses lokasi pada pengaturan aplikasi Alice untuk melakukan absensi.'
          );
          return;
        }

        // 3. Ambil posisi cepat awal jika ada last known atau current position
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 15000,
          });
          if (lastKnown && isMounted && !positionRef.current) {
            const initialLoc: GeoLocationResult = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
              accuracy: lastKnown.coords.accuracy,
            };
            positionRef.current = initialLoc;
            setPosition(initialLoc);
            setStatus('ready');
            setErrorMessage('');
          }
        } catch {
          // Abaikan jika gagal ambil last known
        }

        // 4. Pantau lokasi secara berkelanjutan
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (pos) => {
            if (!isMounted) return;
            const loc: GeoLocationResult = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            };
            positionRef.current = loc;
            setPosition(loc);
            setStatus('ready');
            setErrorMessage('');
          }
        );

        if (isMounted) {
          watchSubRef.current = sub;
        } else {
          sub.remove();
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (positionRef.current) return; // Pertahankan posisi terakhir bila hanya gangguan sesaat

        positionRef.current = null;
        setPosition(null);
        setStatus('timeout');
        setErrorMessage(
          'Sinyal GPS belum didapat. Pastikan GPS aktif dan berada di area dengan sinyal baik.'
        );
      }
    };

    startWatching();

    return () => {
      isMounted = false;
      cleanupWatcher();
    };
  }, [enabled, attempt]);

  // Saat user kembali ke aplikasi dari Settings HP, cek ulang otomatis
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && !positionRef.current) {
          silentRetry();
        }
      }
    );
    return () => subscription.remove();
  }, [enabled, silentRetry]);

  // Jika GPS mati / timeout, cek ulang otomatis tiap 5 detik
  useEffect(() => {
    if (!enabled || (status !== 'unavailable' && status !== 'timeout')) return;
    const timer = setInterval(silentRetry, 5000);
    return () => clearInterval(timer);
  }, [enabled, status, silentRetry]);

  const getLatestPosition = useCallback(() => positionRef.current, []);

  const distance = position
    ? getDistanceFromGeofence(position.latitude, position.longitude)
    : null;
  const formattedDistance = distance !== null ? formatDistance(distance) : '-';
  const inArea =
    distance !== null && distance <= ABSENSI_GEOFENCE.radiusMeters;

  return {
    status,
    position,
    errorMessage,
    distance,
    formattedDistance,
    inArea,
    isReady: status === 'ready' && !!position,
    retry,
    getLatestPosition,
  };
}

