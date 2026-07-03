import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Image } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { CalendarDays, CheckCircle2, MoreHorizontal, Bell } from 'lucide-react-native';
import { authService } from '../../src/services/authService';
import { attendanceService } from '../../src/services/attendanceService';

export default function Home() {
  const router = useRouter();
  const { newAbsenType, newAbsenTime, existingMasuk } = useLocalSearchParams();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');

  const [time, setTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  // Jika ada parameter absen baru, langsung lewati loading
  const [loading, setLoading] = useState(!(newAbsenType && newAbsenTime));

  const [todayStatus, setTodayStatus] = useState<{
    jamMasuk: string | null;
    jamKeluar: string | null;
    menitTerlambat: number;
  }>({ 
    jamMasuk: newAbsenType === 'in' ? (newAbsenTime as string) : (existingMasuk as string || null), 
    jamKeluar: newAbsenType === 'out' ? (newAbsenTime as string) : null, 
    menitTerlambat: 0 
  });

  const [todayShift, setTodayShift] = useState<{ masuk: string, keluar: string } | null>(null);

  useEffect(() => {
    // Timer jam digital
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [newAbsenType, newAbsenTime])
  );

  const loadData = async () => {
    try {
      const user = await authService.getUser();
      if (user) {
        setUserName(user.name || user.nama || 'Karyawan');
        setUserRole(user.jabatan || user.role || 'Karyawan');
        setUserId(user.karyawan_id || user.id);
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

      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const year = new Date().getFullYear();
      const monthYear = `${year}-${month}`;

      const [history, scheduleData] = await Promise.all([
        attendanceService.getAbsensiHistory(kId),
        attendanceService.getKaryawanSchedule(kId, monthYear).catch(() => ({ schedule: [] }))
      ]);

      const todayStr = new Date().toISOString().split('T')[0];

      // Set shift info
      const todaySched = scheduleData.schedule?.find((s: any) => s.date === todayStr);
      if (todaySched && todaySched.shift && todaySched.shift.jam_masuk) {
        setTodayShift({
          masuk: todaySched.shift.jam_masuk.substring(0, 5),
          keluar: todaySched.shift.jam_keluar.substring(0, 5)
        });
      }

      // Ambil absensi hari ini jika ada
      const absensiHariIni = history.find((h: any) => {
        const recordDate = new Date(h.tanggal).toISOString().split('T')[0];
        return recordDate === todayStr;
      });

      if (absensiHariIni) {
        setTodayStatus({
          jamMasuk: absensiHariIni.jam_masuk || null,
          jamKeluar: absensiHariIni.jam_keluar || null,
          menitTerlambat: absensiHariIni.menit_terlambat || 0,
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
    await loadData();
    setRefreshing(false);
  };


  const goToCamera = (type: 'in' | 'out') => {
    router.push({ pathname: '/camera', params: { type, existingMasuk: todayStatus.jamMasuk } });
  };

  const formatTime = (date: Date) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const extractTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    // Jika format penuh timestamp (contoh: 2026-07-01T08:00:00.000Z)
    if (timeStr.includes('T')) {
      const dateObj = new Date(timeStr);
      // Koreksi Timezone: PostgreSQL Vercel sering salah paham menganggap WIB sebagai UTC
      // Sehingga kita perlu mengurangi 7 jam (WIB = GMT+7) agar tampilannya sesuai.
      dateObj.setHours(dateObj.getHours() - 7);
      return dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    // Jika format HH:MM:SS
    if (timeStr.includes(':')) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  };



  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.topBackground}>
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.userInfoRow} onPress={() => router.navigate('/profile')} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName ? userName.charAt(0).toUpperCase() : ''}</Text>
            </View>
            <View>
              <Text style={styles.navUserName}>{userName || 'Memuat...'}</Text>
              <Text style={styles.navUserRole}>{userRole || ' '}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellBtn}>
            <Bell color="#0EA5E9" size={24} />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
        </View>

        {/* Center Greeting */}
        <View style={styles.greetingCenterContainer}>
          <Text style={styles.greetingCenterText}>
            Hallo 👋 <Text style={styles.greetingCenterName}>{userName ? userName.split(' ')[0] : 'Karyawan'}</Text>
          </Text>
          <Text style={styles.greetingCenterSub}>Semangat kerja ya!</Text>
        </View>
      </View>

      <View style={styles.bottomContentTray}>
        {loading ? (
          <View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Menyiapkan Data...</Text>
          </View>
        ) : (
          <>
            {/* Main Dashboard Card */}
            <View style={styles.dashboardCard}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.cardTimeText}>{formatTime(time)} <Text style={styles.cardTimeWib}>WIB</Text></Text>
                  {todayShift ? (
                    <Text style={styles.cardDateText}>Jam kerja kamu pukul {todayShift.masuk} - {todayShift.keluar} WIB</Text>
                  ) : (
                    <Text style={styles.cardDateText}>{formatDate(time)}</Text>
                  )}
                </View>
                <TouchableOpacity>
                  <MoreHorizontal color="#94A3B8" size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.actionRowPrimary}>
                <TouchableOpacity
                  style={[styles.btnAction, !todayStatus.jamMasuk ? styles.btnActive : styles.btnInactive]}
                  onPress={() => goToCamera('in')}
                  activeOpacity={0.8}
                  disabled={!!todayStatus.jamMasuk}
                >
                  <Text style={!todayStatus.jamMasuk ? styles.btnTextActive : styles.btnTextInactive}>Masuk</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnAction, todayStatus.jamMasuk && !todayStatus.jamKeluar ? styles.btnActive : styles.btnInactive]}
                  onPress={() => goToCamera('out')}
                  activeOpacity={0.8}
                  disabled={!todayStatus.jamMasuk || !!todayStatus.jamKeluar}
                >
                  <Text style={todayStatus.jamMasuk && !todayStatus.jamKeluar ? styles.btnTextActive : styles.btnTextInactive}>Keluar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Absensi Hari Ini */}
            <View style={styles.statusContainer}>
              <Text style={styles.sectionTitle}>Status Hari Ini</Text>
              <View style={styles.statusRow}>
                {/* Check-In */}
                <View style={[styles.statusBox, todayStatus.jamMasuk ? styles.statusBoxActive : null]}>
                  <Text style={styles.statusLabel}>Check-In</Text>
                  <View style={styles.statusValRow}>
                    {todayStatus.jamMasuk && (
                      <View style={[styles.statusDot, { backgroundColor: todayStatus.menitTerlambat > 0 ? '#D97706' : '#10B981' }]} />
                    )}
                    <Text style={[styles.statusValue, todayStatus.jamMasuk ? styles.statusValueActive : null]}>
                      {extractTime(todayStatus.jamMasuk)}
                    </Text>
                  </View>
                </View>

                {/* Check-Out */}
                <View style={[styles.statusBox, todayStatus.jamKeluar ? styles.statusBoxActive : null]}>
                  <Text style={styles.statusLabel}>Check-Out</Text>
                  <View style={styles.statusValRow}>
                    {todayStatus.jamKeluar && (
                      <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                    )}
                    <Text style={[styles.statusValue, todayStatus.jamKeluar ? styles.statusValueActive : null]}>
                      {extractTime(todayStatus.jamKeluar)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBackground: {
    backgroundColor: '#F0F9FF', // Light blue background block
    paddingHorizontal: 24,
    paddingTop: 45, // Increased to avoid iPhone notch/status bar
    paddingBottom: 80, // Extra space so the tray can overlap nicely
  },
  bottomContentTray: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -40, // The TRAY overlaps the blue background
    paddingHorizontal: 24,
    paddingTop: 24, // The gap/padding above the card!
    paddingBottom: 40,
    minHeight: 500, // ensure it covers the bottom
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  navUserName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  navUserRole: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  bellBtn: {
    padding: 8,
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  greetingCenterContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  greetingCenterText: {
    fontSize: 28,
    color: '#0F172A',
    fontWeight: '500',
  },
  greetingCenterName: {
    fontWeight: '900',
    color: '#0F172A',
  },
  greetingCenterSub: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '500',
  },
  dashboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9', // optional subtle border to help it pop against the white tray
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  cardTimeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  cardTimeWib: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  cardDateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
  actionRowPrimary: {
    flexDirection: 'row',
    gap: 12,
  },
  btnAction: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: '#007AFF', // Blue like mockup
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  btnInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnTextActive: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnTextInactive: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBoxActive: {
    borderColor: '#E2E8F0', // keep simple white look
  },
  statusValRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#94A3B8',
  },
  statusValueActive: {
    color: '#0F172A',
  }
});
