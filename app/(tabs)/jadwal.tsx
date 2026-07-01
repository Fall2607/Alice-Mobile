import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, Clock, Coffee, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { authService } from '../../src/services/authService';
import { attendanceService } from '../../src/services/attendanceService';

export default function JadwalScreen() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [scheduleList, setScheduleList] = useState<any[]>([]);
  const [absensiMap, setAbsensiMap] = useState<Record<string, any>>({});
  const [scheduleCache, setScheduleCache] = useState<Record<string, { list: any[], map: any }>>({});
  
  useFocusEffect(
    useCallback(() => {
      loadData(currentDate);
    }, [currentDate])
  );

  const loadData = async (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthYear = `${year}-${month}`;

    // Optimistic Load: Gunakan cache jika ada agar instan
    if (scheduleCache[monthYear]) {
      setScheduleList(scheduleCache[monthYear].list);
      setAbsensiMap(scheduleCache[monthYear].map);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const user = await authService.getUser();
      if (!user) return;
      
      const userId = user.karyawan_id || user.id;
      
      // Load schedule & absensi history di background
      const [data, absensiHistory] = await Promise.all([
        attendanceService.getKaryawanSchedule(userId, monthYear),
        attendanceService.getAbsensiHistory(userId)
      ]);
      
      const newList = data.schedule || [];
      const newMap: Record<string, any> = {};
      
      absensiHistory.forEach((item: any) => {
        const dateStr = item.tanggal.split('T')[0];
        newMap[dateStr] = item;
      });
      
      setScheduleList(newList);
      setAbsensiMap(newMap);
      
      // Update Cache
      setScheduleCache(prev => ({
        ...prev,
        [monthYear]: { list: newList, map: newMap }
      }));
    } catch (error) {
      console.log('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const getDayName = (dayOfWeek: number) => {
    return daysOfWeek[dayOfWeek];
  };

  const formatTimeStr = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      // Koreksi Timezone (WIB = GMT+7) karena DB Vercel menyimpan dalam UTC raw
      d.setHours(d.getHours() - 7);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '--:--';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Month Picker */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jadwal Kerja</Text>
        
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
            <ChevronLeft color="#0EA5E9" size={24} />
          </TouchableOpacity>
          
          <View style={styles.currentMonthWrap}>
            <Calendar color="#0F172A" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.currentMonthText}>{getMonthName(currentDate)}</Text>
          </View>
          
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
            <ChevronRight color="#0EA5E9" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.loadingText}>Memuat Jadwal...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          {scheduleList.map((item, index) => {
            const dateObj = new Date(item.date);
            const isToday = new Date().toISOString().split('T')[0] === item.date;
            const shiftDetails = item.shift;
            
            // Cek absensi
            const absensi = absensiMap[item.date];
            const isTerlambat = absensi && absensi.menit_terlambat > 0;
            
            return (
              <View key={index} style={[styles.dayCard, isToday && styles.dayCardToday]}>
                
                {/* Bagian Utama (Tanggal & Shift) */}
                <View style={styles.mainRow}>
                  {/* Tanggal & Hari (Kiri) */}
                  <View style={styles.dateCol}>
                    <Text style={[styles.dayText, isToday && styles.todayText]}>{getDayName(item.dayOfWeek)}</Text>
                    <Text style={[styles.dateNumber, isToday && styles.todayText]}>{dateObj.getDate()}</Text>
                  </View>
                  
                  {/* Divider */}
                  <View style={[styles.divider, isToday && styles.dividerToday]} />
                  
                  {/* Info Shift (Kanan) */}
                  <View style={styles.shiftCol}>
                    {shiftDetails && !shiftDetails.nama_shift.toLowerCase().includes('libur') ? (
                      <>
                        <Text style={styles.shiftName}>{shiftDetails.nama_shift}</Text>
                        {shiftDetails.jam_masuk && shiftDetails.jam_keluar && (
                          <View style={styles.timeRow}>
                            <Clock color="#64748B" size={14} style={{ marginRight: 4 }} />
                            <Text style={styles.timeText}>
                              {shiftDetails.jam_masuk.substring(0,5)} - {shiftDetails.jam_keluar.substring(0,5)}
                            </Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.liburWrap}>
                        <Coffee color="#94A3B8" size={16} style={{ marginRight: 6 }} />
                        <Text style={styles.liburText}>Libur / Off</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Bagian Bawah (Aktual Absensi) */}
                {absensi && (
                  <View style={styles.absensiContainer}>
                    <View style={styles.absensiRow}>
                      
                      {/* Masuk */}
                      <View style={styles.absensiCol}>
                        <Text style={styles.absensiTitle}>Masuk</Text>
                        <View style={[styles.absensiPill, isTerlambat ? styles.pillTerlambat : styles.pillTepatWaktu]}>
                           {isTerlambat ? (
                             <AlertCircle size={14} color="#D97706" />
                           ) : (
                             <CheckCircle size={14} color="#059669" />
                           )}
                           <Text style={[styles.absensiPillText, isTerlambat ? styles.textAmber : styles.textEmerald]}>
                             {formatTimeStr(absensi.jam_masuk)}
                           </Text>
                        </View>
                        {isTerlambat && (
                          <Text style={styles.terlambatText}>Telat {absensi.menit_terlambat}m</Text>
                        )}
                      </View>
                      
                      {/* Line Separator / Connector */}
                      <View style={styles.absensiConnector} />

                      {/* Pulang */}
                      <View style={styles.absensiCol}>
                        <Text style={styles.absensiTitle}>Pulang</Text>
                        <View style={[styles.absensiPill, absensi.jam_keluar ? styles.pillTepatWaktu : styles.pillKosong]}>
                           {absensi.jam_keluar ? (
                             <CheckCircle size={14} color="#059669" />
                           ) : (
                             <Clock size={14} color="#94A3B8" />
                           )}
                           <Text style={[styles.absensiPillText, absensi.jam_keluar ? styles.textEmerald : styles.textKosong]}>
                             {formatTimeStr(absensi.jam_keluar)}
                           </Text>
                        </View>
                      </View>

                    </View>
                  </View>
                )}
                
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 8,
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentMonthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentMonthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayCardToday: {
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateCol: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  todayText: {
    color: '#0284C7',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  dividerToday: {
    backgroundColor: '#BAE6FD',
  },
  shiftCol: {
    flex: 1,
    justifyContent: 'center',
  },
  shiftName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  timeText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  liburWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liburText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  absensiContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  absensiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  absensiCol: {
    flex: 1,
    alignItems: 'center',
  },
  absensiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  absensiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
  },
  absensiPillText: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  pillTepatWaktu: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  pillTerlambat: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  pillKosong: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textKosong: {
    color: '#94A3B8',
  },
  absensiConnector: {
    width: 30,
    height: 1,
    backgroundColor: '#CBD5E1',
    marginTop: 26, 
  },
  terlambatText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 6,
  },
  textEmerald: {
    color: '#059669',
  },
  textAmber: {
    color: '#D97706',
  },
});
