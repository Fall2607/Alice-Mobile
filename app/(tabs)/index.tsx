import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  LogIn,
  LogOut as LogOutIcon,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  User as UserIcon,
} from 'lucide-react-native';
import { authService } from '../../src/services/authService';
import { attendanceService } from '../../src/services/attendanceService';
import { useGpsGate } from '../../src/hooks/useGpsGate';
import { ABSENSI_GEOFENCE, formatDistance } from '../../src/utils/geofence';
import { COLORS } from '../../src/config/theme';

export default function Home() {
  const router = useRouter();
  const { newAbsenType, newAbsenTime, existingMasuk } = useLocalSearchParams();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  const [time, setTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(!(newAbsenType && newAbsenTime));
  const [isHomeFocused, setIsHomeFocused] = useState(true);

  const gps = useGpsGate(isHomeFocused);

  const [todayStatus, setTodayStatus] = useState<{
    jamMasuk: string | null;
    jamKeluar: string | null;
    menitTerlambat: number;
  }>({
    jamMasuk:
      newAbsenType === 'in'
        ? (newAbsenTime as string)
        : (existingMasuk as string) || null,
    jamKeluar: newAbsenType === 'out' ? (newAbsenTime as string) : null,
    menitTerlambat: 0,
  });

  const [todayShift, setTodayShift] = useState<{
    nama: string;
    masuk: string;
    keluar: string;
  } | null>(null);

  const [monthStats, setMonthStats] = useState({
    hadir: 0,
    terlambat: 0,
    score: 0,
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsHomeFocused(true);
      loadData();
      return () => {
        setIsHomeFocused(false);
      };
    }, [newAbsenType, newAbsenTime])
  );

  const loadData = async () => {
    try {
      const user = await authService.getUser();
      if (user) {
        setUserName(user.name || user.nama || 'Karyawan');
        setUserRole(user.jabatan || user.role || 'Staf RSU Avisena');
        await fetchAttendanceStatus(user.karyawan_id || user.id);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStatus = async (kId: string) => {
    try {
      if (!kId) return;

      const now = new Date();
      const monthNum = now.getMonth() + 1;
      const yearNum = now.getFullYear();
      const monthStr = String(monthNum).padStart(2, '0');
      const monthYear = `${yearNum}-${monthStr}`;

      const [history, scheduleData] = await Promise.all([
        attendanceService.getAbsensiHistory(kId, monthNum, yearNum),
        attendanceService
          .getKaryawanSchedule(kId, monthYear)
          .catch(() => ({ schedule: [] })),
      ]);

      const todayStr = now.toISOString().split('T')[0];

      // Set shift info hari ini
      const todaySched = scheduleData.schedule?.find(
        (s: any) => s.date === todayStr
      );
      if (todaySched && todaySched.shift && todaySched.shift.jam_masuk) {
        setTodayShift({
          nama: todaySched.shift.nama_shift || 'Shift Reguler',
          masuk: todaySched.shift.jam_masuk.substring(0, 5),
          keluar: todaySched.shift.jam_keluar.substring(0, 5),
        });
      } else {
        setTodayShift(null);
      }

      // Hitung statistik bulan ini
      let hadirCount = 0;
      let terlambatCount = 0;
      if (Array.isArray(history)) {
        history.forEach((item: any) => {
          hadirCount++;
          if (item.menit_terlambat && item.menit_terlambat > 0) {
            terlambatCount++;
          }
        });
        setRecentLogs(history.slice(0, 4));
      }

      const scorePercent =
        hadirCount === 0
          ? 0
          : Math.round(((hadirCount - terlambatCount) / hadirCount) * 100);
      setMonthStats({
        hadir: hadirCount,
        terlambat: terlambatCount,
        score: scorePercent,
      });

      // Cari absensi aktif (hari ini atau shift malam kemarin yang belum checkout)
      let absensiAktif = null;
      if (Array.isArray(history) && history.length > 0) {
        const lastRecord = history[0];
        const recordDate = new Date(lastRecord.tanggal)
          .toISOString()
          .split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (recordDate === todayStr) {
          absensiAktif = lastRecord;
        } else if (
          recordDate === yesterdayStr &&
          lastRecord.jam_keluar === null
        ) {
          absensiAktif = lastRecord;
        }
      }

      if (absensiAktif) {
        setTodayStatus({
          jamMasuk: absensiAktif.jam_masuk || null,
          jamKeluar: absensiAktif.jam_keluar || null,
          menitTerlambat: absensiAktif.menit_terlambat || 0,
        });
      } else {
        setTodayStatus({ jamMasuk: null, jamKeluar: null, menitTerlambat: 0 });
      }
    } catch (error) {
      console.log('Gagal ambil status absensi', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    gps.retry();
    await loadData();
    setRefreshing(false);
  };

  const goToCamera = (type: 'in' | 'out') => {
    router.push({
      pathname: '/camera',
      params: { type, existingMasuk: todayStatus.jamMasuk },
    });
  };

  const formatTime = (date: Date) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const extractTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    try {
      const normalized = timeStr.replace('.', ':');
      if (normalized.includes('T')) {
        return normalized.substring(11, 16);
      }
      if (normalized.includes(' ')) {
        const part = normalized.split(' ')[1];
        return part ? part.substring(0, 5) : normalized.substring(0, 5);
      }
      if (normalized.includes(':')) {
        return normalized.substring(0, 5);
      }
      return normalized;
    } catch {
      return '--:--';
    }
  };

  const canCheckIn = !todayStatus.jamMasuk;
  const canCheckOut = !!todayStatus.jamMasuk && !todayStatus.jamKeluar;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
        />
      }
    >
      {/* Top Hero Header (Hospital Navy) */}
      <View style={styles.heroHeader}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandLabel}>ALICE HRIS • RSU AVISENA</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.navigate('/profile')}
            activeOpacity={0.8}
          >
            <UserIcon size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.greetingWrap}>
          <Text style={styles.greetingSub}>Selamat bertugas,</Text>
          <Text style={styles.greetingName} numberOfLines={1}>
            {userName || 'Memuat Profil...'}
          </Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{userRole}</Text>
          </View>
        </View>

        {/* Live Geofence Status Banner */}
        <View
          style={[
            styles.geofenceBanner,
            gps.isReady && gps.inArea
              ? styles.geofenceIn
              : gps.status === 'checking'
              ? styles.geofenceChecking
              : styles.geofenceOut,
          ]}
        >
          <View style={styles.geofenceLeft}>
            <MapPin
              size={16}
              color={
                gps.isReady && gps.inArea
                  ? '#34D399'
                  : gps.status === 'checking'
                  ? '#93C5FD'
                  : '#FDA4AF'
              }
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.geofenceTitle}>
                {gps.status === 'checking'
                  ? 'Mendeteksi Area Presensi...'
                  : gps.isReady && gps.inArea
                  ? `Dalam Area ${ABSENSI_GEOFENCE.name}`
                  : gps.status === 'ready' && !gps.inArea
                  ? `Di Luar Radius Area (${gps.formattedDistance})`
                  : 'Layanan Lokasi (GPS) Belum Aktif'}
              </Text>
              <Text style={styles.geofenceSub}>
                {gps.isReady && gps.inArea
                  ? `Jarak ${gps.formattedDistance} dari titik pusat (Maks. ${formatDistance(
                      ABSENSI_GEOFENCE.radiusMeters
                    )})`
                  : `Radius wajib maksimal ${formatDistance(
                      ABSENSI_GEOFENCE.radiusMeters
                    )} dari ${ABSENSI_GEOFENCE.name}`}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={gps.retry}
            style={styles.geofenceRefreshBtn}
            activeOpacity={0.7}
          >
            <RefreshCw size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Body */}
      <View style={styles.bodyContainer}>
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Menyelaraskan Data Presensi...</Text>
          </View>
        ) : (
          <>
            {/* Clock & Primary CTA Card */}
            <View style={styles.clockCard}>
              <View style={styles.clockHeader}>
                <View>
                  <Text style={styles.dateText}>{formatDate(time)}</Text>
                  <View style={styles.digitalClockRow}>
                    <Text style={styles.digitalClock}>{formatTime(time)}</Text>
                    <Text style={styles.wibBadge}>WIB</Text>
                  </View>
                </View>
                <View style={styles.shiftBadge}>
                  <Clock size={13} color={COLORS.primary} />
                  <Text style={styles.shiftBadgeText}>
                    {todayShift
                      ? `${todayShift.masuk} - ${todayShift.keluar}`
                      : 'Shift Reguler'}
                  </Text>
                </View>
              </View>

              {/* Check-In & Check-Out Buttons */}
              <View style={styles.ctaRow}>
                <TouchableOpacity
                  style={[
                    styles.ctaBtn,
                    canCheckIn ? styles.ctaBtnCheckIn : styles.ctaBtnDisabled,
                  ]}
                  onPress={() => goToCamera('in')}
                  disabled={!canCheckIn}
                  activeOpacity={0.85}
                >
                  <LogIn
                    size={18}
                    color={canCheckIn ? '#FFFFFF' : COLORS.textLight}
                  />
                  <Text
                    style={[
                      styles.ctaBtnText,
                      !canCheckIn && styles.ctaBtnTextDisabled,
                    ]}
                  >
                    Absen Masuk
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.ctaBtn,
                    canCheckOut ? styles.ctaBtnCheckOut : styles.ctaBtnDisabled,
                  ]}
                  onPress={() => goToCamera('out')}
                  disabled={!canCheckOut}
                  activeOpacity={0.85}
                >
                  <LogOutIcon
                    size={18}
                    color={canCheckOut ? '#FFFFFF' : COLORS.textLight}
                  />
                  <Text
                    style={[
                      styles.ctaBtnText,
                      !canCheckOut && styles.ctaBtnTextDisabled,
                    ]}
                  >
                    Absen Pulang
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status Hari Ini */}
              <View style={styles.todayStatusGrid}>
                <View style={styles.todayStatusBox}>
                  <Text style={styles.todayStatusLabel}>JAM MASUK</Text>
                  <View style={styles.todayStatusValueRow}>
                    {todayStatus.jamMasuk ? (
                      <CheckCircle2
                        size={16}
                        color={
                          todayStatus.menitTerlambat > 0
                            ? COLORS.warning
                            : COLORS.success
                        }
                      />
                    ) : (
                      <Clock size={16} color={COLORS.textLight} />
                    )}
                    <Text
                      style={[
                        styles.todayStatusTime,
                        !todayStatus.jamMasuk && styles.todayStatusEmpty,
                      ]}
                    >
                      {extractTime(todayStatus.jamMasuk)}
                    </Text>
                  </View>
                  {todayStatus.menitTerlambat > 0 && (
                    <Text style={styles.lateTag}>
                      Terlambat {todayStatus.menitTerlambat} menit
                    </Text>
                  )}
                </View>

                <View style={styles.statusVerticalDivider} />

                <View style={styles.todayStatusBox}>
                  <Text style={styles.todayStatusLabel}>JAM PULANG</Text>
                  <View style={styles.todayStatusValueRow}>
                    {todayStatus.jamKeluar ? (
                      <CheckCircle2 size={16} color={COLORS.primary} />
                    ) : (
                      <Clock size={16} color={COLORS.textLight} />
                    )}
                    <Text
                      style={[
                        styles.todayStatusTime,
                        !todayStatus.jamKeluar && styles.todayStatusEmpty,
                      ]}
                    >
                      {extractTime(todayStatus.jamKeluar)}
                    </Text>
                  </View>
                  {todayStatus.jamKeluar && (
                    <Text style={styles.doneTag}>Sesi Selesai</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Ringkasan Performa Bulan Ini (Synced with Alice Web) */}
            <View style={styles.summarySection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>Performa Bulan Ini</Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {monthStats.hadir < 10
                      ? `0${monthStats.hadir}`
                      : monthStats.hadir}
                  </Text>
                  <Text style={styles.statLabel}>Total Hadir</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: COLORS.warning }]}>
                    {monthStats.terlambat < 10
                      ? `0${monthStats.terlambat}`
                      : monthStats.terlambat}
                  </Text>
                  <Text style={styles.statLabel}>Terlambat</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>
                    {monthStats.score}%
                  </Text>
                  <Text style={styles.statLabel}>Ketepatan</Text>
                </View>
              </View>
            </View>

            {/* Aktivitas Presensi Terkini */}
            <View style={styles.recentSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>Catatan Presensi Terakhir</Text>
              </View>

              {recentLogs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Calendar size={28} color={COLORS.textLight} />
                  <Text style={styles.emptyText}>
                    Belum ada catatan presensi pada bulan ini.
                  </Text>
                </View>
              ) : (
                recentLogs.map((item, idx) => {
                  const isLate =
                    item.menit_terlambat && item.menit_terlambat > 0;
                  const dateFormatted = new Date(
                    item.tanggal
                  ).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  });

                  return (
                    <View key={idx} style={styles.logItem}>
                      <View style={styles.logLeft}>
                        <View style={styles.logDateIcon}>
                          <Calendar size={16} color={COLORS.primary} />
                        </View>
                        <View>
                          <Text style={styles.logDateText}>{dateFormatted}</Text>
                          <Text style={styles.logShiftText}>
                            {item.nama_shift || 'Shift Normal'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.logRight}>
                        <View style={styles.logTimesRow}>
                          <Text style={styles.logTimeIn}>
                            {extractTime(item.jam_masuk)}
                          </Text>
                          <Text style={styles.logTimeSep}>•</Text>
                          <Text style={styles.logTimeOut}>
                            {extractTime(item.jam_keluar)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.logStatusBadge,
                            isLate
                              ? styles.logBadgeLate
                              : styles.logBadgeOnTime,
                          ]}
                        >
                          <Text
                            style={[
                              styles.logStatusText,
                              isLate
                                ? styles.logTextLate
                                : styles.logTextOnTime,
                            ]}
                          >
                            {isLate ? 'Terlambat' : 'Tepat Waktu'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  heroHeader: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 54,
    paddingBottom: 56,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 1.2,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  greetingWrap: {
    marginBottom: 18,
  },
  greetingSub: {
    fontSize: 13,
    color: '#93C5FD',
    fontWeight: '600',
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
    marginBottom: 8,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rolePillText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '700',
  },
  geofenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  geofenceIn: {
    backgroundColor: 'rgba(6, 95, 70, 0.45)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  geofenceChecking: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  geofenceOut: {
    backgroundColor: 'rgba(136, 19, 55, 0.45)',
    borderColor: 'rgba(251, 113, 133, 0.4)',
  },
  geofenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  geofenceTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  geofenceSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  geofenceRefreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bodyContainer: {
    paddingHorizontal: 20,
    marginTop: -32,
  },
  loaderBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  clockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  clockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  digitalClockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  digitalClock: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  wibBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  shiftBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  ctaBtnCheckIn: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnCheckOut: {
    backgroundColor: COLORS.primaryDark,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  ctaBtnTextDisabled: {
    color: COLORS.textLight,
  },
  todayStatusGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  todayStatusBox: {
    flex: 1,
    alignItems: 'center',
  },
  statusVerticalDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  todayStatusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  todayStatusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayStatusTime: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  todayStatusEmpty: {
    color: COLORS.textLight,
  },
  lateTag: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
  },
  doneTag: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primaryDark,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  recentSection: {
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logDateIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDateText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  logShiftText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  logTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logTimeIn: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.success,
    fontVariant: ['tabular-nums'],
  },
  logTimeSep: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  logTimeOut: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  logStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  logBadgeOnTime: {
    backgroundColor: COLORS.successLight,
  },
  logBadgeLate: {
    backgroundColor: COLORS.warningLight,
  },
  logStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  logTextOnTime: {
    color: COLORS.success,
  },
  logTextLate: {
    color: COLORS.warning,
  },
});
