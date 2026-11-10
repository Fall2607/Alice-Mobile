import React, { useState, useEffect } from 'react';
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
  CalendarDays,
  Send,
  Calendar as CalendarIcon,
  Clock,
  Info,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { authService } from '../../src/services/authService';
import { API_URL } from '../../src/config/api';
import { COLORS } from '../../src/config/theme';

const CATEGORIES = [
  { value: 'Tahunan', label: 'Cuti Tahunan' },
  { value: 'Izin Penting', label: 'Izin Penting' },
];

export default function CutiScreen() {
  const [leaveForm, setLeaveForm] = useState({
    tanggal_mulai: '',
    tanggal_selesai: '',
    kategori: 'Tahunan',
    alasan: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sisaCuti, setSisaCuti] = useState<number>(0);
  const [historyCuti, setHistoryCuti] = useState<any[]>([]);

  const [showPickerStart, setShowPickerStart] = useState(false);
  const [showPickerEnd, setShowPickerEnd] = useState(false);
  const [dateStart, setDateStart] = useState(new Date());
  const [dateEnd, setDateEnd] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userData = await authService.getUser();
      if (userData) {
        setUser(userData);
        const kId = userData.karyawan_id || userData.id;

        const profileRes = await fetch(`${API_URL}/karyawan/${kId}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setSisaCuti(profileData.sisa_cuti ?? 0);
        }

        await fetchHistory(kId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async (karyawanId: string) => {
    try {
      const res = await fetch(`${API_URL}/cuti?karyawan_id=${karyawanId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryCuti(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const onChangeStart = (event: any, selectedDate?: Date) => {
    setShowPickerStart(Platform.OS === 'ios');
    if (selectedDate) {
      setDateStart(selectedDate);
      const ymd = selectedDate.toISOString().split('T')[0];
      setLeaveForm((prev) => ({
        ...prev,
        tanggal_mulai: ymd,
        tanggal_selesai:
          prev.tanggal_selesai && prev.tanggal_selesai < ymd
            ? ymd
            : prev.tanggal_selesai,
      }));
    }
  };

  const onChangeEnd = (event: any, selectedDate?: Date) => {
    setShowPickerEnd(Platform.OS === 'ios');
    if (selectedDate) {
      setDateEnd(selectedDate);
      setLeaveForm((prev) => ({
        ...prev,
        tanggal_selesai: selectedDate.toISOString().split('T')[0],
      }));
    }
  };

  const getJumlahHari = (): number => {
    if (!leaveForm.tanggal_mulai || !leaveForm.tanggal_selesai) return 0;
    const s = new Date(leaveForm.tanggal_mulai);
    const e = new Date(leaveForm.tanggal_selesai);
    const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  };

  const jumlahHari = getJumlahHari();

  const handleSubmit = async () => {
    if (
      !leaveForm.tanggal_mulai ||
      !leaveForm.tanggal_selesai ||
      !leaveForm.alasan.trim() ||
      !user
    ) {
      Alert.alert(
        'Data Belum Lengkap',
        'Pilih tanggal mulai, tanggal selesai, serta isi uraian alasan cuti.'
      );
      return;
    }

    if (jumlahHari <= 0) {
      Alert.alert(
        'Tanggal Tidak Valid',
        'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'
      );
      return;
    }

    if (jumlahHari > 4) {
      Alert.alert(
        'Batas Maksimal Cuti',
        'Pengajuan cuti mandiri maksimal 4 hari kerja dalam satu permohonan.'
      );
      return;
    }

    if (leaveForm.kategori === 'Tahunan' && jumlahHari > sisaCuti) {
      Alert.alert(
        'Sisa Cuti Tidak Cukup',
        `Sisa jatah cuti tahunan Anda (${sisaCuti} hari) tidak mencukupi untuk ${jumlahHari} hari.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const kId = user.karyawan_id || user.id;

      // Hitung tanggal kembali (H+1 dari tanggal selesai)
      const endObj = new Date(leaveForm.tanggal_selesai);
      endObj.setDate(endObj.getDate() + 1);
      const tanggalKembali = endObj.toISOString().split('T')[0];

      const payload = {
        karyawan_id: kId,
        jenis_cuti: leaveForm.kategori,
        tanggal_mulai: leaveForm.tanggal_mulai,
        tanggal_selesai: leaveForm.tanggal_selesai,
        tanggal_kembali: tanggalKembali,
        jumlah_hari: jumlahHari,
        keterangan: leaveForm.alasan.trim(),
      };

      const res = await fetch(`${API_URL}/cuti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || 'Gagal mengajukan permohonan cuti.');

      Alert.alert(
        'Permohonan Terkirim',
        'Pengajuan cuti Anda telah dikirim kepada atasan untuk diverifikasi.'
      );
      setLeaveForm({
        tanggal_mulai: '',
        tanggal_selesai: '',
        kategori: 'Tahunan',
        alasan: '',
      });
      loadData();
    } catch (err: any) {
      Alert.alert('Gagal Mengirim', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanReason = (raw: string) => {
    if (!raw) return '-';
    return raw
      .replace(/\[DATES:.*?\]/g, '')
      .replace(/\[DELEGASI:.*?\]/g, '')
      .trim();
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
            <Text style={styles.headerTitle}>Administrasi Cuti</Text>
          </View>
          <View style={styles.balanceBadge}>
            <Text style={styles.balanceNumber}>
              {isLoading ? '-' : sisaCuti}
            </Text>
            <Text style={styles.balanceLabel}>HARI TERSISA</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.cardTitle}>Ajukan Cuti Baru</Text>
          </View>

          {/* Kategori Pills */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>JENIS PERMOHONAN</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const active = leaveForm.kategori === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      active && styles.categoryChipActive,
                    ]}
                    onPress={() =>
                      setLeaveForm({ ...leaveForm, kategori: cat.value })
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        active && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tanggal Mulai & Selesai */}
          <View style={styles.dateGrid}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>TANGGAL MULAI</Text>
              <TouchableOpacity
                onPress={() => setShowPickerStart(true)}
                activeOpacity={0.7}
                style={styles.datePickerBtn}
              >
                <Text
                  style={[
                    styles.datePickerText,
                    !leaveForm.tanggal_mulai && styles.placeholderText,
                  ]}
                >
                  {leaveForm.tanggal_mulai || 'Pilih Tanggal'}
                </Text>
                <CalendarIcon color={COLORS.primary} size={16} />
              </TouchableOpacity>
              {showPickerStart && (
                <DateTimePicker
                  value={dateStart}
                  mode="date"
                  display="default"
                  onChange={onChangeStart}
                />
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>TANGGAL SELESAI</Text>
              <TouchableOpacity
                onPress={() => setShowPickerEnd(true)}
                activeOpacity={0.7}
                style={styles.datePickerBtn}
              >
                <Text
                  style={[
                    styles.datePickerText,
                    !leaveForm.tanggal_selesai && styles.placeholderText,
                  ]}
                >
                  {leaveForm.tanggal_selesai || 'Pilih Tanggal'}
                </Text>
                <CalendarIcon color={COLORS.primary} size={16} />
              </TouchableOpacity>
              {showPickerEnd && (
                <DateTimePicker
                  value={dateEnd}
                  mode="date"
                  display="default"
                  minimumDate={dateStart}
                  onChange={onChangeEnd}
                />
              )}
            </View>
          </View>

          {/* Info Durasi */}
          {jumlahHari > 0 && (
            <View style={styles.durationBanner}>
              <Info size={16} color={COLORS.primary} />
              <Text style={styles.durationText}>
                Total durasi permohonan:{' '}
                <Text style={{ fontWeight: '800' }}>{jumlahHari} Hari</Text>{' '}
                (Maks. 4 hari)
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>URAIAN ALASAN CUTI</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tuliskan keterangan keperluan cuti Anda..."
              placeholderTextColor={COLORS.textLight}
              value={leaveForm.alasan}
              onChangeText={(text) =>
                setLeaveForm({ ...leaveForm, alasan: text })
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
              {isSubmitting ? 'Mengirim Permohonan...' : 'Ajukan Permohonan Cuti'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Riwayat Cuti */}
        <View style={styles.historySection}>
          <View style={styles.cardHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.cardTitle}>Riwayat Pengajuan Cuti</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: 20 }}
            />
          ) : historyCuti.length === 0 ? (
            <View style={styles.emptyBox}>
              <CalendarDays size={28} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Belum ada riwayat cuti</Text>
            </View>
          ) : (
            historyCuti.map((item: any) => {
              const statusStr = item.status || 'Menunggu';
              const isApproved = statusStr === 'Disetujui';
              const isRejected = statusStr.includes('Ditolak');

              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyType}>
                      {item.jenis_cuti || 'Cuti Tahunan'} (
                      {item.jumlah_hari || 1} Hari)
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

                  <Text style={styles.historyDate}>
                    {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    —{' '}
                    {new Date(item.tanggal_selesai).toLocaleDateString(
                      'id-ID',
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }
                    )}
                  </Text>

                  <Text style={styles.historyReason} numberOfLines={2}>
                    {cleanReason(item.alasan || item.keterangan)}
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
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  dateGrid: {
    flexDirection: 'row',
    gap: 12,
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
  historyType: {
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
  historyDate: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  historyReason: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
