import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, CalendarDays, CheckCircle2 } from 'lucide-react-native';
import { authService } from '../../src/services/authService';
import { attendanceService } from '../../src/services/attendanceService';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  
  const [time, setTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [todayStatus, setTodayStatus] = useState<{
    jamMasuk: string | null;
    jamKeluar: string | null;
  }>({ jamMasuk: null, jamKeluar: null });

  useEffect(() => {
    loadData();
    
    // Timer jam digital
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const user = await authService.getUser();
      if (user) {
        setUserName(user.name || user.nama || 'Karyawan');
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
      const history = await attendanceService.getAbsensiHistory(kId);
      
      // Ambil absensi hari ini jika ada
      const today = new Date().toISOString().split('T')[0];
      const absensiHariIni = history.find((h: any) => {
        // Asumsi format tanggal YYYY-MM-DD
        const recordDate = new Date(h.tanggal).toISOString().split('T')[0];
        return recordDate === today;
      });

      if (absensiHariIni) {
        setTodayStatus({
          jamMasuk: absensiHariIni.jam_masuk || null,
          jamKeluar: absensiHariIni.jam_keluar || null,
        });
      } else {
        setTodayStatus({ jamMasuk: null, jamKeluar: null });
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
    router.push({ pathname: '/camera', params: { type } });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const extractTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    // Jika format penuh timestamp (contoh: 2026-07-01T08:00:00.000Z)
    if (timeStr.includes('T')) {
      const dateObj = new Date(timeStr);
      return dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    // Jika format HH:MM:SS
    if (timeStr.includes(':')) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Profile */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo,</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
      </View>

      {/* Clock Widget */}
      <View style={styles.clockCard}>
        <View style={styles.clockHeader}>
          <CalendarDays color="#0EA5E9" size={20} />
          <Text style={styles.dateText}>{formatDate(time)}</Text>
        </View>
        <Text style={styles.timeText}>{formatTime(time)}</Text>
        <Text style={styles.timezoneText}>WIB</Text>
      </View>

      {/* Status Absensi Hari Ini */}
      <View style={styles.statusContainer}>
        <Text style={styles.sectionTitle}>Status Hari Ini</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusBox, todayStatus.jamMasuk ? styles.statusBoxActive : null]}>
            <View style={styles.statusIconWrap}>
              <CheckCircle2 color={todayStatus.jamMasuk ? "#10B981" : "#94A3B8"} size={24} />
            </View>
            <Text style={styles.statusLabel}>Masuk</Text>
            <Text style={[styles.statusValue, todayStatus.jamMasuk ? styles.statusValueActive : null]}>
              {extractTime(todayStatus.jamMasuk)}
            </Text>
          </View>
          <View style={[styles.statusBox, todayStatus.jamKeluar ? styles.statusBoxActive : null]}>
            <View style={styles.statusIconWrap}>
              <CheckCircle2 color={todayStatus.jamKeluar ? "#F59E0B" : "#94A3B8"} size={24} />
            </View>
            <Text style={styles.statusLabel}>Pulang</Text>
            <Text style={[styles.statusValue, todayStatus.jamKeluar ? styles.statusValueActive : null]}>
              {extractTime(todayStatus.jamKeluar)}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <Text style={styles.sectionTitle}>Menu Absensi</Text>
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.btnIn]} 
          onPress={() => goToCamera('in')}
          activeOpacity={0.8}
        >
          <View style={styles.btnIconWrap}>
            <Camera color="#FFF" size={32} />
          </View>
          <Text style={styles.actionBtnTitle}>Check-In</Text>
          <Text style={styles.actionBtnDesc}>Absen Masuk Kerja</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.btnOut]} 
          onPress={() => goToCamera('out')}
          activeOpacity={0.8}
        >
          <View style={styles.btnIconWrap}>
            <Camera color="#FFF" size={32} />
          </View>
          <Text style={styles.actionBtnTitle}>Check-Out</Text>
          <Text style={styles.actionBtnDesc}>Absen Pulang Kerja</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate 50
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  greeting: {
    fontSize: 16,
    color: '#64748B', // Slate 500
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A', // Slate 900
  },
  logoutBtn: {
    padding: 12,
    backgroundColor: '#FEE2E2', // Red 100
    borderRadius: 16,
  },
  clockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  clockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF', // Sky 50
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  dateText: {
    marginLeft: 8,
    color: '#0284C7', // Sky 600
    fontWeight: '600',
    fontSize: 14,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 2,
  },
  timezoneText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 30,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBoxActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  statusIconWrap: {
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#94A3B8',
  },
  statusValueActive: {
    color: '#0F172A',
  },
  actionContainer: {
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  btnIn: {
    backgroundColor: '#10B981', // Emerald 500
  },
  btnOut: {
    backgroundColor: '#EF4444', // Red 500
  },
  btnIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    borderRadius: 20,
    marginRight: 20,
  },
  actionBtnTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  actionBtnDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  }
});
