import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  MapPin,
  MapPinOff,
  LocateFixed,
  RefreshCw,
  ShieldAlert,
  Settings,
} from 'lucide-react-native';
import { ABSENSI_GEOFENCE, formatDistance } from '../utils/geofence';
import type { GpsGateState } from '../hooks/useGpsGate';
import { COLORS } from '../config/theme';

type Props = {
  gps: GpsGateState;
  onCancel?: () => void;
};

/**
 * Panel pengunci layar absensi mobile.
 * Ditampilkan selama GPS belum aktif, izin lokasi belum diberikan, atau berada di luar radius RSU Avisena.
 */
export default function GpsGatePanel({ gps, onCancel }: Props) {
  const { status, errorMessage, distance, inArea } = gps;

  let icon: React.ReactNode = null;
  let iconBg = '#EFF6FF';
  let title = '';
  let message = errorMessage;
  let steps: string[] = [];

  if (status === 'checking') {
    icon = <ActivityIndicator size="large" color={COLORS.primary} />;
    iconBg = '#E0F2FE';
    title = 'Mendeteksi Lokasi GPS';
    message =
      'Mohon tunggu sebentar. Sistem sedang memverifikasi titik koordinat Anda terhadap area RSU Avisena...';
  } else if (status === 'denied') {
    icon = <ShieldAlert size={34} color={COLORS.danger} />;
    iconBg = COLORS.dangerLight;
    title = 'Izin Lokasi Ditolak';
    steps = [
      'Buka Pengaturan Aplikasi melalui tombol di bawah.',
      'Pilih menu "Izin" (Permissions) lalu pilih "Lokasi".',
      'Ubah menjadi "Izinkan saat aplikasi digunakan".',
    ];
  } else if (status === 'unavailable' || status === 'timeout') {
    icon = <MapPinOff size={34} color={COLORS.warning} />;
    iconBg = COLORS.warningLight;
    title =
      status === 'unavailable' ? 'GPS Belum Aktif' : 'Sinyal GPS Lemah';
    steps = [
      'Usap layar dari atas ke bawah untuk membuka panel kontrol perangkat.',
      'Aktifkan ikon "Lokasi" / "GPS" dengan akurasi tinggi.',
      'Kembali ke aplikasi Alice, sistem akan mendeteksi otomatis.',
    ];
  } else if (status === 'ready' && !inArea) {
    icon = <MapPin size={34} color={COLORS.danger} />;
    iconBg = COLORS.dangerLight;
    title = 'Di Luar Area Absensi';
    message = `Posisi Anda saat ini berjarak ${
      distance !== null ? formatDistance(distance) : '-'
    } dari ${ABSENSI_GEOFENCE.name}. Absensi hanya dapat dilakukan dalam radius maksimal ${formatDistance(
      ABSENSI_GEOFENCE.radiusMeters
    )}.`;
  }

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {/* Info Jarak bila di luar area */}
      {status === 'ready' && !inArea && distance !== null && (
        <View style={styles.distanceBadge}>
          <View style={styles.distanceCol}>
            <Text style={styles.distanceLabel}>JARAK ANDA SAAT INI</Text>
            <Text style={[styles.distanceValue, { color: COLORS.danger }]}>
              {formatDistance(distance)}
            </Text>
          </View>
          <View style={styles.distanceDivider} />
          <View style={styles.distanceCol}>
            <Text style={styles.distanceLabel}>BATAS RADIUS AREA</Text>
            <Text style={[styles.distanceValue, { color: COLORS.primaryDark }]}>
              {formatDistance(ABSENSI_GEOFENCE.radiusMeters)}
            </Text>
          </View>
        </View>
      )}

      {/* Panduan Langkah */}
      {steps.length > 0 && (
        <View style={styles.stepBox}>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumWrap}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tombol Aksi */}
      {status === 'denied' ? (
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.85}
          >
            <Settings size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Buka Pengaturan Izin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={gps.retry}
            activeOpacity={0.8}
          >
            <RefreshCw size={15} color={COLORS.textSecondary} />
            <Text style={styles.secondaryBtnText}>Sudah Diizinkan? Cek Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : status !== 'checking' ? (
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={gps.retry}
            activeOpacity={0.85}
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>
              {status === 'ready' && !inArea ? 'Perbarui Lokasi GPS' : 'Coba Lagi'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {onCancel && (
        <TouchableOpacity
          style={styles.cancelLink}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelLinkText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      )}

      <View style={styles.footerBadge}>
        <LocateFixed size={12} color={COLORS.textLight} />
        <Text style={styles.footerBadgeText}>
          GEOFENCE AKTIF • {ABSENSI_GEOFENCE.name.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  distanceBadge: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    alignItems: 'center',
  },
  distanceCol: {
    flex: 1,
    alignItems: 'center',
  },
  distanceDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  distanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  stepBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 20,
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actionGroup: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  cancelLink: {
    marginTop: 16,
    paddingVertical: 6,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },
  footerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textLight,
    letterSpacing: 1,
  },
});

