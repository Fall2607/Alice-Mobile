// Konfigurasi Geofence (Pembatasan Area) Absensi
// Titik pusat: Rumah Sakit Umum Avisena (sumber: Google Maps place pin / Alice Web)
export const ABSENSI_GEOFENCE = {
  name: 'RSU Avisena',
  latitude: -6.9217924,
  longitude: 107.5558192,
  radiusMeters: 2000, // 2 km
};

export type GeoLocationResult = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

// Jarak antara dua koordinat (meter) menggunakan rumus Haversine
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // radius bumi (meter)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getDistanceFromGeofence(latitude: number, longitude: number): number {
  return haversineDistanceMeters(
    latitude,
    longitude,
    ABSENSI_GEOFENCE.latitude,
    ABSENSI_GEOFENCE.longitude
  );
}

export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${Math.round(meters)} m`;
}

export function isWithinGeofence(latitude: number, longitude: number): {
  inArea: boolean;
  distance: number;
  formattedDistance: string;
} {
  const distance = getDistanceFromGeofence(latitude, longitude);
  return {
    inArea: distance <= ABSENSI_GEOFENCE.radiusMeters,
    distance,
    formattedDistance: formatDistance(distance),
  };
}

