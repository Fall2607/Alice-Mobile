import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Coffee,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { authService } from '../../src/services/authService';
import { attendanceService } from '../../src/services/attendanceService';
import { COLORS } from '../../src/config/theme';

export default function JadwalScreen() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [scheduleList, setScheduleList] = useState<any[]>([]);
  const [absensiMap, setAbsensiMap] = useState<Record<string, any>>({});
  const [scheduleCache, setScheduleCache] = useState<
    Record<string, { list: any[]; map: any }>
  >({});

  useFocusEffect(
    useCallback(() => {
      loadData(currentDate);
    }, [currentDate])
  );

  const loadData = async (date: Date) => {
    const year = date.getFullYear();
    const monthNum = date.getMonth() + 1;
    const month = String(monthNum).padStart(2, '0');
    const monthYear = `${year}-${month}`;

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

      const [data, absensiHistory] = await Promise.all([
        attendanceService.getKaryawanSchedule(userId, monthYear),
        attendanceService.getAbsensiHistory(userId, monthNum, year),
      ]);

      const newList = data.schedule || [];
      const newMap: Record<string, any> = {};

      if (Array.isArray(absensiHistory)) {
        absensiHistory.forEach((item: any) => {
          const dateStr = item.tanggal.split('T')[0];
          newMap[dateStr] = item;
        });
      }

      setScheduleList(newList);
      setAbsensiMap(newMap);

      setScheduleCache((prev) => ({
        ...prev,
        [monthYear]: { list: newList, map: newMap },
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
    return date.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  };

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const getDayName = (dayOfWeek: number) => {
    return daysOfWeek[dayOfWeek];
  };

  const formatTimeStr = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      if (isoString.includes('T')) {
        const timePart = isoString.substring(11, 16);
        const [rawH, rawM] = timePart.split(':').map(Number);
        if (!isNaN(rawH) && !isNaN(rawM)) {
          const adjH = String((rawH + 7) % 24).padStart(2, '0');
          const adjM = String(rawM).padStart(2, '0');
          return `${adjH}:${adjM}`;
        }
      }
      if (isoString.includes(':')) {
        return isoString.substring(0, 5);
      }
      return '--:--';
    } catch {
      return '--:--';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Navy */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>MANAJEMEN DINAS</Text>
        <Text style={styles.headerTitle}>Jadwal & Log Kehadiran</Text>

        <View style={styles.monthSelector}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={styles.arrowBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft color={COLORS.primaryDark} size={20} />
          </TouchableOpacity>

          <View style={styles.currentMonthWrap}>
            <Calendar
              color="#FFFFFF"
              size={16}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.currentMonthText}>
              {getMonthName(currentDate)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={styles.arrowBtn}
            activeOpacity={0.7}
          >
            <ChevronRight color={COLORS.primaryDark} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat Jadwal Dinas...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {scheduleList.map((item, index) => {
            const dateObj = new Date(item.date);
            const isToday =
              new Date().toISOString().split('T')[0] === item.date;
            const shiftDetails = item.shift;

            const absensi = absensiMap[item.date];
            const isTerlambat = absensi && absensi.menit_terlambat > 0;

            return (
              <View
                key={index}
                style={[styles.dayCard, isToday && styles.dayCardToday]}
              >
                <View style={styles.mainRow}>
                  {/* Tanggal & Hari */}
                  <View
                    style={[
                      styles.dateCol,
                      isToday && styles.dateColToday,
                    ]}
                  >
                    <Text
                      style={[styles.dayText, isToday && styles.todayText]}
                    >
                      {getDayName(item.dayOfWeek)}
                    </Text>
                    <Text
                      style={[
                        styles.dateNumber,
                        isToday && styles.todayText,
                      ]}
                    >
                      {dateObj.getDate()}
                    </Text>
                  </View>

                  <View
                    style={[styles.divider, isToday && styles.dividerToday]}
                  />

                  {/* Info Shift */}
                  <View style={styles.shiftCol}>
                    {shiftDetails &&
                    !shiftDetails.nama_shift
                      .toLowerCase()
                      .includes('libur') ? (
                      <>
                        <Text style={styles.shiftName}>
                          {shiftDetails.nama_shift}
                        </Text>
                        {shiftDetails.jam_masuk &&
                          shiftDetails.jam_keluar && (
                            <View style={styles.timeRow}>
                              <Clock
                                color={COLORS.primary}
                                size={13}
                                style={{ marginRight: 5 }}
                              />
                              <Text style={styles.timeText}>
                                {shiftDetails.jam_masuk.substring(0, 5)} -{' '}
                                {shiftDetails.jam_keluar.substring(0, 5)} WIB
                              </Text>
                            </View>
                          )}
                      </>
                    ) : (
                      <View style={styles.liburWrap}>
                        <Coffee
                          color={COLORS.textMuted}
                          size={14}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.liburText}>Libur / Off</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Aktual Absensi */}
                {absensi && (
                  <View style={styles.absensiContainer}>
                    <View style={styles.absensiRow}>
                      <View style={styles.absensiCol}>
                        <Text style={styles.absensiTitle}>JAM MASUK</Text>
                        <View
                          style={[
                            styles.absensiPill,
                            isTerlambat
                              ? styles.pillTerlambat
                              : styles.pillTepatWaktu,
                          ]}
                        >
                          {isTerlambat ? (
                            <AlertCircle size={13} color={COLORS.warning} />
                          ) : (
                            <CheckCircle size={13} color={COLORS.success} />
                          )}
                          <Text
                            style={[
                              styles.absensiPillText,
                              isTerlambat
                                ? styles.textAmber
                                : styles.textEmerald,
                            ]}
                          >
                            {formatTimeStr(absensi.jam_masuk)}
                          </Text>
                        </View>
                        {isTerlambat && (
                          <Text style={styles.terlambatText}>
                            Terlambat {absensi.menit_terlambat}m
                          </Text>
                        )}
                      </View>

                      <View style={styles.absensiConnector} />

                      <View style={styles.absensiCol}>
                        <Text style={styles.absensiTitle}>JAM PULANG</Text>
                        <View
                          style={[
                            styles.absensiPill,
                            absensi.jam_keluar
                              ? styles.pillPulang
                              : styles.pillKosong,
                          ]}
                        >
                          {absensi.jam_keluar ? (
                            <CheckCircle size={13} color={COLORS.primary} />
                          ) : (
                            <Clock size={13} color={COLORS.textLight} />
                          )}
                          <Text
                            style={[
                              styles.absensiPillText,
                              absensi.jam_keluar
                                ? styles.textPrimary
                                : styles.textKosong,
                            ]}
                          >
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
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  currentMonthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentMonthText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayCardToday: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateCol: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  dateColToday: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  todayText: {
    color: '#FFFFFF',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
  },
  dividerToday: {
    backgroundColor: '#BAE6FD',
  },
  shiftCol: {
    flex: 1,
    justifyContent: 'center',
  },
  shiftName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  liburWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  liburText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  absensiContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  absensiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 84,
  },
  absensiPillText: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  pillTepatWaktu: {
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  pillPulang: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  pillTerlambat: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  pillKosong: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textKosong: {
    color: COLORS.textLight,
  },
  absensiConnector: {
    width: 28,
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 26,
  },
  terlambatText: {
    fontSize: 10,
    color: COLORS.danger,
    fontWeight: '700',
    marginTop: 4,
  },
  textEmerald: {
    color: COLORS.success,
  },
  textPrimary: {
    color: COLORS.primary,
  },
  textAmber: {
    color: COLORS.warning,
  },
});
