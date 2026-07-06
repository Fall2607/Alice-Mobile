import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, Send, ChevronDown, Calendar as CalendarIcon, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { authService } from '../../src/services/authService';
import { API_URL } from '../../src/config/api';

export default function CutiScreen() {
  const [leaveForm, setLeaveForm] = useState({
    tanggal_mulai: '',
    tanggal_selesai: '',
    kategori: 'Cuti Tahunan',
    alasan: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sisaCuti, setSisaCuti] = useState<number>(0);
  const [historyCuti, setHistoryCuti] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userData = await authService.getUser();
      if (userData) {
        setUser(userData);
        
        // Ambil sisa cuti dari profil API
        const profileRes = await fetch(`${API_URL}/karyawan/${userData.karyawan_id}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setSisaCuti(profileData.sisa_cuti || 0);
        }

        // Ambil riwayat cuti
        await fetchHistory(userData.karyawan_id);
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
        setHistoryCuti(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [showPickerStart, setShowPickerStart] = useState(false);
  const [showPickerEnd, setShowPickerEnd] = useState(false);
  const [dateStart, setDateStart] = useState(new Date());
  const [dateEnd, setDateEnd] = useState(new Date());

  const onChangeStart = (event: any, selectedDate?: Date) => {
    setShowPickerStart(Platform.OS === 'ios');
    if (selectedDate) {
      setDateStart(selectedDate);
      setLeaveForm({ ...leaveForm, tanggal_mulai: selectedDate.toISOString().split('T')[0] });
    }
  };

  const onChangeEnd = (event: any, selectedDate?: Date) => {
    setShowPickerEnd(Platform.OS === 'ios');
    if (selectedDate) {
      setDateEnd(selectedDate);
      setLeaveForm({ ...leaveForm, tanggal_selesai: selectedDate.toISOString().split('T')[0] });
    }
  };

  const handleSubmit = async () => {
    if (!leaveForm.tanggal_mulai || !leaveForm.tanggal_selesai || !leaveForm.alasan || !user) {
      Alert.alert('Gagal', 'Mohon lengkapi semua field formulir.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        karyawan_id: user.karyawan_id,
        tanggal_mulai: leaveForm.tanggal_mulai,
        tanggal_selesai: leaveForm.tanggal_selesai,
        alasan: `${leaveForm.kategori} - ${leaveForm.alasan}`
      };

      const res = await fetch(`${API_URL}/cuti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengajukan cuti.');

      Alert.alert('Sukses', 'Pengajuan cuti berhasil dikirim.');
      setLeaveForm({ ...leaveForm, alasan: '', tanggal_mulai: '', tanggal_selesai: '' });
      
      // Refresh data
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container}>
        <View style={styles.topBackground}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Manajemen Cuti</Text>
              <Text style={styles.headerSubtitle}>Riwayat Pengajuan</Text>
            </View>
            <View style={styles.balanceBox}>
              <Text style={styles.balanceValue}>{isLoading ? '-' : sisaCuti}</Text>
              <Text style={styles.balanceLabel}>Hari</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomContentTray}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <CalendarDays color="#1E293B" size={20} />
              <Text style={styles.formTitle}>Formulir Cuti</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TANGGAL MULAI</Text>
              <TouchableOpacity onPress={() => setShowPickerStart(true)} activeOpacity={0.7} style={styles.datePickerBtn}>
                <Text style={[styles.datePickerText, !leaveForm.tanggal_mulai && styles.placeholderText]}>
                  {leaveForm.tanggal_mulai || 'YYYY-MM-DD'}
                </Text>
                <CalendarIcon color="#94A3B8" size={20} />
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TANGGAL SELESAI</Text>
              <TouchableOpacity onPress={() => setShowPickerEnd(true)} activeOpacity={0.7} style={styles.datePickerBtn}>
                <Text style={[styles.datePickerText, !leaveForm.tanggal_selesai && styles.placeholderText]}>
                  {leaveForm.tanggal_selesai || 'YYYY-MM-DD'}
                </Text>
                <CalendarIcon color="#94A3B8" size={20} />
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>KATEGORI IZIN</Text>
              <View style={styles.selectContainer}>
                <TextInput
                  style={styles.input}
                  value={leaveForm.kategori}
                  editable={false} // dummy select
                />
                <ChevronDown color="#94A3B8" size={20} style={styles.selectIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CATATAN / KETERANGAN</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tuliskan alasan pengajuan cuti..."
                placeholderTextColor="#94A3B8"
                value={leaveForm.alasan}
                onChangeText={(text) => setLeaveForm({ ...leaveForm, alasan: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#FFF" size="small" /> : <Send color="#FFFFFF" size={18} />}
              <Text style={styles.submitBtnText}>{isSubmitting ? 'MEMPROSES...' : 'SUBMIT PERMOHONAN'}</Text>
            </TouchableOpacity>
          </View>

          {/* Riwayat Cuti */}
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Riwayat Anda</Text>
            
            {isLoading ? (
              <ActivityIndicator size="large" color="#0EA5E9" style={{marginTop: 20}} />
            ) : historyCuti.length === 0 ? (
              <Text style={{textAlign: 'center', color: '#94A3B8', marginTop: 20}}>Belum ada riwayat cuti.</Text>
            ) : (
              historyCuti.map((item: any) => {
                const statusStr = item.status || '';
                const isApproved = statusStr === 'Disetujui';
                const isRejected = statusStr === 'Ditolak';
                
                const splitAlasan = item.alasan ? item.alasan.split(" - ") : [];
                const type = splitAlasan.length > 1 ? splitAlasan[0] : "Cuti";
                const reason = splitAlasan.length > 1 ? splitAlasan[1] : item.alasan;

                return (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyDate}>
                        {new Date(item.tanggal_mulai).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })} - {new Date(item.tanggal_selesai).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
                      </Text>
                      <View style={[styles.badgePending, isApproved && styles.badgeApproved, isRejected && {backgroundColor: '#FEF2F2'}]}>
                        <Text style={[styles.badgeTextPending, isApproved && styles.badgeTextApproved, isRejected && {color: '#EF4444'}]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyType}>{type}</Text>
                    <Text style={styles.historyReason} numberOfLines={2}>{reason}</Text>
                    {item.nama_approver && (
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8}}>
                        <Clock size={10} color="#94A3B8" />
                        <Text style={{fontSize: 10, color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase'}}>
                          Diperbarui oleh: {item.nama_approver}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBackground: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 80,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0EA5E9',
    marginTop: 4,
  },
  balanceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0EA5E9',
    lineHeight: 26,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  bottomContentTray: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -40,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: 500,
  },
  formCard: {
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
    borderColor: '#F1F5F9',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  selectContainer: {
    position: 'relative',
  },
  selectIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  submitBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  historyContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeApproved: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTextApproved: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgePending: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTextPending: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  historyType: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  historyReason: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  datePickerBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholderText: {
    color: '#94A3B8',
  },
});
