import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  RefreshControl,
} from 'react-native';
import {
  CalendarDays,
  Send,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  Edit,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { authService } from '../../src/services/authService';
import { API_URL } from '../../src/config/api';
import { COLORS } from '../../src/config/theme';

interface LeaveHistoryItem {
  id: string;
  type: string;
  range: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
  alasan: string;
  jumlah_hari: number;
  rejected_by?: string | null;
}

interface PeerEmployee {
  id: string;
  nama_lengkap: string;
  nama_level?: string | null;
  departemen_id?: string | null;
}

const CATEGORY_OPTIONS = [
  { value: 'Tahunan', label: 'Cuti Tahunan' },
  { value: 'Sakit', label: 'Cuti Sakit' },
  { value: 'Melahirkan', label: 'Cuti Melahirkan' },
  { value: 'Izin Penting', label: 'Izin Penting (Kedukaan, Menikah, dll)' },
] as const;

const DAYS_HEADER = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const formatYMD = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function CutiScreen() {
  const [user, setUser] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<number>(0);
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistoryItem[]>([]);
  const [delegationPeers, setDelegationPeers] = useState<PeerEmployee[]>([]);

  const [leaveForm, setLeaveForm] = useState({
    tanggal_kembali: '',
    alasan: '',
    kategori: 'Tahunan',
    delegasi: '',
  });

  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Pickers & Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDelegasiModal, setShowDelegasiModal] = useState(false);
  const [peerSearch, setPeerSearch] = useState('');
  const [showKembaliPicker, setShowKembaliPicker] = useState(false);

  // Reschedule Modal States
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<LeaveHistoryItem | null>(null);
  const [reschedulePeriod, setReschedulePeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rescheduleDates, setRescheduleDates] = useState<Date[]>([]);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const jumlahHari = selectedDates.length;

  const getPeriodDates = (periodStr: string): Date[] => {
    if (!periodStr) return [];
    const [yearStr, monthStr] = periodStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    // Cut-off standar Alice HRIS: 26 bulan lalu s/d 25 bulan terpilih
    const startDate = new Date(year, month - 1, 26);
    const endDate = new Date(year, month, 25);

    const dates: Date[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const periodDates = getPeriodDates(selectedPeriod);
  const reschedulePeriodDates = getPeriodDates(reschedulePeriod);

  const changePeriodMonth = (
    currentPeriod: string,
    offset: number,
    isReschedule = false
  ) => {
    const [y, m] = currentPeriod.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const nextPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
    if (isReschedule) {
      setReschedulePeriod(nextPeriod);
      setRescheduleDates([]);
    } else {
      setSelectedPeriod(nextPeriod);
      setSelectedDates([]);
    }
  };

  const formatPeriodLabel = (periodStr: string): string => {
    if (!periodStr) return '';
    const [y, m] = periodStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const formatCutoffRangeLabel = (periodStr: string): string => {
    const dates = getPeriodDates(periodStr);
    if (dates.length === 0) return '';
    const first = dates[0].toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
    const last = dates[dates.length - 1].toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${first} – ${last}`;
  };

  const toggleDate = (date: Date, isReschedule = false) => {
    if (isReschedule) {
      const exists = rescheduleDates.some((d) => isSameDay(d, date));
      if (exists) {
        setRescheduleDates(rescheduleDates.filter((d) => !isSameDay(d, date)));
      } else {
        if (rescheduleDates.length >= 4) {
          Alert.alert(
            'Batas Maksimal',
            'Maksimal 4 hari cuti dalam satu pengajuan.'
          );
          return;
        }
        setRescheduleDates(
          [...rescheduleDates, date].sort((a, b) => a.getTime() - b.getTime())
        );
      }
      return;
    }

    const isSelected = selectedDates.some((d) => isSameDay(d, date));
    if (isSelected) {
      setSelectedDates(selectedDates.filter((d) => !isSameDay(d, date)));
    } else {
      if (selectedDates.length >= 4) {
        setFeedbackMsg({
          type: 'error',
          text: 'Maksimal 4 hari cuti dalam satu pengajuan.',
        });
        return;
      }
      setSelectedDates(
        [...selectedDates, date].sort((a, b) => a.getTime() - b.getTime())
      );
    }
    setFeedbackMsg(null);
  };

  const mapCutiData = (cutiData: any[]): LeaveHistoryItem[] => {
    if (!Array.isArray(cutiData)) return [];
    return cutiData.map((c: any) => ({
      id: String(c.id),
      type: c.jenis_cuti || 'Cuti Tahunan',
      range: `${new Date(c.tanggal_mulai).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      })} - ${new Date(c.tanggal_selesai).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`,
      tanggal_mulai: c.tanggal_mulai,
      tanggal_selesai: c.tanggal_selesai,
      status: c.status || 'Menunggu',
      alasan: c.alasan || c.keterangan || '-',
      jumlah_hari: c.jumlah_hari || 1,
      rejected_by: c.rejected_by,
    }));
  };

  const loadData = async () => {
    try {
      const userData = await authService.getUser();
      if (!userData) return;
      setUser(userData);
      const kId = userData.karyawan_id || userData.id;
      if (!kId) return;

      // 1. Ambil profil karyawan & daftar rekan delegasi
      const karyawanRes = await fetch(`${API_URL}/karyawan/${kId}`);
      if (karyawanRes.ok) {
        const kData = await karyawanRes.json();
        setLeaveBalance(
          kData.sisa_cuti !== undefined && kData.sisa_cuti !== null
            ? Number(kData.sisa_cuti)
            : 0
        );

        const combinedPeers: PeerEmployee[] = [];
        try {
          if (kData.departemen_id) {
            const peersRes = await fetch(
              `${API_URL}/karyawan?departemen_id=${kData.departemen_id}`
            );
            if (peersRes.ok) {
              const peersJson = await peersRes.json();
              if (Array.isArray(peersJson)) combinedPeers.push(...peersJson);
            }
          }
          const subRes = await fetch(`${API_URL}/karyawan?superior_id=${kId}`);
          if (subRes.ok) {
            const subJson = await subRes.json();
            if (Array.isArray(subJson)) combinedPeers.push(...subJson);
          }
        } catch (peerErr) {
          console.log('Notice load peers:', peerErr);
        }

        const uniquePeers = Array.from(
          new Map(combinedPeers.map((item) => [item.id, item])).values()
        );
        setDelegationPeers(
          uniquePeers.filter((p) => String(p.id) !== String(kId))
        );
      }

      // 2. Ambil riwayat pengajuan cuti
      const cutiRes = await fetch(`${API_URL}/cuti?karyawan_id=${kId}`);
      if (cutiRes.ok) {
        const cutiData = await cutiRes.json();
        setLeaveHistory(mapCutiData(cutiData));
      }
    } catch (err) {
      console.error('Gagal memuat data cuti:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const checkHariH = (tanggal_mulai: string): boolean => {
    const tm = new Date(tanggal_mulai);
    tm.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today <= tm;
  };

  const cleanReason = (raw: string) => {
    if (!raw) return '-';
    return (
      raw
        .replace(/\[DATES:.*?\]/g, '')
        .replace(/\[DELEGASI:.*?\]/g, '')
        .trim() || '-'
    );
  };

  const extractDelegasi = (raw: string): string | null => {
    if (!raw) return null;
    const match = raw.match(/\[DELEGASI:\s*(.*?)\]/);
    return match ? match[1].trim() : null;
  };

  const handleCutiSubmit = async () => {
    setFeedbackMsg(null);

    if (selectedDates.length === 0) {
      setFeedbackMsg({
        type: 'error',
        text: 'Silakan pilih minimal 1 hari cuti pada kalender periodik.',
      });
      return;
    }

    if (jumlahHari > 4) {
      setFeedbackMsg({
        type: 'error',
        text: 'Pengajuan cuti maksimal 4 hari dalam satu pengajuan.',
      });
      return;
    }

    if (leaveForm.kategori === 'Tahunan' && jumlahHari > leaveBalance) {
      setFeedbackMsg({
        type: 'error',
        text: `Sisa cuti tahunan tidak mencukupi (${leaveBalance} hari tersisa).`,
      });
      return;
    }

    if (!leaveForm.alasan.trim()) {
      setFeedbackMsg({
        type: 'error',
        text: 'Silakan tuliskan uraian alasan cuti Anda.',
      });
      return;
    }

    const kId = user?.karyawan_id || user?.id;
    if (!kId) {
      Alert.alert('Sesi Berakhir', 'Silakan login kembali.');
      return;
    }

    setIsSubmitting(true);
    try {
      const sorted = [...selectedDates].sort(
        (a, b) => a.getTime() - b.getTime()
      );
      const earliestDate = sorted[0];
      const latestDate = sorted[sorted.length - 1];
      const dateStrings = sorted.map((d) => formatYMD(d)).join(',');

      let finalAlasan = `[DATES: ${dateStrings}] ${leaveForm.alasan.trim()}`;
      if (leaveForm.delegasi) {
        finalAlasan += `\n[DELEGASI: ${leaveForm.delegasi}]`;
      }

      const payload = {
        karyawan_id: kId,
        jenis_cuti: leaveForm.kategori,
        tanggal_mulai: formatYMD(earliestDate),
        tanggal_selesai: formatYMD(latestDate),
        tanggal_kembali: leaveForm.tanggal_kembali || null,
        jumlah_hari: jumlahHari,
        keterangan: finalAlasan,
      };

      const res = await fetch(`${API_URL}/cuti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengajukan cuti.');
      }

      Alert.alert(
        'Berhasil!',
        'Pengajuan cuti Anda telah berhasil dikirim untuk diverifikasi.'
      );
      setFeedbackMsg({
        type: 'success',
        text: 'Pengajuan cuti berhasil dikirim.',
      });
      setLeaveForm({
        tanggal_kembali: '',
        alasan: '',
        kategori: 'Tahunan',
        delegasi: '',
      });
      setSelectedDates([]);
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan saat mengirim pengajuan.';
      setFeedbackMsg({ type: 'error', text: msg });
      Alert.alert('Gagal', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCuti = (cuti: LeaveHistoryItem) => {
    if (!checkHariH(cuti.tanggal_mulai)) {
      Alert.alert(
        'Gagal',
        'Pembatalan cuti maksimal diajukan sebelum hari pelaksanaan.'
      );
      return;
    }

    Alert.alert(
      'Batalkan Cuti?',
      'Permohonan pembatalan akan dikirimkan kepada atasan Anda untuk disetujui.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              const kId = user?.karyawan_id || user?.id;
              if (!kId) return;

              const response = await fetch(`${API_URL}/cuti/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cuti_id: cuti.id,
                  karyawan_id: kId,
                }),
              });

              const resData = await response.json();
              if (response.ok) {
                Alert.alert(
                  'Berhasil',
                  resData.message || 'Permohonan pembatalan berhasil dikirim.'
                );
                await loadData();
              } else {
                Alert.alert(
                  'Gagal',
                  resData.message || 'Gagal membatalkan cuti.'
                );
              }
            } catch (e: any) {
              Alert.alert('Gagal', e?.message || 'Terjadi kesalahan jaringan.');
            }
          },
        },
      ]
    );
  };

  const openRescheduleModal = (cuti: LeaveHistoryItem) => {
    if (!checkHariH(cuti.tanggal_mulai)) {
      Alert.alert(
        'Gagal',
        'Ganti tanggal hanya dapat dilakukan sebelum hari pelaksanaan.'
      );
      return;
    }

    setRescheduleData(cuti);

    let prevDates: Date[] = [];
    const reasonText = cuti.alasan || '';
    const datesMatch = reasonText.match(/\[DATES:\s*(.*?)\]/);
    if (datesMatch) {
      const datesArr = datesMatch[1].split(',').map((d: string) => d.trim());
      prevDates = datesArr
        .map((d: string) => new Date(`${d}T00:00:00`))
        .filter((d) => !isNaN(d.getTime()));
    } else {
      const startDate = new Date(cuti.tanggal_mulai);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(cuti.tanggal_selesai);
      endDate.setHours(0, 0, 0, 0);
      const cur = new Date(startDate);
      while (cur <= endDate) {
        prevDates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }

    setRescheduleDates(prevDates);
    if (prevDates.length > 0) {
      const firstDate = prevDates[0];
      // Tentukan periode cut-off (jika tgl >= 26 maka masuk periode bulan berikutnya)
      const periodDate = new Date(firstDate);
      if (periodDate.getDate() >= 26) {
        periodDate.setMonth(periodDate.getMonth() + 1);
      }
      setReschedulePeriod(
        `${periodDate.getFullYear()}-${String(
          periodDate.getMonth() + 1
        ).padStart(2, '0')}`
      );
    }

    setRescheduleReason(cleanReason(cuti.alasan));
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleData || rescheduleDates.length === 0) {
      Alert.alert(
        'Tanggal Belum Dipilih',
        'Pilih tanggal cuti pengganti pada kalender periodik.'
      );
      return;
    }

    const kId = user?.karyawan_id || user?.id;
    if (!kId) return;

    setIsRescheduling(true);
    try {
      const sorted = [...rescheduleDates].sort(
        (a, b) => a.getTime() - b.getTime()
      );
      const formatDates = sorted.map((d) => formatYMD(d));
      const delegasiExisting = extractDelegasi(rescheduleData.alasan);

      let newAlasan = `${rescheduleReason.trim()} [DATES: ${formatDates.join(
        ', '
      )}]`;
      if (delegasiExisting) {
        newAlasan += `\n[DELEGASI: ${delegasiExisting}]`;
      }

      const res = await fetch(`${API_URL}/cuti/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuti_id: rescheduleData.id,
          karyawan_id: kId,
          tanggal_mulai: formatDates[0],
          tanggal_selesai: formatDates[formatDates.length - 1],
          tanggal_kembali: null,
          jumlah_hari: sorted.length,
          alasan: newAlasan,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setIsRescheduleModalOpen(false);
        Alert.alert(
          'Berhasil',
          resData.message || 'Jadwal cuti berhasil diubah.'
        );
        await loadData();
      } else {
        Alert.alert('Gagal', resData.message || 'Gagal mengubah jadwal cuti.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const onChangeTanggalKembali = (event: any, selectedDate?: Date) => {
    setShowKembaliPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLeaveForm((prev) => ({
        ...prev,
        tanggal_kembali: formatYMD(selectedDate),
      }));
    }
  };

  const selectedCategoryObj =
    CATEGORY_OPTIONS.find((c) => c.value === leaveForm.kategori) ||
    CATEGORY_OPTIONS[0];

  const filteredPeers = delegationPeers.filter((p) => {
    if (!peerSearch.trim()) return true;
    const q = peerSearch.toLowerCase();
    return (
      p.nama_lengkap?.toLowerCase().includes(q) ||
      p.nama_level?.toLowerCase().includes(q)
    );
  });

  const minKembaliDate =
    selectedDates.length > 0
      ? new Date(
          selectedDates[selectedDates.length - 1].getTime() + 86400000
        )
      : new Date();

  const renderCalendarGrid = (
    dates: Date[],
    chosenDates: Date[],
    onToggle: (d: Date) => void
  ) => {
    const leadingEmptyCount = dates.length > 0 ? dates[0].getDay() : 0;
    const cells: (Date | null)[] = [
      ...Array(leadingEmptyCount).fill(null),
      ...dates,
    ];
    // Pad to complete rows of 7
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }

    const today = new Date();

    return (
      <View>
        {/* Header Hari */}
        <View style={styles.calWeekRow}>
          {DAYS_HEADER.map((day, idx) => (
            <View key={day} style={styles.calDayHeaderCell}>
              <Text
                style={[
                  styles.calDayHeaderText,
                  (idx === 0 || idx === 6) && styles.calWeekendHeaderText,
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Baris Tanggal */}
        {rows.map((row, rIdx) => (
          <View key={`row-${rIdx}`} style={styles.calWeekRow}>
            {row.map((date, cIdx) => {
              if (!date) {
                return <View key={`empty-${rIdx}-${cIdx}`} style={styles.calCellEmpty} />;
              }

              const isSelected = chosenDates.some((d) => isSameDay(d, date));
              const isToday = isSameDay(date, today);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isNewMonthDay = date.getDate() === 1;

              return (
                <TouchableOpacity
                  key={formatYMD(date)}
                  style={[
                    styles.calCell,
                    isWeekend && !isSelected && styles.calCellWeekend,
                    isToday && !isSelected && styles.calCellToday,
                    isSelected && styles.calCellSelected,
                  ]}
                  onPress={() => onToggle(date)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.calCellText,
                      isWeekend && !isSelected && styles.calCellTextWeekend,
                      isToday && !isSelected && styles.calCellTextToday,
                      isSelected && styles.calCellTextSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {(date.getDate() === 26 || isNewMonthDay) && (
                    <Text
                      style={[
                        styles.calMonthMiniTag,
                        isSelected && { color: '#E0F2FE' },
                      ]}
                    >
                      {date.toLocaleDateString('id-ID', { month: 'short' })}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
        />
      }
    >
      {/* Top Hero Header & Sisa Jatah Cuti Tahunan (Synced with My Activity CutiTab) */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub}>MY ACTIVITY • LAYANAN MANDIRI</Text>
            <Text style={styles.headerTitle}>Administrasi Cuti</Text>
          </View>
        </View>

        {/* Hospital Navy Sisa Cuti Summary Card */}
        <View style={styles.balanceHeroCard}>
          <View style={styles.balanceHeroHeader}>
            <View style={styles.balanceIconBox}>
              <CalendarDays size={16} color="#BAE6FD" />
            </View>
            <Text style={styles.balanceHeroTitle}>
              SISA JATAH CUTI TAHUNAN
            </Text>
          </View>

          <View style={styles.balanceValueRow}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.balanceBigNumber}>{leaveBalance}</Text>
            )}
            <Text style={styles.balanceUnitText}>HARI TERSISA</Text>
          </View>

          <Text style={styles.balanceFootnote}>
            Hak cuti tahun berjalan dihitung sesuai SK Kepegawaian RSU Avisena.
            Pengajuan mandiri maksimal 4 hari kerja.
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Formulir Pengajuan Cuti */}
        <View style={styles.formCard}>
          <View style={styles.cardHeaderBlock}>
            <View style={styles.cardHeader}>
              <View style={styles.accentBar} />
              <Text style={styles.cardTitle}>Formulir Pengajuan Cuti</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Pilih tanggal rencana cuti pada kalender periodik cut-off (26 s/d
              25) dengan batas maksimal 4 hari kerja.
            </Text>
          </View>

          {/* Feedback Banner */}
          {feedbackMsg && (
            <View
              style={[
                styles.feedbackBanner,
                feedbackMsg.type === 'error'
                  ? styles.feedbackError
                  : styles.feedbackSuccess,
              ]}
            >
              {feedbackMsg.type === 'error' ? (
                <AlertCircle size={18} color={COLORS.danger} />
              ) : (
                <CheckCircle2 size={18} color={COLORS.success} />
              )}
              <Text
                style={[
                  styles.feedbackText,
                  feedbackMsg.type === 'error'
                    ? { color: '#BE123C' }
                    : { color: '#047857' },
                ]}
              >
                {feedbackMsg.text}
              </Text>
            </View>
          )}

          {/* Dropdown Kategori Cuti */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              KATEGORI CUTI <Text style={{ color: COLORS.danger }}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.selectButtonText}>
                {selectedCategoryObj.label}
              </Text>
              <ChevronDown size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {leaveForm.kategori !== 'Tahunan' ? (
            <View style={styles.specialLeaveBox}>
              <AlertCircle size={38} color={COLORS.textLight} />
              <Text style={styles.specialLeaveTitle}>
                Pengajuan Khusus / Berkas Fisik
              </Text>
              <Text style={styles.specialLeaveDesc}>
                Pengajuan jenis cuti ini memerlukan formulir manual dan lampiran
                surat dokter / berkas resmi ke bagian Kepegawaian.
              </Text>
            </View>
          ) : (
            <>
              {/* Kalender Periodik Cut-Off (26 s/d 25) */}
              <View style={styles.calendarContainer}>
                <View style={styles.calendarTopBar}>
                  <View style={styles.calendarTitleRow}>
                    <CalendarIcon size={15} color={COLORS.primary} />
                    <Text style={styles.calendarSectionLabel}>
                      Kalender Periodik (26 s/d 25)
                    </Text>
                  </View>

                  <View style={styles.monthSelectorPill}>
                    <TouchableOpacity
                      onPress={() => changePeriodMonth(selectedPeriod, -1)}
                      style={styles.monthNavBtn}
                    >
                      <ChevronLeft size={16} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.monthSelectorText}>
                      {formatPeriodLabel(selectedPeriod)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => changePeriodMonth(selectedPeriod, 1)}
                      style={styles.monthNavBtn}
                    >
                      <ChevronRight size={16} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.cutoffRangeSub}>
                  Rentang Periode: {formatCutoffRangeLabel(selectedPeriod)}
                </Text>

                {renderCalendarGrid(periodDates, selectedDates, (d) =>
                  toggleDate(d, false)
                )}
              </View>

              {/* Info Durasi Hari Cuti Terpilih */}
              <View style={styles.durationInfoCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.durationInfoTitle}>
                    DURASI HARI CUTI TERPILIH
                  </Text>
                  <Text style={styles.durationInfoSub}>
                    Batas maksimal permohonan adalah 4 hari kerja.
                  </Text>
                  {selectedDates.length > 0 && (
                    <Text style={styles.selectedDatesPreview}>
                      Tanggal:{' '}
                      {selectedDates
                        .map((d) =>
                          d.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })
                        )
                        .join(', ')}
                    </Text>
                  )}
                </View>
                <View style={styles.durationCountBox}>
                  <Text
                    style={[
                      styles.durationCountNum,
                      jumlahHari > 4 && { color: COLORS.danger },
                    ]}
                  >
                    {jumlahHari}
                  </Text>
                  <Text style={styles.durationCountUnit}>HARI</Text>
                </View>
              </View>

              {/* Tanggal Kembali Bekerja (Opsional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  TANGGAL KEMBALI BEKERJA (OPSIONAL)
                </Text>
                <View style={styles.rowWithClear}>
                  <TouchableOpacity
                    style={[styles.selectButton, { flex: 1 }]}
                    onPress={() => setShowKembaliPicker(true)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        !leaveForm.tanggal_kembali && styles.placeholderText,
                      ]}
                    >
                      {leaveForm.tanggal_kembali
                        ? new Date(
                            `${leaveForm.tanggal_kembali}T00:00:00`
                          ).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Pilih Tanggal Kembali Dinas'}
                    </Text>
                    <CalendarIcon size={16} color={COLORS.primary} />
                  </TouchableOpacity>

                  {!!leaveForm.tanggal_kembali && (
                    <TouchableOpacity
                      style={styles.clearIconBtn}
                      onPress={() =>
                        setLeaveForm({ ...leaveForm, tanggal_kembali: '' })
                      }
                    >
                      <X size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.helperText}>
                  Isi jika terdapat hari libur atau jadwal off sebelum tanggal
                  dinas berikutnya.
                </Text>
                {showKembaliPicker && (
                  <DateTimePicker
                    value={
                      leaveForm.tanggal_kembali
                        ? new Date(`${leaveForm.tanggal_kembali}T00:00:00`)
                        : minKembaliDate
                    }
                    mode="date"
                    display="default"
                    minimumDate={minKembaliDate}
                    onChange={onChangeTanggalKembali}
                  />
                )}
              </View>

              {/* Delegasi Pekerjaan (Opsional) */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Users size={13} color={COLORS.primary} />
                  <Text style={[styles.inputLabel, { marginBottom: 0 }]}>
                    DELEGASI PEKERJAAN (OPSIONAL)
                  </Text>
                </View>
                <View style={[styles.rowWithClear, { marginTop: 6 }]}>
                  <TouchableOpacity
                    style={[styles.selectButton, { flex: 1 }]}
                    onPress={() => {
                      setPeerSearch('');
                      setShowDelegasiModal(true);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        !leaveForm.delegasi && styles.placeholderText,
                      ]}
                      numberOfLines={1}
                    >
                      {leaveForm.delegasi || '-- Pilih Rekan Satu Unit Kerja --'}
                    </Text>
                    <ChevronDown size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>

                  {!!leaveForm.delegasi && (
                    <TouchableOpacity
                      style={styles.clearIconBtn}
                      onPress={() =>
                        setLeaveForm({ ...leaveForm, delegasi: '' })
                      }
                    >
                      <X size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.helperText}>
                  Rekan kerja yang akan mengampu penanganan tugas selama masa
                  cuti Anda.
                </Text>
              </View>

              {/* Uraian Alasan Cuti */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  URAIAN ALASAN CUTI{' '}
                  <Text style={{ color: COLORS.danger }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tuliskan keterangan detail keperluan cuti Anda..."
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

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (isSubmitting ||
                    jumlahHari <= 0 ||
                    jumlahHari > 4 ||
                    (leaveForm.kategori === 'Tahunan' &&
                      jumlahHari > leaveBalance)) &&
                    styles.submitBtnDisabled,
                ]}
                onPress={handleCutiSubmit}
                activeOpacity={0.85}
                disabled={
                  isSubmitting ||
                  jumlahHari <= 0 ||
                  jumlahHari > 4 ||
                  (leaveForm.kategori === 'Tahunan' &&
                    jumlahHari > leaveBalance)
                }
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.submitBtnText}>
                      MEMPROSES PERMOHONAN...
                    </Text>
                  </>
                ) : (
                  <>
                    <Send color="#FFFFFF" size={16} />
                    <Text style={styles.submitBtnText}>
                      AJUKAN PERMOHONAN CUTI
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Riwayat Pengajuan Cuti */}
        <View style={styles.historySection}>
          <View style={styles.cardHeader}>
            <Clock size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Riwayat Pengajuan Cuti</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: 20 }}
            />
          ) : leaveHistory.length === 0 ? (
            <View style={styles.emptyBox}>
              <CalendarDays size={30} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Belum ada riwayat cuti</Text>
            </View>
          ) : (
            leaveHistory.map((item) => {
              const statusStr = item.status || 'Menunggu';
              const isApproved = statusStr === 'Disetujui';
              const isPending = statusStr.includes('Menunggu');
              const delegasiName = extractDelegasi(item.alasan);
              const canModify =
                statusStr !== 'Ditolak' &&
                statusStr !== 'Batal' &&
                statusStr !== 'Menunggu Pembatalan' &&
                checkHariH(item.tanggal_mulai);

              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyType}>{item.type}</Text>
                    <View
                      style={[
                        styles.badge,
                        isApproved
                          ? styles.badgeApproved
                          : isPending
                          ? styles.badgePending
                          : styles.badgeRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isApproved
                            ? styles.badgeTextApproved
                            : isPending
                            ? styles.badgeTextPending
                            : styles.badgeTextRejected,
                        ]}
                      >
                        {statusStr}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyDateRow}>
                    <CalendarIcon size={13} color={COLORS.primary} />
                    <Text style={styles.historyDate}>
                      {item.range} ({item.jumlah_hari} Hari)
                    </Text>
                  </View>

                  <View style={styles.reasonQuoteBox}>
                    <Text style={styles.historyReason}>
                      "{cleanReason(item.alasan)}"
                    </Text>
                    {delegasiName && (
                      <Text style={styles.delegasiTagText}>
                        Delegasi: {delegasiName}
                      </Text>
                    )}
                  </View>

                  {canModify && (
                    <View style={styles.historyActionsRow}>
                      <TouchableOpacity
                        style={styles.btnReschedule}
                        onPress={() => openRescheduleModal(item)}
                        activeOpacity={0.8}
                      >
                        <Edit size={13} color="#B45309" />
                        <Text style={styles.btnRescheduleText}>
                          Ganti Jadwal
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.btnCancel}
                        onPress={() => handleCancelCuti(item)}
                        activeOpacity={0.8}
                      >
                        <XCircle size={13} color="#BE123C" />
                        <Text style={styles.btnCancelText}>Batal</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* Modal Pilih Kategori Cuti */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Kategori Cuti</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {CATEGORY_OPTIONS.map((opt) => {
              const active = leaveForm.kategori === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.modalOptionItem,
                    active && styles.modalOptionItemActive,
                  ]}
                  onPress={() => {
                    setLeaveForm({ ...leaveForm, kategori: opt.value });
                    setSelectedDates([]);
                    setFeedbackMsg(null);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      active && styles.modalOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active && <Check size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Modal Pilih Delegasi Pekerjaan */}
      <Modal
        visible={showDelegasiModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDelegasiModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Delegasi Pekerjaan</Text>
              <TouchableOpacity onPress={() => setShowDelegasiModal(false)}>
                <X size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="Cari nama rekan satu unit kerja..."
              placeholderTextColor={COLORS.textLight}
              value={peerSearch}
              onChangeText={setPeerSearch}
            />

            <ScrollView style={{ maxHeight: 340 }}>
              {filteredPeers.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={styles.emptyText}>
                    Tidak ada rekan satu unit ditemukan
                  </Text>
                </View>
              ) : (
                filteredPeers.map((peer) => {
                  const active = leaveForm.delegasi === peer.nama_lengkap;
                  return (
                    <TouchableOpacity
                      key={peer.id}
                      style={[
                        styles.modalOptionItem,
                        active && styles.modalOptionItemActive,
                      ]}
                      onPress={() => {
                        setLeaveForm({
                          ...leaveForm,
                          delegasi: peer.nama_lengkap,
                        });
                        setShowDelegasiModal(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.modalOptionText,
                            active && styles.modalOptionTextActive,
                          ]}
                        >
                          {peer.nama_lengkap}
                        </Text>
                        {!!peer.nama_level && (
                          <Text style={styles.peerLevelSub}>
                            {peer.nama_level}
                          </Text>
                        )}
                      </View>
                      {active && <Check size={18} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Ganti Jadwal (Reschedule) */}
      <Modal
        visible={isRescheduleModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRescheduleModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Ganti Tanggal Cuti</Text>
                <Text style={styles.modalSub}>
                  Pilih tanggal pengganti pada kalender periodik cut-off (26 s/d
                  25).
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsRescheduleModalOpen(false)}
              >
                <XCircle size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.calendarContainer}>
                <View style={styles.calendarTopBar}>
                  <Text style={styles.calendarSectionLabel}>
                    Kalender Cut-off (26-25)
                  </Text>
                  <View style={styles.monthSelectorPill}>
                    <TouchableOpacity
                      onPress={() =>
                        changePeriodMonth(reschedulePeriod, -1, true)
                      }
                      style={styles.monthNavBtn}
                    >
                      <ChevronLeft size={16} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.monthSelectorText}>
                      {formatPeriodLabel(reschedulePeriod)}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        changePeriodMonth(reschedulePeriod, 1, true)
                      }
                      style={styles.monthNavBtn}
                    >
                      <ChevronRight size={16} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.cutoffRangeSub}>
                  {formatCutoffRangeLabel(reschedulePeriod)}
                </Text>

                {renderCalendarGrid(
                  reschedulePeriodDates,
                  rescheduleDates,
                  (d) => toggleDate(d, true)
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ALASAN PERUBAHAN</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={rescheduleReason}
                  onChangeText={setRescheduleReason}
                  placeholder="Tuliskan alasan perubahan tanggal cuti..."
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (rescheduleDates.length === 0 || isRescheduling) &&
                    styles.submitBtnDisabled,
                ]}
                onPress={handleRescheduleSubmit}
                disabled={rescheduleDates.length === 0 || isRescheduling}
              >
                {isRescheduling ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    SIMPAN PERUBAHAN TANGGAL ({rescheduleDates.length} HARI)
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 42,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  balanceHeroCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  balanceHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  balanceIconBox: {
    padding: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
  },
  balanceHeroTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DBEAFE',
    letterSpacing: 0.8,
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  balanceBigNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  balanceUnitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 0.8,
  },
  balanceFootnote: {
    fontSize: 11,
    color: 'rgba(219, 234, 254, 0.85)',
    marginTop: 10,
    lineHeight: 16,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: 18,
    marginTop: -22,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  cardHeaderBlock: {
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
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
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    fontWeight: '500',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  feedbackError: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  feedbackSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  selectButton: {
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
  selectButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  rowWithClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearIconBtn: {
    width: 42,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 5,
    lineHeight: 15,
  },
  specialLeaveBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  specialLeaveTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  specialLeaveDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  calendarTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  calendarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  monthSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthSelectorText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingHorizontal: 6,
  },
  cutoffRangeSub: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  calWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calDayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calDayHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  calWeekendHeaderText: {
    color: COLORS.danger,
  },
  calCellEmpty: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 2,
  },
  calCell: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 2,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellWeekend: {
    backgroundColor: 'rgba(255, 241, 242, 0.5)',
  },
  calCellToday: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  calCellSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  calCellText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  calCellTextWeekend: {
    color: COLORS.danger,
  },
  calCellTextToday: {
    color: COLORS.primary,
  },
  calCellTextSelected: {
    color: '#FFFFFF',
  },
  calMonthMiniTag: {
    fontSize: 7,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginTop: -1,
  },
  durationInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
    gap: 12,
  },
  durationInfoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  durationInfoSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  selectedDatesPreview: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 4,
  },
  durationCountBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
  },
  durationCountNum: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  durationCountUnit: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
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
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  historySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    gap: 8,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
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
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeApproved: {
    backgroundColor: '#D1FAE5',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeRejected: {
    backgroundColor: '#FFE4E6',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeTextApproved: {
    color: '#065F46',
  },
  badgeTextPending: {
    color: '#92400E',
  },
  badgeTextRejected: {
    color: '#9F1239',
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  reasonQuoteBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyReason: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  delegasiTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  historyActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btnReschedule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  btnRescheduleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  btnCancel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFE4E6',
  },
  btnCancelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#BE123C',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  modalOptionItemActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  peerLevelSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
