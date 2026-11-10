import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
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

// Cache lintas layar (agar saat pindah dari Beranda ke Kamera tidak perlu menunggu lock GPS dari awal)
let sharedLastPosition: { loc: GeoLocationResult; timestamp: number } | null =
  null;
const SHARED_CACHE_MAX_AGE_MS = 2 * 60 * 1000; // 2 menit

function getValidSharedPosition(): GeoLocationResult | null {
  if (!sharedLastPosition) return null;
  if (Date.now() - sharedLastPosition.timestamp <= SHARED_CACHE_MAX_AGE_MS) {
    return sharedLastPosition.loc;
  }
  return null;
}

function setValidSharedPosition(loc: GeoLocationResult) {
  sharedLastPosition = {
    loc,
    timestamp: Date.now(),
  };
}

// Helper timeout untuk mencegah Promise menggantung di Android
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('GPS_TIMEOUT'));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Memantau lokasi GPS perangkat secara real-time.
 * Dirancang tahan-macet untuk Android APK (indoor/outdoor) maupun iOS.
 */
export function useGpsGate(enabled: boolean = true): GpsGateState {
  const cachedInitial = getValidSharedPosition();

  const [status, setStatus] = useState<GpsStatus>(
    cachedInitial ? 'ready' : 'checking'
  );
  const [position, setPosition] = useState<GeoLocationResult | null>(
    cachedInitial
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  const positionRef = useRef<GeoLocationResult | null>(cachedInitial);
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const isRequestingPermRef = useRef<boolean>(false);

  const applyPosition = useCallback((coords: Location.LocationObjectCoords) => {
    const loc: GeoLocationResult = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
    };
    positionRef.current = loc;
    setValidSharedPosition(loc);
    setPosition(loc);
    setStatus('ready');
    setErrorMessage('');
  }, []);

  const retry = useCallback(() => {
    if (!positionRef.current) {
      setStatus('checking');
    }
    setErrorMessage('');
    setAttempt((a) => a + 1);
  }, []);

  const silentRetry = useCallback(() => {
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let checkingTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanupWatcher = () => {
      if (watchSubRef.current) {
        try {
          watchSubRef.current.remove();
        } catch {}
        watchSubRef.current = null;
      }
      if (checkingTimeoutId) {
        clearTimeout(checkingTimeoutId);
        checkingTimeoutId = null;
      }
    };

    if (!enabled) {
      cleanupWatcher();
      return;
    }

    // Jika sudah ada posisi valid di cache lintas-layar, langsung gunakan
    const cached = getValidSharedPosition();
    if (cached && !positionRef.current) {
      positionRef.current = cached;
      setPosition(cached);
      setStatus('ready');
      setErrorMessage('');
    }

    const startWatching = async () => {
      cleanupWatcher();

      // Safety timer: jika dalam 10 detik belum dapat titik sama sekali, jangan biarkan spinner menggantung selamanya
      checkingTimeoutId = setTimeout(() => {
        if (isMounted && !positionRef.current) {
          setStatus('timeout');
          setErrorMessage(
            'Sinyal GPS belum merespons. Pastikan GPS aktif dan tekan "Coba Lagi".'
          );
        }
      }, 10000);

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

        // 2. Cek / minta izin lokasi foreground
        isRequestingPermRef.current = true;
        let permResult = await Location.getForegroundPermissionsAsync();
        if (permResult.status !== 'granted') {
          permResult = await Location.requestForegroundPermissionsAsync();
        }
        isRequestingPermRef.current = false;

        if (permResult.status !== 'granted') {
          if (!isMounted) return;
          positionRef.current = null;
          setPosition(null);
          setStatus('denied');
          setErrorMessage(
            'Izin lokasi ditolak. Izinkan akses lokasi pada pengaturan aplikasi Alice untuk melakukan absensi.'
          );
          return;
        }

        // Di Android, pastikan Network Provider (Google Location Accuracy) menyala jika memungkinkan
        if (Platform.OS === 'android') {
          Location.enableNetworkProviderAsync().catch(() => {});
        }

        // 3. Ambil posisi cepat dari Last Known Position (tanpa batas 15 detik yang terlalu ketat di Android)
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 300000, // terima cache OS hingga 5 menit untuk initial lock cepat
          });
          if (lastKnown && isMounted) {
            applyPosition(lastKnown.coords);
          }
        } catch {
          // Abaikan jika gagal ambil last known
        }

        // 4. Ambil posisi aktif saat ini dengan akurasi Balanced terlebih dahulu (sangat cepat di Android indoor/Wi-Fi)
        if (!positionRef.current) {
          try {
            const currentBalanced = await withTimeout(
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }),
              5000
            );
            if (currentBalanced && isMounted) {
              applyPosition(currentBalanced.coords);
            }
          } catch {
            // Jika Balanced gagal/timeout, coba High dengan timeout 5 detik
            try {
              const currentHigh = await withTimeout(
                Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.High,
                }),
                5000
              );
              if (currentHigh && isMounted) {
                applyPosition(currentHigh.coords);
              }
            } catch {
              // Lanjut ke watchPositionAsync
            }
          }
        }

        // 5. Pantau lokasi secara berkelanjutan (distanceInterval: 0 agar tetap update meski user berdiri diam di Android)
        const sub = await Location.watchPositionAsync(
          {
            accuracy:
              Platform.OS === 'android'
                ? Location.Accuracy.Balanced
                : Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 0,
          },
          (pos) => {
            if (!isMounted) return;
            applyPosition(pos.coords);
          }
        );

        if (isMounted) {
          watchSubRef.current = sub;
        } else {
          sub.remove();
        }
      } catch (err: any) {
        isRequestingPermRef.current = false;
        if (!isMounted) return;
        if (positionRef.current) return; // Pertahankan posisi terakhir bila sudah ada

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
  }, [enabled, attempt, applyPosition]);

  // Saat user kembali ke aplikasi dari Settings HP, cek ulang otomatis (abaikan jika baru selesai dialog permission)
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          nextAppState === 'active' &&
          !positionRef.current &&
          !isRequestingPermRef.current
        ) {
          silentRetry();
        }
      }
    );
    return () => subscription.remove();
  }, [enabled, silentRetry]);

  // Jika GPS mati / timeout, cek ulang otomatis tiap 6 detik
  useEffect(() => {
    if (!enabled || (status !== 'unavailable' && status !== 'timeout')) return;
    const timer = setInterval(silentRetry, 6000);
    return () => clearInterval(timer);
  }, [enabled, status, silentRetry]);

  const getLatestPosition = useCallback(
    () => positionRef.current || getValidSharedPosition(),
    []
  );

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
