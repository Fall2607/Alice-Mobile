import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Clock,
  Send,
  Calendar as CalendarIcon,
  Timer,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { authService } from '../../src/services/authService';
import { API_URL } from '../../src/config/api';
import { COLORS } from '../../src/config/theme';

export default function LemburScreen() {
  const [lemburForm, setLemburForm] = useState({
    tanggal_lembur: '',
    jam_mulai: '',
    jam_selesai: '',
    kegiatan: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [lemburHistory, setLemburHistory] = useState<any[]>([]);
  const [totalJamDisetujui, setTotalJamDisetujui] = useState<number>(0);

  const [showPickerDate, setShowPickerDate] = useState(false);
  const [showPickerTimeStart, setShowPickerTimeStart] = useState(false);
  const [showPickerTimeEnd, setShowPickerTimeEnd] = useState(false);
  const [lemburDate, setLemburDate] = useState(new Date());
  const [timeStart, setTimeStart] = useState(new Date());
  const [timeEnd, setTimeEnd] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const calculateHours = (data: any[]) => {
    let totalHours = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    data.forEach((item) => {
      if (item.status === 'Disetujui') {
        const dateObj = new Date(item.tanggal_lembur);
        if (
          dateObj.getMonth() === currentMonth &&
          dateObj.getFullYear() === currentYear
        ) {
          const start = new Date(item.jam_mulai);
          const end = new Date(item.jam_selesai);
          const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          if (diffHours > 0) totalHours += diffHours;
        }
      }
    });
    setTotalJamDisetujui(Math.round(totalHours * 10) / 10);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userData = await authService.getUser();
      if (userData) {
        setUser(userData);
        const kId = userData.karyawan_id || userData.id;
        const res = await fetch(`${API_URL}/lembur?karyawan_id=${kId}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setLemburHistory(list);
          calculateHours(list);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowPickerDate(Platform.OS === 'ios');
    if (selectedDate) {
      setLemburDate(selectedDate);
      setLemburForm((prev) => ({
        ...prev,
        tanggal_lembur: selectedDate.toISOString().split('T')[0],
      }));
    }
  };

  const onChangeTimeStart = (event: any, selectedDate?: Date) => {
    setShowPickerTimeStart(Platform.OS === 'ios');
    if (selectedDate) {
      setTimeStart(selectedDate);
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const m = String(selectedDate.getMinutes()).padStart(2, '0');
      setLemburForm((prev) => ({ ...prev, jam_mulai: `${h}:${m}` }));
    }
  };

  const onChangeTimeEnd = (event: any, selectedDate?: Date) => {
    setShowPickerTimeEnd(Platform.OS === 'ios');
    if (selectedDate) {
      setTimeEnd(selectedDate);
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const m = String(selectedDate.getMinutes()).padStart(2, '0');
      setLemburForm((prev) => ({ ...prev, jam_selesai: `${h}:${m}` }));
    }
  };

  const estimatedHours = useMemo(() => {
    if (!lemburForm.jam_mulai || !lemburForm.jam_selesai) return null;
    const [startH, startM] = lemburForm.jam_mulai.split(':').map(Number);
    const [endH, endM] = lemburForm.jam_selesai.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM))
      return null;
    const diff = endH * 60 + endM - (startH * 60 + startM);
    if (diff <= 0) return null;
    return Math.round((diff / 60) * 10) / 10;
  }, [lemburForm.jam_mulai, lemburForm.jam_selesai]);

  const handleSubmit = async () => {
    if (
      !lemburForm.tanggal_lembur ||
      !lemburForm.jam_mulai ||
      !lemburForm.jam_selesai ||
      !lemburForm.kegiatan.trim() ||
      !user
    ) {
      Alert.alert(
        'Data Belum Lengkap',
        'Lengkapi tanggal, jam mulai, jam selesai, dan uraian kegiatan lembur.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const kId = user.karyawan_id || user.id;
      const startDT = new Date(
        `${lemburForm.tanggal_lembur}T${lemburForm.jam_mulai}:00`
      );
      const endDT = new Date(
        `${lemburForm.tanggal_lembur}T${lemburForm.jam_selesai}:00`
      );

      if (endDT <= startDT) {
        Alert.alert(
          'Waktu Tidak Valid',
          'Jam selesai harus lebih besar dari jam mulai.'
        );
        setIsSubmitting(false);
        return;
      }

      const payload = {
        karyawan_id: kId,
        tanggal_lembur: lemburForm.tanggal_lembur,
        jam_mulai: startDT.toISOString(),
        jam_selesai: endDT.toISOString(),
        kegiatan: lemburForm.kegiatan.trim(),
      };

      const res = await fetch(`${API_URL}/lembur`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || 'Gagal mengajukan permohonan lembur.');

      Alert.alert(
        'Permohonan Terkirim',
        'Catatan tugas lembur berhasil diajukan kepada atasan.'
      );
      setLemburForm({
        tanggal_lembur: '',
        jam_mulai: '',
        jam_selesai: '',
        kegiatan: '',
      });
      loadData();
    } catch (err: any) {
      Alert.alert('Gagal Mengirim', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeIso = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      return new Date(isoString).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header Navy */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerSub}>LAYANAN MANDIRI</Text>
            <Text style={styles.headerTitle}>Tugas Dinas Lembur</Text>
          </View>
          <View style={styles.balanceBadge}>
            <Text style={styles.balanceNumber}>
              {isLoading ? '-' : totalJamDisetujui}
            </Text>
            <Text style={styles.balanceLabel}>JAM DISETUJUI</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.cardTitle}>Catat Lembur Baru</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>TANGGAL LEMBUR</Text>
            <TouchableOpacity
              onPress={() => setShowPickerDate(true)}
              activeOpacity={0.7}
              style={styles.datePickerBtn}
            >
              <Text
                style={[
                  styles.datePickerText,
                  !lemburForm.tanggal_lembur && styles.placeholderText,
                ]}
              >
                {lemburForm.tanggal_lembur || 'Pilih Tanggal Lembur'}
              </Text>
              <CalendarIcon color={COLORS.primary} size={16} />
            </TouchableOpacity>
            {showPickerDate && (
              <DateTimePicker
                value={lemburDate}
                mode="date"
                display="default"
                onChange={onChangeDate}
              />
            )}
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>JAM MULAI (WIB)</Text>
              <TouchableOpacity
                onPress={() => setShowPickerTimeStart(true)}
                activeOpacity={0.7}
                style={styles.datePickerBtn}
              >
                <Text
                  style={[
                    styles.datePickerText,
                    !lemburForm.jam_mulai && styles.placeholderText,
                  ]}
                >
                  {lemburForm.jam_mulai || 'HH:MM'}
                </Text>
                <Clock color={COLORS.primary} size={16} />
              </TouchableOpacity>
              {showPickerTimeStart && (
                <DateTimePicker
                  value={timeStart}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onChangeTimeStart}
                />
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>JAM SELESAI (WIB)</Text>
              <TouchableOpacity
                onPress={() => setShowPickerTimeEnd(true)}
                activeOpacity={0.7}
                style={styles.datePickerBtn}
              >
                <Text
                  style={[
                    styles.datePickerText,
                    !lemburForm.jam_selesai && styles.placeholderText,
                  ]}
                >
                  {lemburForm.jam_selesai || 'HH:MM'}
                </Text>
                <Clock color={COLORS.primary} size={16} />
              </TouchableOpacity>
              {showPickerTimeEnd && (
                <DateTimePicker
                  value={timeEnd}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onChangeTimeEnd}
                />
              )}
            </View>
          </View>

          {estimatedHours !== null && (
            <View style={styles.durationBanner}>
              <Timer size={16} color={COLORS.primary} />
              <Text style={styles.durationText}>
                Estimasi durasi kerja lembur:{' '}
                <Text style={{ fontWeight: '800' }}>{estimatedHours} Jam</Text>
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>URAIAN KEGIATAN PEKERJAAN</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tuliskan rincian pekerjaan lembur yang diselesaikan..."
              placeholderTextColor={COLORS.textLight}
              value={lemburForm.kegiatan}
              onChangeText={(text) =>
                setLemburForm({ ...lemburForm, kegiatan: text })
              }
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Send color="#FFFFFF" size={16} />
            )}
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Mengirim Permohonan...' : 'Ajukan Permohonan Lembur'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Riwayat Lembur */}
        <View style={styles.historySection}>
          <View style={styles.cardHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.cardTitle}>Riwayat Tugas Lembur</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: 20 }}
            />
          ) : lemburHistory.length === 0 ? (
            <View style={styles.emptyBox}>
              <Clock size={28} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Belum ada riwayat lembur</Text>
            </View>
          ) : (
            lemburHistory.map((item, idx) => {
              const statusStr = item.status || 'Pending';
              const isApproved = statusStr === 'Disetujui';
              const isRejected = statusStr === 'Ditolak';

              return (
                <View key={item.id || idx} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>
                      {new Date(item.tanggal_lembur).toLocaleDateString(
                        'id-ID',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        isApproved
                          ? styles.badgeApproved
                          : isRejected
                          ? styles.badgeRejected
                          : styles.badgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isApproved
                            ? styles.badgeTextApproved
                            : isRejected
                            ? styles.badgeTextRejected
                            : styles.badgeTextPending,
                        ]}
                      >
                        {statusStr}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.historyTimeRange}>
                    {formatTimeIso(item.jam_mulai)} -{' '}
                    {formatTimeIso(item.jam_selesai)} WIB
                  </Text>

                  <Text style={styles.historyActivity} numberOfLines={2}>
                    "{item.kegiatan}"
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
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
    paddingBottom: 48,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  balanceBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  balanceNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 0.6,
  },
  body: {
    paddingHorizontal: 20,
    marginTop: -26,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  accentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  datePickerBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.textLight,
    fontWeight: '500',
  },
  durationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  durationText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 90,
    paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  historySection: {
    marginTop: 4,
  },
  emptyBox: {
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
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeApproved: {
    backgroundColor: COLORS.successLight,
  },
  badgePending: {
    backgroundColor: COLORS.warningLight,
  },
  badgeRejected: {
    backgroundColor: COLORS.dangerLight,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeTextApproved: {
    color: COLORS.success,
  },
  badgeTextPending: {
    color: COLORS.warning,
  },
  badgeTextRejected: {
    color: COLORS.danger,
  },
  historyTimeRange: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  historyActivity: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
});
